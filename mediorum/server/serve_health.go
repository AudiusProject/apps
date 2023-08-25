package server

import (
	"encoding/hex"
	"encoding/json"
	"fmt"
	"mediorum/ethcontracts"
	"mediorum/server/signature"
	"strconv"
	"strings"
	"time"

	"github.com/gowebpki/jcs"
	"github.com/labstack/echo/v4"
)

type cidCursor struct {
	Host      string    `json:"host"`
	UpdatedAt time.Time `json:"updated_at"`
}

type healthCheckResponse struct {
	Data      healthCheckResponseData `json:"data"`
	Signer    string                  `json:"signer"`
	Signature string                  `json:"signature"`
	Timestamp time.Time               `json:"timestamp"`
}
type healthCheckResponseData struct {
	Healthy                 bool                       `json:"healthy"`
	Version                 string                     `json:"version"`
	Service                 string                     `json:"service"` // used by registerWithDelegate()
	IsSeeding               bool                       `json:"isSeeding"`
	BuiltAt                 string                     `json:"builtAt"`
	StartedAt               time.Time                  `json:"startedAt"`
	SPID                    int                        `json:"spID"`
	SPOwnerWallet           string                     `json:"spOwnerWallet"`
	Git                     string                     `json:"git"`
	AudiusDockerCompose     string                     `json:"audiusDockerCompose"`
	StoragePathUsed         uint64                     `json:"storagePathUsed"` // bytes
	StoragePathSize         uint64                     `json:"storagePathSize"` // bytes
	DatabaseSize            uint64                     `json:"databaseSize"`    // bytes
	DbSizeErr               string                     `json:"dbSizeErr"`
	UploadsCount            int64                      `json:"uploadsCount"`
	UploadsCountErr         string                     `json:"uploadsCountErr"`
	AutoUpgradeEnabled      bool                       `json:"autoUpgradeEnabled"`
	TrustedNotifier         *ethcontracts.NotifierInfo `json:"trustedNotifier"`
	Env                     string                     `json:"env"`
	Self                    Peer                       `json:"self"`
	WalletIsRegistered      bool                       `json:"wallet_is_registered"`
	Signers                 []Peer                     `json:"signers"`
	ReplicationFactor       int                        `json:"replicationFactor"`
	Dir                     string                     `json:"dir"`
	BlobStorePrefix         string                     `json:"blobStorePrefix"`
	MoveFromBlobStorePrefix string                     `json:"moveFromBlobStorePrefix"`
	ListenPort              string                     `json:"listenPort"`
	TrustedNotifierID       int                        `json:"trustedNotifierId"`
	CidCursors              []cidCursor                `json:"cidCursors"`
	PeerHealths             map[string]*PeerHealth     `json:"peerHealths"`
	UnreachablePeers        []string                   `json:"unreachablePeers"`
	StoreAll                bool                       `json:"storeAll"`
}

func (ss *MediorumServer) serveHealthCheck(c echo.Context) error {
	healthy := ss.databaseSize > 0 && ss.dbSizeErr == "" && ss.uploadsCountErr == ""

	allowUnregistered, _ := strconv.ParseBool(c.QueryParam("allow_unregistered"))
	if !allowUnregistered && !ss.Config.WalletIsRegistered {
		healthy = false
	}

	// consider unhealthy when seeding only if we're not registered - otherwise we're just waiting to be registered so we can start seeding
	if ss.Config.WalletIsRegistered && ss.isSeeding {
		healthy = false
	}

	blobStorePrefix, _, foundBlobStore := strings.Cut(ss.Config.BlobStoreDSN, "://")
	if !foundBlobStore {
		blobStorePrefix = ""
	}
	blobStoreMoveFromPrefix, _, foundBlobStoreMoveFrom := strings.Cut(ss.Config.MoveFromBlobStoreDSN, "://")
	if !foundBlobStoreMoveFrom {
		blobStoreMoveFromPrefix = ""
	}

	var err error
	// since we're using peerHealth
	ss.peerHealthsMutex.RLock()
	defer ss.peerHealthsMutex.RUnlock()

	data := healthCheckResponseData{
		Healthy:                 healthy,
		Version:                 ss.Config.VersionJson.Version,
		Service:                 ss.Config.VersionJson.Service,
		IsSeeding:               ss.isSeeding,
		BuiltAt:                 vcsBuildTime,
		StartedAt:               ss.StartedAt,
		SPID:                    ss.Config.SPID,
		SPOwnerWallet:           ss.Config.SPOwnerWallet,
		Git:                     ss.Config.GitSHA,
		AudiusDockerCompose:     ss.Config.AudiusDockerCompose,
		StoragePathUsed:         ss.storagePathUsed,
		StoragePathSize:         ss.storagePathSize,
		DatabaseSize:            ss.databaseSize,
		DbSizeErr:               ss.dbSizeErr,
		UploadsCount:            ss.uploadsCount,
		UploadsCountErr:         ss.uploadsCountErr,
		AutoUpgradeEnabled:      ss.Config.AutoUpgradeEnabled,
		TrustedNotifier:         ss.trustedNotifier,
		Dir:                     ss.Config.Dir,
		BlobStorePrefix:         blobStorePrefix,
		MoveFromBlobStorePrefix: blobStoreMoveFromPrefix,
		ListenPort:              ss.Config.ListenPort,
		ReplicationFactor:       ss.Config.ReplicationFactor,
		Env:                     ss.Config.Env,
		Self:                    ss.Config.Self,
		WalletIsRegistered:      ss.Config.WalletIsRegistered,
		TrustedNotifierID:       ss.Config.TrustedNotifierID,
		CidCursors:              ss.cachedCidCursors,
		PeerHealths:             ss.peerHealths,
		UnreachablePeers:        ss.unreachablePeers,
		Signers:                 ss.Config.Signers,
		StoreAll:                ss.Config.StoreAll,
	}

	dataBytes, err := json.Marshal(data)
	if err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to marshal health check data: " + err.Error()})
	}
	dataBytesSorted, err := jcs.Transform(dataBytes)
	if err != nil {
		return c.JSON(500, map[string]string{"error": "Failed to sort health check data: " + err.Error()})
	}
	signatureHex := "private key not set (should only happen on local dev)!"
	if ss.Config.privateKey != nil {
		signature, err := signature.SignBytes(dataBytesSorted, ss.Config.privateKey)
		if err != nil {
			return c.JSON(500, map[string]string{"error": "Failed to sign health check response: " + err.Error()})
		}
		signatureHex = fmt.Sprintf("0x%s", hex.EncodeToString(signature))
	}

	status := 200
	if !healthy {
		if !allowUnregistered && !ss.Config.WalletIsRegistered {
			status = 506
		} else {
			status = 503
		}
	}

	return c.JSON(status, healthCheckResponse{
		Data:      data,
		Signer:    ss.Config.Self.Wallet,
		Signature: signatureHex,
		Timestamp: time.Now(),
	})
}

func (ss *MediorumServer) requireHealthy(next echo.HandlerFunc) echo.HandlerFunc {
	return func(c echo.Context) error {
		allowUnhealthy, _ := strconv.ParseBool(c.QueryParam("allow_unhealthy"))
		if allowUnhealthy {
			return next(c)
		}

		if !ss.Config.WalletIsRegistered {
			return c.JSON(506, "wallet not registered")
		}
		dbHealthy := ss.databaseSize > 0 && ss.dbSizeErr == "" && ss.uploadsCountErr == ""
		if !dbHealthy {
			return c.JSON(503, "database not healthy")
		}
		if ss.isSeeding {
			return c.JSON(503, "seeding")
		}

		return next(c)
	}
}
