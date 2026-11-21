import {
  AggregatePlayRow,
  AggregateTrackRow,
  AggregateUserRow,
  FollowRow,
  PlaylistRow,
  RepostRow,
  SaveRow,
  TrackRow,
  UserRow,
} from './types/db'
import { Client } from 'pg'
import { logger } from './logger'

export const LISTEN_TABLES = [
  'aggregate_plays',
  'aggregate_user',
  'aggregate_track',
  'follows',
  'playlists',
  'reposts',
  'saves',
  'tracks',
  'users',
]

export class PendingUpdates {
  userIds: Set<number> = new Set()
  trackIds: Set<number> = new Set()
  playlistIds: Set<number> = new Set()

  reposts: Array<RepostRow> = []
  saves: Array<SaveRow> = []
  follows: Array<FollowRow> = []

  isEmpty(): boolean {
    return (
      this.reposts.length +
        this.saves.length +
        this.follows.length +
        this.userIds.size +
        this.trackIds.size +
        this.playlistIds.size ==
      0
    )
  }
}

let pending = new PendingUpdates()

export function takePending() {
  if (pending.isEmpty()) return
  const p = pending
  pending = new PendingUpdates()
  return p
}

export async function startListener() {
  const connectionString = process.env.audius_db_url
  const client = new Client({ connectionString, application_name: 'es-listen' })
  await client.connect()
  const tables = LISTEN_TABLES
  const sql = tables.map((t) => `LISTEN ${t}; `).join(' ')

  const handlers = {
    aggregate_user: (row: AggregateUserRow) => {
      pending.userIds.add(row.user_id)
    },
    aggregate_plays: (row: AggregatePlayRow) => {
      if (!row.play_item_id) return
      pending.trackIds.add(row.play_item_id)
    },
    aggregate_track: (row: AggregateTrackRow) => {
      if (!row.track_id) return
      pending.trackIds.add(row.track_id)
    },
    saves: (save: SaveRow) => {
      pending.saves.push(save)
      if (save.save_type == 'track') {
        pending.trackIds.add(save.save_item_id)
      } else {
        pending.playlistIds.add(save.save_item_id)
      }
    },
    reposts: (repost: RepostRow) => {
      pending.reposts.push(repost)
      if (repost.repost_type == 'track') {
        pending.trackIds.add(repost.repost_item_id)
      } else {
        pending.playlistIds.add(repost.repost_item_id)
      }
    },
    follows: (follow: FollowRow) => {
      pending.follows.push(follow)
      pending.userIds.add(follow.follower_user_id)
    },
    users: async (user: UserRow) => {
      pending.userIds.add(user.user_id)
      const playlists = await client.query(
        `select playlist_id from playlists where playlist_owner_id = ${user.user_id}`
      )
      for (const r of playlists.rows) {
        pending.playlistIds.add(r.playlist_id)
      }
      const tracks = await client.query(
        `select track_id from tracks where owner_id = ${user.user_id}`
      )
      for (const r of tracks.rows) {
        pending.trackIds.add(r.track_id)
      }
    },
    tracks: async (track: TrackRow) => {
      pending.trackIds.add(track.track_id)
      const playlists = await client.query(
        `select playlist_id from playlist_tracks where track_id = ${track.track_id}`
      )
      for (const r of playlists.rows) {
        pending.playlistIds.add(r.playlist_id)
      }
      const tracks = await client.query(
        `select parent_track_id from stems where child_track_id = ${track.track_id}`
      )
      for (const r of tracks.rows) {
        pending.trackIds.add(r.parent_track_id)
      }
    },
    playlists: (playlist: PlaylistRow) => {
      pending.playlistIds.add(playlist.playlist_id)
    },
  }

  client.on('notification', async (msg) => {
    const body = JSON.parse(msg.payload)
    const handler = handlers[msg.channel]
    if (handler) {
      await handler(body)
    } else {
      logger.warn(`no handler for ${msg.channel}`)
    }
  })

  await client.query(sql)
  logger.info({ tables }, 'LISTEN')
}
