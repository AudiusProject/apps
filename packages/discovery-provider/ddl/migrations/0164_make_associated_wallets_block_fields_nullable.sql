begin;

-- Drop foreign key constraints if they exist
alter table associated_wallets
    drop constraint if exists associated_wallets_blocknumber_fkey;

alter table associated_wallets
    drop constraint if exists associated_wallets_blockhash_fkey;

-- Make the fields nullable
alter table associated_wallets
    alter column blockhash drop not null;

alter table associated_wallets
    alter column blocknumber drop not null;

commit;

