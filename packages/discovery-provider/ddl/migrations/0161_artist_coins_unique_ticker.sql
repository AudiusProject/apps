DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'artist_coins_ticker_unique'
            AND conrelid = 'artist_coins'::regclass
    ) THEN
        ALTER TABLE artist_coins ADD CONSTRAINT artist_coins_ticker_unique UNIQUE (ticker);
    END IF;
END
$$;
