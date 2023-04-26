package server

import (
	"fmt"
	"mediorum/server/signature"
	"strings"
	"time"

	"github.com/labstack/echo/v4"
	"golang.org/x/exp/slices"
)

func (ss *MediorumServer) getBlobLocation(c echo.Context) error {
	locations := []Blob{}
	ss.crud.DB.Where(Blob{Key: c.Param("cid")}).Find(&locations)
	return c.JSON(200, locations)
}

func (ss *MediorumServer) getBlobProblems(c echo.Context) error {
	problems, err := ss.findProblemBlobs(false)
	if err != nil {
		return err
	}
	return c.JSON(200, problems)
}

func (ss *MediorumServer) getBlobInfo(c echo.Context) error {
	ctx := c.Request().Context()
	key := c.Param("cid")
	attr, err := ss.bucket.Attributes(ctx, key)
	if err != nil {
		return err
	}
	return c.JSON(200, attr)
}

func (ss *MediorumServer) getBlob(c echo.Context) error {
	ctx := c.Request().Context()
	key := c.Param("cid")

	if isLegacyCID(key) {
		ss.logger.Debug("serving legacy cid", "cid", key)
		return ss.serveLegacyCid(c)
	}

	if attrs, err := ss.bucket.Attributes(ctx, key); err == nil && attrs != nil {
		// detect mime type:
		// if this is not the cidstream route, we should block mp3 streaming
		// for now just set a header until we are ready to 401 (after client using cidstream everywhere)
		if !strings.Contains(c.Path(), "cidstream") && strings.HasPrefix(attrs.ContentType, "audio") {
			c.Response().Header().Set("x-would-block", "true")
		}

		blob, err := ss.bucket.NewReader(ctx, key, nil)
		if err != nil {
			return err
		}
		defer blob.Close()
		return c.Stream(200, blob.ContentType(), blob)
	}

	// redirect to it
	var blobs []Blob
	healthyHosts := ss.findHealthyHostNames("2 minutes")
	err := ss.crud.DB.
		Where("key = ? and host in ?", key, healthyHosts).
		Find(&blobs).Error
	if err != nil {
		return err
	}
	for _, blob := range blobs {
		// double tripple check server is up and has blob
		if ss.hostHasBlob(blob.Host, key) {
			dest := replaceHost(*c.Request().URL, blob.Host)
			return c.Redirect(302, dest.String())
		}
	}

	return c.String(404, "blob not found")
}

// checks signature from discovery node for cidstream endpoint + premium content.
// based on: https://github.com/AudiusProject/audius-protocol/blob/main/creator-node/src/middlewares/contentAccess/contentAccessMiddleware.ts
func (s *MediorumServer) requireSignature(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		cid := c.Param("cid")
		sig, err := signature.ParseFromQueryString(c.QueryParam("signature"))
		if err != nil {
			return c.JSON(401, map[string]string{
				"error":  "invalid signature",
				"detail": err.Error(),
			})
		} else {
			// check it was signed by a registered node
			isRegistered := slices.ContainsFunc(s.Config.Signers, func(peer Peer) bool {
				return strings.EqualFold(peer.Wallet, sig.SignerWallet)
			})
			if !isRegistered {
				// return c.JSON(401, map[string]string{
				// 	"error":  "signer not in list of registered nodes",
				// 	"detail": "signed by: " + sig.SignerWallet,
				// })
				// s.logger.Info("sig no match", "signed by", sig.SignerWallet)
				c.Response().Header().Add("x-bad-signer", sig.SignerWallet)
			}

			// check signature not too old
			age := time.Since(time.Unix(sig.Data.Timestamp, 0))
			if age > (time.Hour * 48) {
				return c.JSON(401, map[string]string{
					"error":  "signature too old",
					"detail": age.String(),
				})
			}

			// check it is for this cid
			if sig.Data.Cid != cid {
				return c.JSON(401, map[string]string{
					"error":  "signature contains incorrect CID",
					"detail": fmt.Sprintf("url: %s, signature %s", cid, sig.Data.Cid),
				})
			}

			// OK
			c.Response().Header().Set("x-signature-debug", sig.String())
		}

		return next(c)
	}
}

func (ss *MediorumServer) postBlob(c echo.Context) error {
	form, err := c.MultipartForm()
	if err != nil {
		return err
	}
	files := form.File["files"]
	defer form.RemoveAll()

	for _, upload := range files {

		inp, err := upload.Open()
		if err != nil {
			return err
		}
		defer inp.Close()

		cid, err := computeFileCID(inp)
		if err != nil {
			return err
		}
		if cid != upload.Filename {
			ss.logger.Warn("postBlob CID mismatch", "filename", upload.Filename, "cid", cid)
		}

		err = ss.replicateToMyBucket(cid, inp)
		if err != nil {
			ss.logger.Info("accept ERR", "file", upload.Filename, "err", err)
		}
	}

	return c.JSON(200, "ok")
}
