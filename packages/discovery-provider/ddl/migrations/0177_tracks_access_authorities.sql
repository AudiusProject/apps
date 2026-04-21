BEGIN;

-- Mirror of api/ddl/migrations/0190_access_authorities_tracks.sql — the
-- canonical migration lives in the api/ repo, but the Python discovery-
-- provider's integration test template DB uses its own ddl/pg_migrate.sh
-- which only reads from this directory. This shim exists so the Python
-- indexer tests can seed Track rows through the SQLAlchemy model (which
-- declares `access_authorities`). Delete once the migration trees are
-- unified.

ALTER TABLE tracks
    ADD COLUMN IF NOT EXISTS access_authorities TEXT[] DEFAULT NULL;

COMMIT;
