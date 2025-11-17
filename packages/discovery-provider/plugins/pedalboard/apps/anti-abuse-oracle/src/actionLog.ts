import 'dotenv/config'

import postgres from 'postgres'
import fetch from 'cross-fetch'
import { useEmailDeliverable, useFingerprintDeviceCount } from './identity'

export const sql = postgres(process.env.audius_db_url || '')

const MIN_SCORE = -100
const MAX_SCORE = 300

type TipRow = {
  sender: UserDetails
  receiver: UserDetails
  amount: number
  timestamp: Date
}

export async function recentTips() {
  const tips = await sql<TipRow[]>`
    select
      (
        ${sql.unsafe(buildUserDetails)}
        where user_id = sender_user_id
      ) as sender,
      (
        ${sql.unsafe(buildUserDetails)}
        where user_id = receiver_user_id
      ) as receiver,
      amount,
      created_at as "timestamp"
    from user_tips
    order by slot desc limit 1000;`
  return tips
}

//
// User Details
//
export type UserDetails = {
  id: number
  handle: string
  wallet: string
  name: string
  img: string
  isVerified: boolean

  amount?: number
}

const buildUserDetails = `
select json_build_object(
  'id', user_id,
  'handle', handle,
  'wallet', wallet,
  'name', name,
  'isVerified', is_verified,
  'img', profile_picture_sizes
) as user
from users
`

export async function getUser(handle: string) {
  const rows = await sql`
  ${sql.unsafe(buildUserDetails)}
  where
    handle_lc = ${handle.toLowerCase()}
  LIMIT 1
  `
  if (!rows.length) return
  return rows[0].user as UserDetails
}

export async function queryUsers({ ids }: { ids: number[] }) {
  const rows = await sql`
  ${sql.unsafe(buildUserDetails)}
  where
    user_id in ${sql(ids)}
  `
  return rows.map((r) => r.user) as UserDetails[]
}

export async function getRecentUsers(page: number) {
  const rows = await sql`
  ${sql.unsafe(buildUserDetails)}
  where handle_lc is not null
  order by created_at desc
  LIMIT 10 OFFSET ${page * 10}
  `
  if (!rows.length) return
  return rows.map((row) => row.user as UserDetails)
}

export type ClaimDetails = {
  disbursement_date: string
  user_id: number
  handle: string
  wallet: string
  sign_up_date: Date
  challenge_id: string
  amount: number
}
export async function getRecentClaims(page: number) {
  const rows = await sql`
    select challenge_disbursements.created_at as disbursement_date, handle_lc as handle, users.wallet as wallet, users.user_id, users.created_at as sign_up_date, challenge_disbursements.challenge_id, ROUND(CAST(challenge_disbursements.amount AS numeric) / 100000000, 0) as amount
    from challenge_disbursements
    join users on users.user_id = challenge_disbursements.user_id
    order by challenge_disbursements.created_at desc 
    limit 10 offset ${page * 10}
  `
  if (!rows.length) return
  return rows.map((row) => row as ClaimDetails)
}

export async function getUserScore(userId: number) {
  const rows = await sql`
  select
    track_count > 0 as "hasTracks",
    playlist_count > 0 as "hasPlaylists",
    track_save_count > 1 as "saveCount",
    repost_count > 1 as "repostCount",
    following_count > 6 as "followingCount",
    (select count(*) > 0 from plays where user_id = ${userId}) as "hasPlays"
  from aggregate_user
  where user_id = ${userId}
  `
  if (!rows.length) return
  return rows[0]
}

export async function getUserNormalizedScore(userId: number, wallet: string) {
  const rows = await sql`
    SELECT 
      user_scores.handle_lc,
      users.created_at as timestamp,
      user_scores.*,
      anti_abuse_blocked_users.is_blocked 
    FROM get_user_score(${userId}) as user_scores
    LEFT JOIN users on users.user_id = user_scores.user_id
    LEFT JOIN anti_abuse_blocked_users ON anti_abuse_blocked_users.handle_lc = user_scores.handle_lc

  `
  const {
    handle_lc,
    timestamp,
    play_count,
    follower_count,
    challenge_count,
    following_count,
    chat_block_count,
    is_audius_impersonator,
    has_profile_picture,
    score: shadowban_score,
    is_blocked
  } = rows[0]

  // Convert values to numbers
  const shadowbanScore = Number(shadowban_score)

  const numberOfUserWithFingerprint = (await useFingerprintDeviceCount(userId))!
  let overallScore = shadowbanScore - numberOfUserWithFingerprint

  const isEmailDeliverable = await useEmailDeliverable(wallet)
  if (!isEmailDeliverable) {
    overallScore -= 1000
  }

  // override score
  if (is_blocked === true) {
    overallScore = -100000
  } else if (is_blocked === false) {
    overallScore = 100000
  }

  const normalizedScore = Math.min(
    (overallScore - MIN_SCORE) / (MAX_SCORE - MIN_SCORE),
    1
  )
  return {
    handleLowerCase: handle_lc,
    timestamp,
    playCount: play_count,
    followerCount: follower_count,
    challengeCount: challenge_count,
    followingCount: following_count,
    chatBlockCount: chat_block_count,
    fingerprintCount: numberOfUserWithFingerprint,
    isAudiusImpersonator: is_audius_impersonator,
    hasProfilePicture: has_profile_picture,
    isEmailDeliverable,
    isBlocked: is_blocked,
    shadowbanScore,
    overallScore,
    normalizedScore
  }
}

