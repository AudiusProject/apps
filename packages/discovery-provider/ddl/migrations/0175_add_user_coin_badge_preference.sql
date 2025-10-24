BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS coin_flair_mint TEXT DEFAULT NULL;
COMMENT ON COLUMN users.coin_flair_mint IS 'The mint of the coin which the user has selected as their preferred flair. NULL for auto, empty string for none.';

COMMIT;