package server

import (
	"database/sql"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/AudiusProject/audius-protocol/mediorum/cidutil"

	"github.com/labstack/echo/v4"
	"github.com/oklog/ulid/v2"
	"golang.org/x/sync/errgroup"
)

var (
	filesFormFieldName = "files"
)

func (ss *MediorumServer) serveUploadDetail(c echo.Context) error {
	var upload *Upload
	err := ss.crud.DB.First(&upload, "id = ?", c.Param("id")).Error
	if err != nil {
		return echo.NewHTTPError(404, err.Error())
	}
	if upload.Status == JobStatusError {
		return c.JSON(422, upload)
	}
	return c.JSON(200, upload)
}

func (ss *MediorumServer) serveUploadList(c echo.Context) error {
	afterCursor, _ := time.Parse(time.RFC3339Nano, c.QueryParam("after"))
	var uploads []Upload
	err := ss.crud.DB.
		Where("created_at > ?", afterCursor).
		Order(`created_at`).Limit(2000).Find(&uploads).Error
	if err != nil {
		return err
	}
	return c.JSON(200, uploads)
}

type UpdateUploadBody struct {
	PreviewStartSeconds string `json:"previewStartSeconds"`
}

func (ss *MediorumServer) updateUpload(c echo.Context) error {
	if !ss.diskHasSpace() {
		return c.String(http.StatusServiceUnavailable, "disk is too full to accept new uploads")
	}

	var upload *Upload
	err := ss.crud.DB.First(&upload, "id = ?", c.Param("id")).Error
	if err != nil {
		return err
	}

	// Validate signer wallet matches uploader's wallet
	signerWallet, ok := c.Get("signer-wallet").(string)
	if !ok || signerWallet == "" {
		return c.String(http.StatusBadRequest, "error recovering wallet from signature")
	}
	if !upload.UserWallet.Valid {
		return c.String(http.StatusBadRequest, "upload cannot be updated because it does not have an associated user wallet")
	}
	if !strings.EqualFold(signerWallet, upload.UserWallet.String) {
		return c.String(http.StatusUnauthorized, "request signer's wallet does not match uploader's wallet")
	}

	body := new(UpdateUploadBody)
	if err := c.Bind(body); err != nil {
		return c.String(http.StatusBadRequest, err.Error())
	}

	selectedPreview := sql.NullString{Valid: false}
	if body.PreviewStartSeconds != "" {
		previewStartSeconds, err := strconv.ParseFloat(body.PreviewStartSeconds, 64)
		if err != nil {
			return c.String(http.StatusBadRequest, "error parsing previewStartSeconds: "+err.Error())
		}
		selectedPreviewString := fmt.Sprintf("320_preview|%g", previewStartSeconds)
		selectedPreview = sql.NullString{
			Valid:  true,
			String: selectedPreviewString,
		}
	}

	// Update supported editable fields

	// Do not support deleting previews
	if selectedPreview.Valid && selectedPreview != upload.SelectedPreview {
		upload.SelectedPreview = selectedPreview
		upload.UpdatedAt = time.Now().UTC()
		if _, alreadyTranscoded := upload.TranscodeResults[selectedPreview.String]; !alreadyTranscoded {
			// Have not transcoded a preview at this start time yet
			// Set status to trigger retranscode job
			upload.Status = JobStatusRetranscode
		}
		err = ss.crud.Update(upload)
		if err != nil {
			ss.logger.Warn("update upload failed", "err", err)
		}
	}

	return c.JSON(200, upload)
}

