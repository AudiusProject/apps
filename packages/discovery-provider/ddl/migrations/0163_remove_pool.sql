begin;

alter table artist_coins
    drop column if exists dbc_pool;

commit;