export async function getAAOAttestation(handle: string) {
  const url = `https://antiabuseoracle.audius.co/abuse/${handle}`
  try {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Error fetching attestation: ${response.statusText}`)
    }
    const data = await response.json()
    const flagged = data.some(
      (item: { trigger: boolean; action: string; rule: number }) =>
        item.trigger === true &&
        item.action === 'fail' &&
        item.rule in [0, 0, 1, 2, 2, 3, 4, 8, 10, 11, 12, 13, 16, 18]
    )
    return flagged
  } catch (error) {
    console.error('Error fetching AAO attestation:', error, handle)
  }
}
//
// TrackDetails
//
export type TrackDetails = {
  id: string
  title: string
  img: string
}

const buildTrackDetails = `
select json_build_object(
  'id', track_id,
  'title', title,
  'img', cover_art_sizes,
  'artist_handle', handle,
  'artist_name', name
)
from tracks
join users on owner_id = user_id
`

//
// PlaylistDetails
//
export type PlaylistDetails = {
  id: number
  title: string
  img: string
}

const buildPlaylistDetails = `
select json_build_object(
  'id', playlist_id,
  'title', playlist_name,
  'img', playlist_image_sizes_multihash
)
from playlists
`

//
// ActionRow
//
export type ActionRow = {
  timestamp: Date
  verb: string
  target: string
  details: Record<string, string | number | boolean>
}

export async function actionLogForUser(userId: number) {
  const limit = 100
  return await sql<ActionRow[]>`

with separate_actions as (

-- follow user
  (
    select
      created_at as "timestamp",
      'follow' as "verb",
      'user' as "target",
      (
        ${sql.unsafe(buildUserDetails)}
        where users.user_id = follows.followee_user_id
      ) as "details"
    from
      follows
    where follower_user_id = ${userId}
      and is_delete = false
    order by created_at desc
    limit ${limit}
  )

-- user sign up
union all
  (
    select
      created_at,
      'sign up',
      'user',
      json_build_object(
      )
    from
      users
    where user_id = ${userId}
    order by created_at desc
    limit ${limit}
  )

-- repost track
union all

  (
    select
      created_at,
      'repost',
      'track',
      (
        ${sql.unsafe(buildTrackDetails)}
        where track_id = repost_item_id
      )
    from
      reposts
    where user_id = ${userId}
      and repost_type = 'track'
      and is_delete = false
    order by created_at desc
    limit ${limit}
  )

-- repost playlist
union all

  (
    select
      created_at,
      'repost',
      'playlist',
      (
        ${sql.unsafe(buildPlaylistDetails)}
        where playlist_id = repost_item_id
      )
    from
      reposts
    where user_id = ${userId}
      and repost_type = 'playlist'
      and is_delete = false
    order by created_at desc
    limit ${limit}
  )

-- save track
union all

  (
    select
      created_at,
      'save',
      'track',
      (
        ${sql.unsafe(buildTrackDetails)}
        where track_id = save_item_id
      )
    from
      saves
    where user_id = ${userId}
      and save_type = 'track'
      and is_delete = false
    order by created_at desc
    limit ${limit}
  )

-- save playlist
union all

  (
    select
      created_at,
      'save',
      'playlist',
      (
        ${sql.unsafe(buildPlaylistDetails)}
        where playlist_id = save_item_id
      )
    from
      saves
    where user_id = ${userId}
      and save_type = 'playlist'
      and is_delete = false
    order by created_at desc
    limit ${limit}
  )

-- create track
-- create playlist

-- tip
union all
  (
    select
      created_at,
      'tip',
      'user',
      (
        select json_build_object(
          'id', user_id,
          'handle', handle,
          'name', name,
          'img', profile_picture_sizes,
          'amount', amount
        )
        from users
        where user_id = receiver_user_id
      )
    from user_tips
    where sender_user_id = ${userId}
    order by created_at desc
    limit ${limit}
  )

-- listens
union all
  (
    select
      created_at,
      'listen',
      'track',
      (
        ${sql.unsafe(buildTrackDetails)}
        where track_id = play_item_id
      )
    from plays
    where user_id = ${userId}
    order by created_at desc
    limit ${limit}
  )

-- challenge
union all
  (
    select
      completed_at as created_at,
      'completed challenge',
      challenge_id,
      json_build_object(
          'amount', amount
        )
    from user_challenges
    where user_id = ${userId}
    and is_complete
    order by completed_at desc
    limit ${limit}
  )

-- challenge_disbursements
union all
  (
    select
      created_at,
      'disbursed challenge',
      challenge_id,
      json_build_object(
          'amount', amount
        )
    from challenge_disbursements
    where user_id = ${userId}
    order by created_At desc
    limit ${limit}
  )

)

select * from separate_actions order by timestamp desc;
`
}
