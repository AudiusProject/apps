import { Mood, type AudiusSdk } from '@audius/sdk'
import { z } from 'zod'

import {
  ADDITIVE_WRITE,
  DESTRUCTIVE_WRITE,
  READ_ONLY,
  pagination,
  type RegisterTool
} from './context.js'
import { formatTrack, formatTrackStats, formatUser } from './format.js'
import { fetchRemoteFile } from './remoteFile.js'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const MOODS = Object.values(Mood) as [Mood, ...Mood[]]

const trackId = z
  .string()
  .min(1)
  .describe('Audius track ID (the `id` returned by other tools)')

const title = z.string().min(1).max(200).describe('Track title')
const description = z.string().max(2500).describe('Track description')
const genre = z
  .string()
  .min(1)
  .max(100)
  .describe('Genre, e.g. "Electronic", "Hip-Hop/Rap", "House", "Lo-Fi"')
const mood = z.enum(MOODS).describe('Mood of the track')
const tags = z
  .array(
    z
      .string()
      .min(1)
      .max(50)
      .regex(/^[^,]+$/, 'Tags cannot contain commas')
  )
  .max(10)
  .describe('Up to 10 tags')

const TOP_FANS_TRACK_SAMPLE = 25
const TOP_FANS_LISTENERS_PER_TRACK = 100

type RawListener = {
  count?: number
  user?: {
    id?: string
    handle?: string
    name?: string
    is_verified?: boolean
  }
}

type ListenerRef = {
  id: string
  handle: string | undefined
  name: string | undefined
  is_verified: boolean | undefined
}

const formatListener = (user: RawListener['user']): ListenerRef | undefined =>
  user?.id
    ? {
        id: user.id,
        handle: user.handle,
        name: user.name,
        is_verified: user.is_verified
      }
    : undefined

const fetchTopListeners = async (
  sdk: AudiusSdk,
  trackId: string,
  limit: number,
  offset: number
) => {
  const response = await sdk.tracks.getTrackTopListenersRaw({
    trackId,
    limit,
    offset
  })
  const body = (await response.raw.json()) as { data?: RawListener[] }
  return (body.data ?? []).map((listener) => ({
    count: listener.count ?? 0,
    user: listener.user
  }))
}