func (ss *MediorumServer) postUpload(c echo.Context) error {
	if !ss.diskHasSpace() {
		return c.String(http.StatusServiceUnavailable, "disk is too full to accept new uploads")
	}

	// Parse X-User-Wallet header
	userWalletHeader := c.Request().Header.Get("X-User-Wallet-Addr")
	userWallet := sql.NullString{Valid: false}
	if userWalletHeader != "" {
		userWallet = sql.NullString{
			String: userWalletHeader,
			Valid:  true,
		}
	}

	// Multipart form
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	template := JobTemplate(c.FormValue("template"))
	selectedPreview := sql.NullString{Valid: false}
	previewStart := c.FormValue("previewStartSeconds")

	var placementHosts []string = nil
	if v := c.FormValue("placement_hosts"); v != "" {
		placementHosts = strings.Split(v, ",")
	}

	if previewStart != "" {
		previewStartSeconds, err := strconv.ParseFloat(previewStart, 64)
		if err != nil {
			return c.String(http.StatusBadRequest, "error parsing previewStartSeconds: "+err.Error())
		}
		selectedPreviewString := fmt.Sprintf("320_preview|%g", previewStartSeconds)
		selectedPreview = sql.NullString{
			Valid:  true,
			String: selectedPreviewString,
		}
	}
	files := form.File[filesFormFieldName]
	defer form.RemoveAll()

	// each file:
	// - hash contents
	// - send to server in hashring for processing
	// - some task queue stuff

	uploads := make([]*Upload, len(files))
	wg, _ := errgroup.WithContext(c.Request().Context())
	for idx, formFile := range files {

		idx := idx
		formFile := formFile
		wg.Go(func() error {
			now := time.Now().UTC()
			upload := &Upload{
				ID:               ulid.Make().String(),
				UserWallet:       userWallet,
				Status:           JobStatusNew,
				Template:         template,
				SelectedPreview:  selectedPreview,
				CreatedBy:        ss.Config.Self.Host,
				CreatedAt:        now,
				UpdatedAt:        now,
				OrigFileName:     formFile.Filename,
				TranscodeResults: map[string]string{},
				PlacementHosts:   placementHosts,
			}
			uploads[idx] = upload

			tmpFile, err := copyUploadToTempFile(formFile)
			if err != nil {
				upload.Error = err.Error()
				return err
			}
			defer os.Remove(tmpFile.Name())

			formFileCID, err := cidutil.ComputeFileCID(tmpFile)
			if err != nil {
				upload.Error = err.Error()
				return err
			}

			upload.OrigFileCID = formFileCID

			// ffprobe:
			upload.FFProbe, err = ffprobe(tmpFile.Name())
			if err != nil && upload.Template == JobTemplateAudio {
				// fail audio upload if ffprobe fails
				upload.Error = err.Error()
				return err
			}

			// ffprobe: restore orig filename
			upload.FFProbe.Format.Filename = formFile.Filename

			upload.Mirrors, err = ss.replicateFileParallel(formFileCID, tmpFile.Name(), placementHosts)
			if err != nil {
				upload.Error = err.Error()
				return err
			}

			ss.logger.Info("mirrored", "name", formFile.Filename, "uploadID", upload.ID, "cid", formFileCID, "mirrors", upload.Mirrors)

			if template == JobTemplateImgSquare || template == JobTemplateImgBackdrop {
				upload.TranscodeResults["original.jpg"] = formFileCID
			}

			return ss.crud.Create(upload)
		})
	}

	status := 200
	if err := wg.Wait(); err != nil {
		status = 422
	}

	return c.JSON(status, uploads)
}

func (ss *MediorumServer) analyzeUpload(c echo.Context) error {
	var upload *Upload
	err := ss.crud.DB.First(&upload, "id = ?", c.Param("id")).Error
	if err != nil {
		return err
	}

	if upload.Template == "audio" && upload.Status == JobStatusDone && upload.AudioAnalysisResults == nil {
		upload.UpdatedAt = time.Now().UTC()
		upload.Status = JobStatusAudioAnalysis
		err = ss.crud.Update(upload)
		if err != nil {
			ss.logger.Warn("update upload failed", "err", err)
		}
	}

	return c.JSON(200, upload)
}

func copyUploadToTempFile(file *multipart.FileHeader) (*os.File, error) {
	temp, err := os.CreateTemp("", "mediorumUpload")
	if err != nil {
		return nil, err
	}

	r, err := file.Open()
	if err != nil {
		return nil, err
	}
	defer r.Close()

	_, err = io.Copy(temp, r)
	if err != nil {
		return nil, err
	}
	temp.Sync()
	temp.Seek(0, 0)

	return temp, nil
}
