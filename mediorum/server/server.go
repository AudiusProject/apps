package server

import (
	"context"
	"crypto/ecdsa"
	"fmt"
	"log"
	"mediorum/cidutil"
	"mediorum/crudr"
	"mediorum/ethcontracts"
	"mediorum/persistence"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	_ "embed"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"gocloud.dev/blob"
	_ "gocloud.dev/blob/fileblob"
	"golang.org/x/exp/slog"
)

type Peer struct {
	Host   string `json:"host"`
	Wallet string `json:"wallet"`
}

type VersionJson struct {
	Version string `json:"version"`
	Service string `json:"service"`
}

func (p Peer) ApiPath(parts ...string) string {
	// todo: remove this method, just use apiPath helper everywhere
	parts = append([]string{p.Host}, parts...)
	return apiPath(parts...)
}

type MediorumConfig struct {
	Env                  string
	Self                 Peer
	Peers                []Peer
	Signers              []Peer
	ReplicationFactor    int
	Dir                  string `default:"/tmp/mediorum"`
	BlobStoreDSN         string `json:"-"`
	MoveFromBlobStoreDSN string `json:"-"`
	PostgresDSN          string `json:"-"`
	LegacyFSRoot         string `json:"-"`
	PrivateKey           string `json:"-"`
	ListenPort           string
	TrustedNotifierID    int
	SPID                 int
	SPOwnerWallet        string
	GitSHA               string
	AudiusDockerCompose  string
	AutoUpgradeEnabled   bool
	WalletIsRegistered   bool
	StoreAll             bool
	VersionJson          VersionJson
	MigrateQmCidIters    int

	// should have a basedir type of thing
	// by default will put db + blobs there

	privateKey *ecdsa.PrivateKey
}

type MediorumServer struct {
	echo            *echo.Echo
	bucket          *blob.Bucket
	logger          *slog.Logger
	crud            *crudr.Crudr
	pgPool          *pgxpool.Pool
	quit            chan os.Signal
	trustedNotifier *ethcontracts.NotifierInfo
	storagePathFree uint64
	storagePathUsed uint64
	storagePathSize uint64

	databaseSize uint64
	dbSizeErr    string

	uploadsCount    int64
	uploadsCountErr string

	attemptedLegacyServes  []string
	successfulLegacyServes []string
	legacyServesMu         sync.RWMutex

	isSeeding bool

	peerHealthsMutex sync.RWMutex
	peerHealths      map[string]*PeerHealth
	unreachablePeers []string
	cachedCidCursors []cidCursor

	StartedAt time.Time
	Config    MediorumConfig
}

type PeerHealth struct {
	LastReachable  time.Time            `json:"lastReachable"`
	LastHealthy    time.Time            `json:"lastHealthy"`
	ReachablePeers map[string]time.Time `json:"reachablePeers"`
}

var (
	apiBasePath = ""
)

const PercentSeededThreshold = 50

