package server

import (
	"net/http"
	"time"

	"github.com/AudiusProject/audius-protocol/mediorum/cidutil"

	"github.com/labstack/echo/v4"
)

// triggers audio analysis on an upload if a previous analysis failed or never ran.
// does nothing and returns the analysis results if analysis previously succeeded.
func (ss *MediorumServer) analyzeUpload(c echo.Context) error {
	var upload *Upload
	err := ss.crud.DB.First(&upload, "id = ?", c.Param("id")).Error
	if err != nil {
		return echo.NewHTTPError(404, err.Error())
	}

	if upload.Template == "audio" && upload.Status == JobStatusDone && upload.AudioAnalysisStatus != JobStatusDone {
		upload.AudioAnalyzedAt = time.Now().UTC()
		upload.AudioAnalysisStatus = ""
		upload.AudioAnalysisError = ""
		upload.Status = JobStatusAudioAnalysis
		err = ss.crud.Update(upload)
		if err != nil {
			ss.logger.Warn("update upload failed", "err", err)
			return c.String(500, "failed to trigger audio analysis")
		}
	}

	return c.JSON(200, upload)
}

// triggers audio analysis on a legacy blob if a previous analysis failed or does not exist.
// does nothing and returns the analysis results if analysis previously succeeded.
func (ss *MediorumServer) analyzeLegacyBlob(c echo.Context) error {
	cid := c.Param("cid")
	if !cidutil.IsLegacyCIDStrict(cid) {
		return c.String(http.StatusBadRequest, "must specify a legacy cid")
	}

	var analysis *QmAudioAnalysis
	err := ss.crud.DB.First(&analysis, "cid = ?", cid).Error
	if err != nil {
		preferredHosts, _ := ss.rendezvousAllHosts(cid)
		newAnalysis := &QmAudioAnalysis{
			CID:        cid,
			Mirrors:    preferredHosts[:ss.Config.ReplicationFactor],
			Status:     JobStatusAudioAnalysis,
			AnalyzedAt: time.Now().UTC(),
		}
		err = ss.crud.Create(newAnalysis)
		if err != nil {
			ss.logger.Warn("create legacy audio analysis failed", "err", err)
			return c.String(500, "failed to create new audio analysis")
		}
		return c.JSON(200, newAnalysis)
	}
	if analysis.Status != JobStatusDone {
		if analysis.Error == "blob is not an audio file" {
			return c.String(http.StatusBadRequest, "must specify a cid for an audio file")
		}
		analysis.Status = JobStatusAudioAnalysis
		analysis.AnalyzedAt = time.Now().UTC()
		analysis.Error = ""
		err = ss.crud.Update(analysis)
		if err != nil {
			ss.logger.Warn("update legacy audio analysis failed", "err", err)
			return c.String(500, "failed to trigger audio analysis")
		}
	}
	return c.JSON(200, analysis)
}

func (ss *MediorumServer) serveLegacyBlobAnalysis(c echo.Context) error {
	cid := c.Param("cid")
	if !cidutil.IsLegacyCIDStrict(cid) {
		return c.String(http.StatusBadRequest, "must specify a legacy cid")
	}

	var analysis *QmAudioAnalysis
	err := ss.crud.DB.First(&analysis, "cid = ?", cid).Error
	if err != nil {
		return echo.NewHTTPError(404, err.Error())
	}
	return c.JSON(200, analysis)
}
