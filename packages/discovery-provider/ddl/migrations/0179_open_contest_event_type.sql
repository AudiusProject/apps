begin;

-- Adds the 'open_contest' value to the event_type enum used by the events
-- table. Open contests differ from remix_contest in that entries do not
-- require a remix-parent track; submissions land in api-land's
-- contest_submissions table (see api repo migration 0203). The events
-- row may carry a NULL entity_id for open_contest since there is no
-- parent track to point at — the entity_id column was already nullable
-- when the events table was created.

DO $$ BEGIN
    ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'open_contest';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

commit;
