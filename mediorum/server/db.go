package server

import (
	"database/sql"
	"mediorum/crudr"
	"mediorum/ddl"
	"time"

	"golang.org/x/exp/slog"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type Blob struct {
	Key       string    `json:"key" gorm:"primaryKey;not null;default:null"`
	Host      string    `json:"host" gorm:"primaryKey;not null;default:null"`
	CreatedAt time.Time `json:"created_at"`
}

type Upload struct {
	ID string `json:"id"` // base32 file hash

	UserWallet        sql.NullString `json:"user_wallet"`
	Template          JobTemplate    `json:"template"`
	OrigFileName      string         `json:"orig_filename"`
	OrigFileCID       string         `json:"orig_file_cid" gorm:"column:orig_file_cid;index:idx_uploads_orig_file_cid"` //
	SelectedPreview   sql.NullString `json:"selected_preview"`
	FFProbe           *FFProbeResult `json:"probe" gorm:"serializer:json"`
	Error             string         `json:"error,omitempty"`
	ErrorCount        int            `json:"error_count,omitempty"`
	Mirrors           []string       `json:"mirrors" gorm:"serializer:json"`
	TranscodedMirrors []string       `json:"transcoded_mirrors" gorm:"serializer:json"`
	Status            string         `json:"status" gorm:"index"`

	CreatedBy string    `json:"created_by" `
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime:false"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoCreateTime:false"`

	TranscodedBy      string    `json:"transcoded_by"`
	TranscodeProgress float64   `json:"transcode_progress"`
	TranscodedAt      time.Time `json:"transcoded_at"`

	TranscodeResults map[string]string `json:"results" gorm:"serializer:json"`

	// UpldateULID - this is the last ULID that change this thing
}

func dbMustDial(dbPath string) *gorm.DB {
	db, err := gorm.Open(postgres.Open(dbPath), &gorm.Config{
		SkipDefaultTransaction: true,
	})
	if err != nil {
		panic(err)
	}

	sqlDb, _ := db.DB()
	sqlDb.SetMaxOpenConns(50)

	// db = db.Debug()

	return db
}

func dbMigrate(crud *crudr.Crudr) {
	// Migrate the schema
	slog.Info("db: gorm automigrate")
	err := crud.DB.AutoMigrate(&Blob{}, &Upload{})
	if err != nil {
		panic(err)
	}

	// register any models to be managed by crudr
	crud.RegisterModels(&Blob{}, &Upload{})

	sqlDb, _ := crud.DB.DB()

	slog.Info("db: ddl migrate")
	ddl.Migrate(sqlDb)

	slog.Info("db: migrate done")

}
