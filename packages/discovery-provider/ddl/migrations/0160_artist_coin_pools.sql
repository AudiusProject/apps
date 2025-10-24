DROP TABLE IF EXISTS artist_coin_pools;
CREATE TABLE IF NOT EXISTS artist_coin_pools (
    address TEXT NOT NULL PRIMARY KEY,
    base_mint TEXT NOT NULL,
    quote_mint TEXT,
    token_decimals INTEGER,
    base_reserve NUMERIC,
    quote_reserve NUMERIC,
    migration_base_threshold NUMERIC,
    migration_quote_threshold NUMERIC,
    protocol_quote_fee NUMERIC,
    partner_quote_fee NUMERIC,
    creator_base_fee NUMERIC,
    creator_quote_fee NUMERIC,
    price DOUBLE PRECISION,
    price_usd DOUBLE PRECISION,
    curve_progress DOUBLE PRECISION,
    is_migrated BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);