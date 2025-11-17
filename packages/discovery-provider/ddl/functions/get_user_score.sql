-- identical to get_user_scores but for a single user
-- used to generate a user score for attestations and in UI tool
drop function if exists get_user_score(integer);
create or replace function get_user_score(target_user_id integer) returns table(
        -- order matters
        user_id integer,
        handle_lc text,
        play_count bigint,
        distinct_tracks_played bigint,
        challenge_count bigint,
        following_count bigint,
        follower_count bigint,
        chat_block_count bigint,
        is_audius_impersonator boolean,
        karma bigint,
        score bigint
    ) language sql as $function$ with play_activity as (
        select p.user_id,
            count(distinct date_trunc('day', p.created_at)) as play_count,
            count(distinct p.play_item_id) as distinct_tracks_played
        from plays p
        where p.user_id = target_user_id
        group by p.user_id
    ),
    fast_challenge_completion as (
        select u.user_id,
            u.handle_lc,
            u.created_at,
            count(*) as challenge_count,
            array_agg(uc.challenge_id) as challenge_ids
        from users u
            left join user_challenges uc on u.user_id = uc.user_id
        where u.user_id = target_user_id
            and uc.is_complete
            and uc.completed_at - u.created_at <= interval '3 minutes'
            and uc.challenge_id not in ('m', 'b')
        group by u.user_id,
            u.handle_lc,
            u.created_at
    ),
    chat_blocks as (
        select c.blockee_user_id as user_id,
            count(*) as block_count
        from chat_blocked_users c
        where c.blockee_user_id = target_user_id
        group by c.blockee_user_id
    ),
    aggregate_scores as (
        select u.user_id,
            u.handle_lc,
            coalesce(p.play_count, 0) as play_count,
            coalesce(p.distinct_tracks_played, 0) as distinct_tracks_played,
            coalesce(c.challenge_count, 0) as challenge_count,
            coalesce(au.following_count, 0) as following_count,
            coalesce(au.follower_count, 0) as follower_count,
            coalesce(cb.block_count, 0) as chat_block_count,
            (u.profile_picture_sizes is not null) as has_profile_picture,
            case
                when (
                    u.handle_lc ilike '%audius%'
                    or lower(u.name) ilike '%audius%'
                )
                and u.is_verified = false then true
                else false
            end as is_audius_impersonator,
            case
                when (
                    -- give max karma to users with more than 1000 followers
                    -- karma is too slow for users with many followers
                    au.follower_count > 1000
                ) then 100
                when (
                    au.follower_count = 0
                ) then 0
                else (
                    select LEAST(
                            (sum(fau.follower_count) / 100)::bigint,
                            100
                        )
                    from follows
                        join aggregate_user fau on follows.follower_user_id = fau.user_id
                    where follows.followee_user_id = target_user_id
                        and fau.following_count < 10000 -- ignore users with too many following
                        and follows.is_delete = false
                )
            end as karma
        from users u
            left join play_activity p on u.user_id = p.user_id
            left join fast_challenge_completion c on u.user_id = c.user_id
            left join chat_blocks cb on u.user_id = cb.user_id
            left join aggregate_user au on u.user_id = au.user_id
        where u.user_id = target_user_id
            and u.handle_lc is not null
    )
select a.*,
    compute_user_score(
        a.play_count,
        a.follower_count,
        a.challenge_count,
        a.chat_block_count,
        a.following_count,
        a.is_audius_impersonator,
        a.distinct_tracks_played,
        a.karma,
        a.has_profile_picture
    ) as score
from aggregate_scores a;
$function$;