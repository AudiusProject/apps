-- cid_lookup is the main table used to determine which host has a given CID
-- multihash column is used for both multihash and dirMultihash
create table if not exists cid_lookup (
    "multihash" text,
    "host" text
);

create unique index if not exists "idx_multihash" on cid_lookup("multihash", "host");


-- cid_log tracks inserts and deletes on the local Files table
-- so that peers can get recent changes when updating their cid_lookup table.
create table if not exists cid_log (
    multihash text primary key,
    is_deleted boolean default false,
    updated_at timestamp with time zone NOT NULL
);

-- cid_cursor tracks the last timestamp so we can consume only new entries cid_log
-- for a given peer
create table if not exists cid_cursor (
    "host" text primary key,
    "updated_at" timestamp with time zone NOT NULL
);


-- initial backfill
--   todo: this is expensive... we only want to do this one time...

-- insert into cid_log (multihash, updated_at)
--   select "multihash", "createdAt" from "Files"
--   union
--   select "dirMultihash", "createdAt" from "Files" where "dirMultihash" is not null
--   on conflict do nothing;

create index if not exists idx_cid_log_updated_at on cid_log(updated_at);

-- trigger code: creates a cid_log entry when a File is created or deleted
create or replace function handle_cid_change() returns trigger as $$
declare
begin

    case tg_op
    when 'DELETE' then
        update cid_log set is_deleted = true, updated_at = now() where multihash = old.multihash;
        update cid_log set is_deleted = true, updated_at = now() where multihash = old."dirMultihash";
    else
        insert into cid_log (multihash, updated_at) values (new.multihash, new."createdAt")
          on conflict do nothing;
        if new."dirMultihash" is not null then
          insert into cid_log (multihash, updated_at) values (new."dirMultihash", new."createdAt")
            on conflict do nothing;
        end if;
    end case;
    return null;

end;
$$ language plpgsql;

-- trigger trigger
begin;
  drop trigger if exists handle_cid_change on "Files";
  create trigger handle_cid_change
      after insert or delete on "Files"
      for each row execute procedure handle_cid_change();
commit;

