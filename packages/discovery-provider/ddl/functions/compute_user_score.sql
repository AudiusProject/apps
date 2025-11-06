-- drop existing compute_user_score function if it exists disregarding number of arguments
DO $$
DECLARE r RECORD;
BEGIN FOR r IN
SELECT 'DROP FUNCTION IF EXISTS ' || n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ');' AS stmt
FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'compute_user_score' LOOP EXECUTE r.stmt;
END LOOP;
END $$;
-- shared computation function used in get_user_score(s)
create or replace function compute_user_score(
        play_count bigint,
        follower_count bigint,
        challenge_count bigint,
        chat_block_count bigint,
        following_count bigint,
        is_audius_impersonator boolean,
        distinct_tracks_played bigint,
        karma bigint,
        has_profile_picture boolean
    ) returns bigint as $$
select (play_count / 2) + follower_count - challenge_count - (chat_block_count * 100) + karma + case
        when following_count < 5 then -1
        else 0
    end + case
        when is_audius_impersonator then -1000
        else 0
    end + case
        when distinct_tracks_played <= 3 then -10
        else 0
    end + case
        when not has_profile_picture then -100
        else 0
    end $$ language sql immutable;