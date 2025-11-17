-- identical to get_user_score but for a user batch
-- used for updating score in aggregate_user
-- this score is used in shadowbanning
drop function if exists get_user_scores(integer []);
create or replace function get_user_scores(
        target_user_ids integer [] default null::integer []
    ) returns table(
        user_id integer,
        handle_lc text,
        play_count bigint,
        distinct_tracks_played bigint,
        follower_count bigint,
        following_count bigint,
        challenge_count bigint,
        chat_block_count bigint,
        is_audius_impersonator boolean,
        karma bigint,
        score bigint
    ) language sql as $function$ with play_activity as (
        select plays.user_id,
            count(distinct (date_trunc('hour', plays.created_at))) as play_count,
            count(distinct(plays.play_item_id)) as distinct_tracks_played
        from plays
            join users on plays.user_id = users.user_id
        where target_user_ids is null
            or plays.user_id = any(target_user_ids)
        group by plays.user_id
    ),
    fast_challenge_completion as (
        select users.user_id,
            handle_lc,
            users.created_at,
            count(*) as challenge_count,
            array_agg(user_challenges.challenge_id) as challenge_ids
        from users
            left join user_challenges on users.user_id = user_challenges.user_id
        where user_challenges.is_complete
            and user_challenges.completed_at - users.created_at <= interval '3 minutes'
            and user_challenges.challenge_id not in ('m', 'b')
            and (
                target_user_ids is null
                or users.user_id = any(target_user_ids)
            )
        group by users.user_id,
            users.handle_lc,
            users.created_at
    ),
    chat_blocks as (
        select chat_blocked_users.blockee_user_id as user_id,
            count(*) as block_count
        from chat_blocked_users
            join users on chat_blocked_users.blockee_user_id = users.user_id
        where target_user_ids is null
            or chat_blocked_users.blockee_user_id = any(target_user_ids)
        group by chat_blocked_users.blockee_user_id
    ),
    aggregate_scores as (
        select users.user_id,
            users.handle_lc,
            coalesce(play_activity.play_count, 0) as play_count,
            coalesce(play_activity.distinct_tracks_played, 0) as distinct_tracks_played,
            coalesce(aggregate_user.following_count, 0) as following_count,
            coalesce(aggregate_user.follower_count, 0) as follower_count,
            coalesce(fast_challenge_completion.challenge_count, 0) as challenge_count,
            coalesce(chat_blocks.block_count, 0) as chat_block_count,
            (users.profile_picture_sizes is not null) as has_profile_picture,
            case
                when (
                    users.handle_lc ilike '%audius%'
                    or lower(users.name) ilike '%audius%'
                )
                and users.is_verified = false then true
                else false
            end as is_audius_impersonator,
            case
                when (
                    -- give max karma to users with more than 1000 followers
                    -- karma is too slow for users with many followers
                    aggregate_user.follower_count > 1000
                ) then 100
                when (
                    aggregate_user.follower_count = 0
                ) then 0
                else (
                    select LEAST(
                            (sum(fau.follower_count) / 100)::bigint,
                            100
                        )
                    from follows
                        join aggregate_user fau on follows.follower_user_id = fau.user_id
                    where follows.followee_user_id = users.user_id
                        and fau.following_count < 10000 -- ignore users with too many following
                        and follows.is_delete = false
                )
            end as karma
        from users
            left join play_activity on users.user_id = play_activity.user_id
            left join fast_challenge_completion on users.user_id = fast_challenge_completion.user_id
            left join chat_blocks on users.user_id = chat_blocks.user_id
            left join aggregate_user on aggregate_user.user_id = users.user_id
        where users.handle_lc is not null
            and (
                target_user_ids is null
                or users.user_id = any(target_user_ids)
            )
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