func New(config MediorumConfig) (*MediorumServer, error) {
	if env := os.Getenv("MEDIORUM_ENV"); env != "" {
		config.Env = env
	}

	if config.VersionJson == (VersionJson{}) {
		log.Fatal(".version.json is required to be bundled with the mediorum binary")
	}

	// validate host config
	if config.Self.Host == "" {
		log.Fatal("host is required")
	} else if hostUrl, err := url.Parse(config.Self.Host); err != nil {
		log.Fatal("invalid host: ", err)
	} else if config.ListenPort == "" {
		config.ListenPort = hostUrl.Port()
	}

	if config.Dir == "" {
		config.Dir = "/tmp/mediorum"
	}

	if config.BlobStoreDSN == "" {
		config.BlobStoreDSN = "file://" + config.Dir + "/blobs"
	}

	if pk, err := ethcontracts.ParsePrivateKeyHex(config.PrivateKey); err != nil {
		log.Println("invalid private key: ", err)
	} else {
		config.privateKey = pk
	}

	// check that we're registered...
	for _, peer := range config.Peers {
		if strings.EqualFold(config.Self.Wallet, peer.Wallet) && strings.EqualFold(config.Self.Host, peer.Host) {
			config.WalletIsRegistered = true
			break
		}
	}

	// ensure dir
	os.MkdirAll(config.Dir, os.ModePerm)

	// bucket
	bucket, err := persistence.Open(config.BlobStoreDSN)
	if err != nil {
		return nil, err
	}

	logger := slog.With("self", config.Self.Host)

	// bucket to move all files from
	if config.MoveFromBlobStoreDSN != "" {
		if config.MoveFromBlobStoreDSN == config.BlobStoreDSN {
			log.Fatal("AUDIUS_STORAGE_DRIVER_URL_MOVE_FROM cannot be the same as AUDIUS_STORAGE_DRIVER_URL")
		}
		bucketToMoveFrom, err := persistence.Open(config.MoveFromBlobStoreDSN)
		if err != nil {
			log.Fatalf("Failed to open bucket to move from. Ensure AUDIUS_STORAGE_DRIVER_URL and AUDIUS_STORAGE_DRIVER_URL_MOVE_FROM are set (the latter can be empty if not moving data): %v", err)
			return nil, err
		}

		logger.Info(fmt.Sprintf("Moving all files from %s to %s. This may take a few hours...", config.MoveFromBlobStoreDSN, config.BlobStoreDSN))
		err = persistence.MoveAllFiles(bucketToMoveFrom, bucket)
		if err != nil {
			log.Fatalf("Failed to move files. Ensure AUDIUS_STORAGE_DRIVER_URL and AUDIUS_STORAGE_DRIVER_URL_MOVE_FROM are set (the latter can be empty if not moving data): %v", err)
			return nil, err
		}

		logger.Info("Finished moving files between buckets. Please remove AUDIUS_STORAGE_DRIVER_URL_MOVE_FROM from your environment and restart the server.")
	}

	// db
	db := dbMustDial(config.PostgresDSN)

	// pg pool
	// config.PostgresDSN
	pgConfig, _ := pgxpool.ParseConfig(config.PostgresDSN)
	pgPool, err := pgxpool.NewWithConfig(context.Background(), pgConfig)
	if err != nil {
		logger.Error("dial postgres failed", "err", err)
	}

	// crud
	peerHosts := []string{}
	for _, peer := range config.Peers {
		if peer.Host == config.Self.Host {
			continue
		}
		peerHosts = append(peerHosts, peer.Host)
	}
	crud := crudr.New(config.Self.Host, config.privateKey, peerHosts, db)
	dbMigrate(crud, bucket)

	// Read trusted notifier endpoint from chain
	var trustedNotifier ethcontracts.NotifierInfo
	if config.TrustedNotifierID > 0 {
		trustedNotifier, err = ethcontracts.GetNotifierForID(strconv.Itoa(config.TrustedNotifierID), config.Self.Wallet)
		if err == nil {
			logger.Info("got trusted notifier from chain", "endpoint", trustedNotifier.Endpoint, "wallet", trustedNotifier.Wallet)
		} else {
			logger.Error("failed to get trusted notifier from chain, not polling delist statuses", "err", err)
		}
	} else {
		logger.Warn("trusted notifier id not set, not polling delist statuses or serving /contact route")
	}

	// echoServer server
	echoServer := echo.New()
	echoServer.HideBanner = true
	echoServer.Debug = true

	// echoServer is the root server
	// it mostly exists to serve the catch all reverse proxy rule at the end
	// most routes and middleware should be added to the `routes` group
	// mostly don't add CORS middleware here as it will break reverse proxy at the end
	echoServer.Use(middleware.Recover())
	echoServer.Use(middleware.Logger())

	ss := &MediorumServer{
		echo:            echoServer,
		bucket:          bucket,
		crud:            crud,
		pgPool:          pgPool,
		logger:          logger,
		quit:            make(chan os.Signal, 1),
		trustedNotifier: &trustedNotifier,
		isSeeding:       config.Env == "stage" || config.Env == "prod",

		peerHealths: map[string]*PeerHealth{},

		StartedAt: time.Now().UTC(),
		Config:    config,
	}

	// routes holds all of our handled routes
	// and related middleware like CORS
	routes := echoServer.Group(apiBasePath)
	routes.Use(middleware.CORS())

	routes.GET("", func(c echo.Context) error {
		return c.Redirect(http.StatusMovedPermanently, "/health_check")
	})
	routes.GET("/", func(c echo.Context) error {
		return c.Redirect(http.StatusMovedPermanently, "/health_check")
	})

	// public: uploads
	routes.GET("/uploads/:id", ss.getUpload, ss.requireHealthy)
	routes.POST("/uploads/:id", ss.updateUpload, ss.requireHealthy, ss.requireUserSignature)
	routes.POST("/uploads", ss.postUpload, ss.requireHealthy)
	// workaround because reverse proxy catches the browser's preflight OPTIONS request instead of letting our CORS middleware handle it
	routes.OPTIONS("/uploads", func(c echo.Context) error {
		return c.NoContent(http.StatusNoContent)
	})

	routes.HEAD("/ipfs/:cid", ss.getBlob, ss.requireHealthy, ss.ensureNotDelisted)
	routes.GET("/ipfs/:cid", ss.getBlob, ss.requireHealthy, ss.ensureNotDelisted)
	routes.HEAD("/content/:cid", ss.getBlob, ss.requireHealthy, ss.ensureNotDelisted)
	routes.GET("/content/:cid", ss.getBlob, ss.requireHealthy, ss.ensureNotDelisted)
	routes.HEAD("/ipfs/:jobID/:variant", ss.getBlobByJobIDAndVariant, ss.requireHealthy)
	routes.GET("/ipfs/:jobID/:variant", ss.getBlobByJobIDAndVariant, ss.requireHealthy)
	routes.HEAD("/content/:jobID/:variant", ss.getBlobByJobIDAndVariant, ss.requireHealthy)
	routes.GET("/content/:jobID/:variant", ss.getBlobByJobIDAndVariant, ss.requireHealthy)
	routes.HEAD("/tracks/cidstream/:cid", ss.getBlob, ss.requireHealthy, ss.ensureNotDelisted, ss.requireRegisteredSignature)
	routes.GET("/tracks/cidstream/:cid", ss.getBlob, ss.requireHealthy, ss.ensureNotDelisted, ss.requireRegisteredSignature)
	routes.GET("/contact", ss.serveContact)
	routes.GET("/health_check", ss.serveHealthCheck)
	routes.GET("/ip_check", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{
			"data": c.RealIP(), // client/requestor IP
		})
	})

	// TODO: remove deprecated routes
	routes.GET("/deprecated/:cid", ss.getBlobDeprecated, ss.requireHealthy, ss.ensureNotDelisted)
	routes.GET("/deprecated/:jobID/:variant", ss.getBlobByJobIDAndVariantDeprecated, ss.requireHealthy)

	// -------------------
	// internal
	internalApi := routes.Group("/internal")

	internalApi.GET("/cuckoo", ss.serveCuckoo)
	internalApi.GET("/cuckoo/size", ss.serveCuckooSize)
	internalApi.GET("/cuckoo/:cid", ss.serveCuckooLookup, cidutil.UnescapeCidParam)

	// internal: crud
	internalApi.GET("/crud/sweep", ss.serveCrudSweep)
	internalApi.POST("/crud/push", ss.serveCrudPush, middleware.BasicAuth(ss.checkBasicAuth))

	internalApi.GET("/blobs/location/:cid", ss.getBlobLocation, cidutil.UnescapeCidParam)
	internalApi.GET("/blobs/info/:cid", ss.getBlobInfo, cidutil.UnescapeCidParam)

	// TODO: remove
	internalApi.GET("/blobs/:cid/location", ss.getBlobLocation, cidutil.UnescapeCidParam)
	internalApi.GET("/blobs/:cid/info", ss.getBlobInfo, cidutil.UnescapeCidParam)

	// internal: blobs between peers
	internalApi.GET("/blobs/:cid", ss.serveInternalBlobPull, cidutil.UnescapeCidParam, middleware.BasicAuth(ss.checkBasicAuth))
	internalApi.POST("/blobs", ss.postBlob, middleware.BasicAuth(ss.checkBasicAuth))

	// WIP internal: metrics
	internalApi.GET("/metrics", ss.getMetrics)
	internalApi.GET("/metrics/segments", ss.getSegmentLog)

	// Qm CID migration
	internalApi.GET("/qm/unmigrated/count/:multihash", ss.serveCountUnmigrated)
	internalApi.GET("/qm/unmigrated/:multihash", ss.serveUnmigrated)

	return ss, nil

}