export const registerArtistTools = (tool: RegisterTool) => {
  tool(
    'get_my_tracks',
    {
      title: 'Get my tracks',
      description:
        'List the tracks the signed-in user has uploaded, including unlisted ones.',
      inputSchema: {
        sort: z
          .enum(['date', 'plays'])
          .default('date')
          .describe('Order by upload date or by play count'),
        ...pagination
      },
      annotations: READ_ONLY
    },
    async ({ sort, limit, offset }, { sdk, userId }) => {
      const { data } = await sdk.users.getTracksByUser({
        id: userId,
        userId,
        sort,
        limit,
        offset
      })
      return { tracks: (data ?? []).map(formatTrack) }
    }
  )

  tool(
    'get_track_play_count',
    {
      title: 'Get track stats',
      description:
        'Get the play count and engagement stats (favorites, reposts, comments) for a track.',
      inputSchema: { track_id: trackId },
      annotations: READ_ONLY
    },
    async ({ track_id }, { sdk, userId }) => {
      const { data } = await sdk.tracks.getTrack({ trackId: track_id, userId })
      if (!data) throw new Error(`Track ${track_id} was not found`)
      return { stats: formatTrackStats(data) }
    }
  )

  tool(
    'get_my_followers',
    {
      title: 'Get my followers',
      description: 'List the users who follow the signed-in user.',
      inputSchema: { ...pagination },
      annotations: READ_ONLY
    },
    async ({ limit, offset }, { sdk, userId }) => {
      const { data } = await sdk.users.getFollowers({
        id: userId,
        userId,
        limit,
        offset
      })
      return { followers: (data ?? []).map(formatUser) }
    }
  )

  tool(
    'get_top_fans',
    {
      title: 'Get top fans',
      description:
        "List the signed-in user's top listeners, ranked by how many times they have played the user's tracks. Pass track_id to rank listeners of one track; otherwise plays are totalled across the user's most-played tracks.",
      inputSchema: {
        track_id: trackId
          .optional()
          .describe('Limit the ranking to listeners of this track'),
        ...pagination
      },
      annotations: READ_ONLY
    },
    async ({ track_id, limit, offset }, { sdk, userId }) => {
      if (track_id) {
        const listeners = await fetchTopListeners(sdk, track_id, limit, offset)
        return {
          top_fans: listeners.map((listener, index) => ({
            rank: offset + index + 1,
            play_count: listener.count,
            user: formatListener(listener.user)
          }))
        }
      }
      const { data: tracks } = await sdk.users.getTracksByUser({
        id: userId,
        userId,
        sort: 'plays',
        limit: TOP_FANS_TRACK_SAMPLE
      })
      const perTrack = await Promise.all(
        (tracks ?? []).map((track) =>
          fetchTopListeners(sdk, track.id, TOP_FANS_LISTENERS_PER_TRACK, 0)
        )
      )
      const totals = new Map<
        string,
        { play_count: number; tracks_played: number; user: ListenerRef }
      >()
      for (const listener of perTrack.flat()) {
        const user = formatListener(listener.user)
        if (!user || user.id === userId) continue
        const entry = totals.get(user.id) ?? {
          play_count: 0,
          tracks_played: 0,
          user
        }
        entry.play_count += listener.count
        entry.tracks_played += 1
        totals.set(user.id, entry)
      }
      const ranked = [...totals.values()].sort(
        (a, b) =>
          b.play_count - a.play_count || b.tracks_played - a.tracks_played
      )
      return {
        tracks_considered: tracks?.length ?? 0,
        top_fans: ranked
          .slice(offset, offset + limit)
          .map((entry, index) => ({ rank: offset + index + 1, ...entry }))
      }
    }
  )

  tool(
    'update_track_metadata',
    {
      title: 'Update track metadata',
      description:
        'Change the title, description, genre, mood or tags of a track the signed-in user owns. Only the fields provided are changed; each one overwrites the current value.',
      inputSchema: {
        track_id: trackId,
        title: title.optional(),
        description: description.optional(),
        genre: genre.optional(),
        mood: mood.optional(),
        tags: tags.optional().describe('Replaces all existing tags')
      },
      annotations: { ...DESTRUCTIVE_WRITE, idempotentHint: true }
    },
    async ({ track_id, tags: newTags, ...fields }, { sdk, userId }) => {
      const metadata = {
        ...fields,
        ...(newTags !== undefined ? { tags: newTags.join(',') } : {})
      }
      const changed = Object.entries(metadata)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key)
      if (changed.length === 0) {
        throw new Error('Provide at least one field to update')
      }
      const { data: track } = await sdk.tracks.getTrack({
        trackId: track_id,
        userId
      })
      if (!track) throw new Error(`Track ${track_id} was not found`)
      if (track.user.id !== userId) {
        throw new Error('You can only change tracks that you own')
      }
      await sdk.tracks.updateTrack({ trackId: track_id, userId, metadata })
      return { track_id, updated_fields: changed }
    }
  )

  tool(
    'upload_track',
    {
      title: 'Upload track',
      description:
        "Upload a new track to the signed-in user's Audius account from a publicly reachable https URL of an audio file. The track is published publicly unless is_unlisted is true. Transcoding can take a minute or more.",
      inputSchema: {
        audio_url: z
          .string()
          .url()
          .describe('Public https URL of the audio file (mp3, wav, flac, …)'),
        title,
        genre,
        description: description.optional(),
        mood: mood.optional(),
        tags: tags.optional(),
        cover_art_url: z
          .string()
          .url()
          .optional()
          .describe(
            'Public https URL of a square JPEG, PNG or WebP cover image'
          ),
        is_unlisted: z
          .boolean()
          .default(false)
          .describe('Upload as a hidden track that only the owner can see')
      },
      annotations: ADDITIVE_WRITE
    },
    async (
      { audio_url, cover_art_url, tags: newTags, is_unlisted, ...fields },
      { sdk, userId, config }
    ) => {
      const [audioFile, coverFile] = await Promise.all([
        fetchRemoteFile({
          url: audio_url,
          maxBytes: config.maxUploadBytes,
          accept: (type) =>
            type.startsWith('audio/') || type === 'application/octet-stream'
        }),
        cover_art_url
          ? fetchRemoteFile({
              url: cover_art_url,
              maxBytes: MAX_IMAGE_BYTES,
              accept: (type) => IMAGE_TYPES.includes(type)
            })
          : undefined
      ])

      const [audio, coverArtSizes] = await Promise.all([
        sdk.uploads.createAudioUpload({ file: audioFile, userId }).start(),
        coverFile
          ? sdk.uploads.createImageUpload({ file: coverFile }).start()
          : undefined
      ])
      if (!audio.trackCid) {
        throw new Error('Audio processing did not produce a playable file')
      }

      const result = await sdk.tracks.createTrack({
        userId,
        metadata: {
          ...fields,
          tags: newTags?.join(','),
          isUnlisted: is_unlisted,
          trackCid: audio.trackCid,
          origFileCid: audio.origFileCid,
          origFilename: audio.origFilename,
          duration: audio.duration,
          bpm: audio.bpm,
          musicalKey: audio.musicalKey,
          coverArtSizes
        }
      })
      return {
        track_id: result.trackId,
        title: fields.title,
        duration_seconds: audio.duration,
        is_unlisted
      }
    }
  )
}
