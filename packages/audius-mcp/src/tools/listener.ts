import type { Track } from '@audius/sdk'
import { z } from 'zod'

import {
  ADDITIVE_WRITE,
  DESTRUCTIVE_WRITE,
  READ_ONLY,
  pagination,
  type RegisterTool,
  type ToolContext
} from './context.js'
import { formatPlaylist, formatTrack, formatUser } from './format.js'

const trackId = z
  .string()
  .min(1)
  .describe('Audius track ID, e.g. "D7KyD" (the `id` returned by other tools)')

const playlistId = z
  .string()
  .min(1)
  .describe('Audius playlist ID (the `id` returned by other tools)')

const getOwnedPlaylist = async ({ sdk, userId }: ToolContext, id: string) => {
  const { data } = await sdk.playlists.getPlaylist({ playlistId: id, userId })
  const playlist = data?.[0]
  if (!playlist) throw new Error(`Playlist ${id} was not found`)
  if (playlist.user.id !== userId) {
    throw new Error('You can only change playlists that you own')
  }
  if (playlist.isAlbum) {
    throw new Error('Albums cannot be edited with this tool')
  }
  return playlist
}

export const registerListenerTools = (tool: RegisterTool) => {
  tool(
    'search_tracks',
    {
      title: 'Search tracks',
      description:
        'Search Audius for tracks by title, artist or keyword. Returns track IDs that other tools accept.',
      inputSchema: {
        query: z.string().min(1).describe('Search text'),
        genre: z
          .string()
          .optional()
          .describe('Only return tracks in this genre, e.g. "Electronic"'),
        sort: z
          .enum(['relevant', 'popular', 'recent'])
          .default('relevant')
          .describe('Result ordering'),
        ...pagination
      },
      annotations: READ_ONLY
    },
    async ({ query, genre, sort, limit, offset }, { sdk }) => {
      const { data } = await sdk.tracks.searchTracks({
        query,
        genre: genre ? [genre] : undefined,
        sortMethod: sort,
        limit,
        offset
      })
      return { tracks: (data ?? []).map(formatTrack) }
    }
  )

  tool(
    'search_users',
    {
      title: 'Search users',
      description: 'Search Audius for artists and listeners by name or handle.',
      inputSchema: {
        query: z.string().min(1).describe('Search text'),
        ...pagination
      },
      annotations: READ_ONLY
    },
    async ({ query, limit, offset }, { sdk }) => {
      const { data } = await sdk.users.searchUsers({ query, limit, offset })
      return { users: (data ?? []).map(formatUser) }
    }
  )

  tool(
    'search_playlists',
    {
      title: 'Search playlists',
      description: 'Search Audius for public playlists by name.',
      inputSchema: {
        query: z.string().min(1).describe('Search text'),
        ...pagination
      },
      annotations: READ_ONLY
    },
    async ({ query, limit, offset }, { sdk }) => {
      const { data } = await sdk.playlists.searchPlaylists({
        query,
        limit,
        offset
      })
      return { playlists: (data ?? []).map(formatPlaylist) }
    }
  )

  tool(
    'get_trending_tracks',
    {
      title: 'Get trending tracks',
      description:
        'List the tracks currently trending on Audius, optionally for one genre and time range.',
      inputSchema: {
        genre: z
          .string()
          .optional()
          .describe('Only return tracks trending in this genre'),
        time: z
          .enum(['week', 'month', 'year', 'allTime'])
          .default('week')
          .describe('Time range the ranking covers'),
        ...pagination
      },
      annotations: READ_ONLY
    },
    async ({ genre, time, limit, offset }, { sdk, userId }) => {
      const { data } = await sdk.tracks.getTrendingTracks({
        genre,
        time,
        limit,
        offset,
        userId
      })
      return { tracks: (data ?? []).map(formatTrack) }
    }
  )

  tool(
    'get_track',
    {
      title: 'Get track',
      description: 'Get the details of one Audius track by its ID.',
      inputSchema: { track_id: trackId },
      annotations: READ_ONLY
    },
    async ({ track_id }, { sdk, userId }) => {
      const { data } = await sdk.tracks.getTrack({ trackId: track_id, userId })
      if (!data) throw new Error(`Track ${track_id} was not found`)
      return { track: formatTrack(data) }
    }
  )

  tool(
    'get_user',
    {
      title: 'Get user',
      description:
        'Get an Audius user profile by user ID or by handle. Provide exactly one of the two.',
      inputSchema: {
        user_id: z.string().min(1).optional().describe('Audius user ID'),
        handle: z
          .string()
          .min(1)
          .optional()
          .describe('Audius handle, with or without a leading @')
      },
      annotations: READ_ONLY
    },
    async ({ user_id, handle }, { sdk, userId }) => {
      if ((user_id === undefined) === (handle === undefined)) {
        throw new Error('Provide exactly one of user_id or handle')
      }
      const { data } =
        user_id !== undefined
          ? await sdk.users.getUser({ id: user_id, userId })
          : await sdk.users.getUserByHandle({
              handle: handle!.replace(/^@/, ''),
              userId
            })
      if (!data) throw new Error('User was not found')
      return { user: formatUser(data) }
    }
  )

  tool(
    'get_playlist',
    {
      title: 'Get playlist',
      description:
        'Get an Audius playlist or album by ID, including its tracks in order.',
      inputSchema: { playlist_id: playlistId },
      annotations: READ_ONLY
    },
    async ({ playlist_id }, { sdk, userId }) => {
      const { data } = await sdk.playlists.getPlaylist({
        playlistId: playlist_id,
        userId
      })
      const playlist = data?.[0]
      if (!playlist) throw new Error(`Playlist ${playlist_id} was not found`)
      let tracks: Track[] = playlist.tracks ?? []
      if (tracks.length === 0 && playlist.playlistContents.length > 0) {
        const response = await sdk.playlists.getPlaylistTracks({
          playlistId: playlist_id
        })
        tracks = response.data ?? []
      }
      return {
        playlist: formatPlaylist(playlist),
        tracks: tracks.map(formatTrack)
      }
    }
  )

  tool(
    'get_my_favorites',
    {
      title: 'Get my favorites',
      description:
        'List the tracks the signed-in user has favorited, most recent first.',
      inputSchema: { ...pagination },
      annotations: READ_ONLY
    },
    async ({ limit, offset }, { sdk, userId }) => {
      const { data } = await sdk.users.getUserLibraryTracks({
        id: userId,
        userId,
        type: 'favorite',
        sortMethod: 'added_date',
        sortDirection: 'desc',
        limit,
        offset
      })
      return {
        favorites: (data ?? []).map((activity) => ({
          favorited_at: activity.timestamp,
          track: formatTrack(activity.item)
        }))
      }
    }
  )

  tool(
    'get_my_reposts',
    {
      title: 'Get my reposts',
      description:
        'List the tracks and playlists the signed-in user has reposted, most recent first.',
      inputSchema: { ...pagination },
      annotations: READ_ONLY
    },
    async ({ limit, offset }, { sdk, userId }) => {
      const { data } = await sdk.users.getReposts({
        id: userId,
        userId,
        limit,
        offset
      })
      return {
        reposts: (data ?? []).map((activity) => {
          const item = activity.item as Record<string, unknown>
          return {
            reposted_at: activity.timestamp,
            type: activity.itemType,
            item:
              'playlistName' in item
                ? formatPlaylist(item as never)
                : formatTrack(item as never)
          }
        })
      }
    }
  )

  tool(
    'create_playlist',
    {
      title: 'Create playlist',
      description:
        "Create a new playlist in the signed-in user's Audius account, optionally with an initial list of tracks.",
      inputSchema: {
        name: z.string().min(1).max(64).describe('Playlist name'),
        description: z.string().max(1000).optional(),
        is_private: z
          .boolean()
          .default(false)
          .describe('Create the playlist as private (hidden from others)'),
        track_ids: z
          .array(trackId)
          .max(200)
          .default([])
          .describe('Track IDs to add, in order')
      },
      annotations: ADDITIVE_WRITE
    },
    async ({ name, description, is_private, track_ids }, { sdk, userId }) => {
      const timestamp = Math.floor(Date.now() / 1000)
      const result = await sdk.playlists.createPlaylist({
        userId,
        metadata: {
          playlistName: name,
          description,
          isPrivate: is_private,
          playlistContents: track_ids.map((id) => ({
            trackId: id,
            timestamp,
            metadataTimestamp: timestamp
          }))
        }
      })
      return {
        playlist_id: result.playlistId,
        name,
        is_private,
        track_count: track_ids.length
      }
    }
  )

  tool(
    'add_track_to_playlist',
    {
      title: 'Add track to playlist',
      description:
        'Append a track to the end of a playlist owned by the signed-in user.',
      inputSchema: { playlist_id: playlistId, track_id: trackId },
      annotations: ADDITIVE_WRITE
    },
    async ({ playlist_id, track_id }, context) => {
      const playlist = await getOwnedPlaylist(context, playlist_id)
      const timestamp = Math.floor(Date.now() / 1000)
      await context.sdk.playlists.updatePlaylist({
        playlistId: playlist_id,
        userId: context.userId,
        metadata: {
          playlistContents: [
            ...playlist.playlistContents,
            { trackId: track_id, timestamp, metadataTimestamp: timestamp }
          ]
        }
      })
      return {
        playlist_id,
        track_id,
        track_count: playlist.playlistContents.length + 1
      }
    }
  )

  tool(
    'remove_track_from_playlist',
    {
      title: 'Remove track from playlist',
      description:
        'Remove a track from a playlist owned by the signed-in user. If the track appears more than once, every occurrence is removed.',
      inputSchema: { playlist_id: playlistId, track_id: trackId },
      annotations: DESTRUCTIVE_WRITE
    },
    async ({ playlist_id, track_id }, context) => {
      const playlist = await getOwnedPlaylist(context, playlist_id)
      const remaining = playlist.playlistContents.filter(
        (entry) => entry.trackId !== track_id
      )
      if (remaining.length === playlist.playlistContents.length) {
        throw new Error(`Track ${track_id} is not in playlist ${playlist_id}`)
      }
      await context.sdk.playlists.updatePlaylist({
        playlistId: playlist_id,
        userId: context.userId,
        metadata: { playlistContents: remaining }
      })
      return { playlist_id, track_id, track_count: remaining.length }
    }
  )

  tool(
    'favorite_track',
    {
      title: 'Favorite track',
      description:
        "Add a track to the signed-in user's favorites. Favorites are public.",
      inputSchema: { track_id: trackId },
      annotations: { ...ADDITIVE_WRITE, idempotentHint: true }
    },
    async ({ track_id }, { sdk, userId }) => {
      await sdk.tracks.favoriteTrack({ trackId: track_id, userId })
      return { track_id, favorited: true }
    }
  )

  tool(
    'repost_track',
    {
      title: 'Repost track',
      description:
        "Repost a track to the signed-in user's profile, which shares it with their followers.",
      inputSchema: { track_id: trackId },
      annotations: { ...ADDITIVE_WRITE, idempotentHint: true }
    },
    async ({ track_id }, { sdk, userId }) => {
      await sdk.tracks.repostTrack({ trackId: track_id, userId })
      return { track_id, reposted: true }
    }
  )
}