func (ss *MediorumServer) MustStart() {

	// start server
	go func() {
		err := ss.echo.Start(":" + ss.Config.ListenPort)
		if err != nil && err != http.ErrServerClosed {
			panic(err)
		}
	}()

	go ss.startTranscoder()

	go ss.startCuckooBuilder()
	go ss.startCuckooFetcher()
	createUploadsCache()
	go ss.buildUploadsCache()

	// for any background task that make authenticated peer requests
	// only start if we have a valid registered wallet
	if ss.Config.WalletIsRegistered {

		go ss.startHealthPoller()

		go ss.startRepairer()

		ss.crud.StartClients()

		go ss.startPollingDelistStatuses()

		go ss.pollForSeedingCompletion()

	} else {
		go func() {
			for range time.Tick(10 * time.Second) {
				ss.logger.Warn("node not fully running yet - please register at https://dashboard.audius.org and restart the server")
			}
		}()
	}

	go ss.monitorDiskAndDbStatus()

	go ss.monitorCidCursors()

	go ss.monitorPeerReachability()

	go ss.startQmCidMigration()

	// signals
	signal.Notify(ss.quit, os.Interrupt, syscall.SIGTERM)
	<-ss.quit
	close(ss.quit)

	ss.Stop()
}

func (ss *MediorumServer) Stop() {
	ss.logger.Debug("stopping")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := ss.echo.Shutdown(ctx); err != nil {
		ss.logger.Error("echo shutdown", "err", err)
	}

	if db, err := ss.crud.DB.DB(); err == nil {
		if err := db.Close(); err != nil {
			ss.logger.Error("db shutdown", "err", err)
		}
	}

	// todo: stop transcode worker + repairer too

	ss.logger.Debug("bye")

}

func (ss *MediorumServer) pollForSeedingCompletion() {
	ticker := time.NewTicker(10 * time.Second)
	for range ticker.C {
		if ss.crud.GetPercentNodesSeeded() > PercentSeededThreshold {
			ss.isSeeding = false
			return
		}
	}
}
