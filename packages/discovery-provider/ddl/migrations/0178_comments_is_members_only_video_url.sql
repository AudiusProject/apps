BEGIN;

-- Mirror of api/ddl/migrations/0193_comments_is_members_only.sql and
-- api/ddl/migrations/0194_add_comments_video_url.sql — the canonical
-- migrations live in the api/ repo. This shim exists so the Python
-- discovery-provider's integration test template DB picks up the same
-- columns; the Comment SQLAlchemy model requires both fields. Delete
-- once the migration trees are unified.

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS is_members_only BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE comments
    ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT NULL;

COMMIT;
