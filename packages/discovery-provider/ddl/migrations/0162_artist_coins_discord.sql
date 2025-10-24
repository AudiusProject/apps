DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'artist_coins'
            AND column_name = 'has_discord'
            AND table_schema = 'public'
    ) THEN
        ALTER TABLE artist_coins ADD COLUMN has_discord BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
END
$$;
