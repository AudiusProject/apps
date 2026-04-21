BEGIN;

-- Mirror of api/ddl/migrations/0195_subscriptions_generic_entity.sql — the
-- canonical migration lives in the api/ repo; this copy exists only so that
-- the Python discovery-provider's integration test template DB (bootstrapped
-- by ddl/pg_migrate.sh, which does not know about the api/ repo) picks up
-- the same schema change. Delete this file once the two migration trees are
-- unified.

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS entity_type TEXT NOT NULL DEFAULT 'User';

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS entity_id INTEGER DEFAULT NULL;

UPDATE subscriptions
    SET entity_type = 'User'
    WHERE entity_type IS NULL OR entity_type = '';

CREATE INDEX IF NOT EXISTS subscriptions_entity_type_entity_id_idx
    ON subscriptions (entity_type, entity_id)
    WHERE is_current = true AND is_delete = false;

COMMIT;
