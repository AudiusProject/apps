import { QueryClient } from '@tanstack/react-query'
import { omit } from 'lodash'
import { SetRequired } from 'type-fest'

import { Kind } from '~/models'
import { Track, TrackMetadata, UserTrackMetadata } from '~/models/Track'
import { User } from '~/models/User'
import { EntriesByKind } from '~/store/cache/types'
import { getContext } from '~/store/effects'

import { getTrackQueryKey } from '../tracks/useTrack'
import { getTrackByPermalinkQueryKey } from '../tracks/useTrackByPermalink'

import { formatTrackData } from './formatTrackData'
import { primeUserData } from './primeUserData'

/**
 * Add the cosigned status to the track
 */
const setIsCoSigned = <T extends TrackMetadata>(track: T) => {
  const { remix_of } = track

  const remixOfTrack = remix_of?.tracks?.[0]

  const isCoSigned =
    remixOfTrack &&
    (remixOfTrack.has_remix_author_saved ||
      remixOfTrack.has_remix_author_reposted)

  if (isCoSigned) {
    return {
      ...track,
      _co_sign: remix_of!.tracks[0]
    }
  }
  return track
}

/**
 * When a track is not unlisted, even if field visibility is set
 * we should coerce the track into a state where socials are visible.
 * @param track
 * @returns track with repaired field visibility
 */
const setFieldVisibility = <T extends TrackMetadata>(track: T) => {
  const { is_unlisted } = track
  if (!is_unlisted) {
    // Public track
    return {
      ...track,
      field_visibility: {
        ...track.field_visibility,
        genre: true,
        mood: true,
        tags: true,
        share: true,
        play_count: true,
        remixes: true
      }
    }
  }
  return track
}

/**
 * NOTE: This is a temporary fix for a backend bug: The field followee_saves is not defined.
 * This is a stopgap to prevent the client from erroring and should be removed after fixed.
 * The current erroneous disprov endpoint is `/feed/reposts/<userid>`
 * @param track
 */
const setDefaultFolloweeSaves = <T extends TrackMetadata>(track: T) => {
  return {
    ...track,
    followee_saves: track?.followee_saves ?? []
  }
}

/**
 * Reformats a track to be used internally within the client
 * This method should *always* be called before a track is cached.
 */
export const reformat = <T extends TrackMetadata>(track: T): Track => {
  const t = track
  const withoutUser = omit(t, 'user')
  const withUserIdAsUser = { ...withoutUser, user: t.owner_id }
  const withCosign = setIsCoSigned(withUserIdAsUser)
  const withFieldVisibility = setFieldVisibility(withCosign)

  const withDefaultSaves = setDefaultFolloweeSaves(withFieldVisibility)
  return withDefaultSaves
}

export const primeTrackData = ({
  tracks,
  queryClient,
  forceReplace = false,
  skipQueryData = false
}: {
  tracks: (UserTrackMetadata | Track)[]
  queryClient: QueryClient
  forceReplace?: boolean
  skipQueryData?: boolean
}) => {
  const formattedTracks = tracks.map((track) => formatTrackData(track))
  primeTrackDataInternal({
    tracks: formattedTracks,
    queryClient,
    forceReplace,
    skipQueryData
  })

  return formattedTracks
}

export const primeTrackDataInternal = ({
  tracks,
  queryClient,
  forceReplace = false,
  skipQueryData = false
}: {
  tracks: (UserTrackMetadata | Track)[]
  queryClient: QueryClient
  forceReplace?: boolean
  skipQueryData?: boolean
}): EntriesByKind => {
  // Set up entries for Redux
  const entries: SetRequired<EntriesByKind, Kind.USERS> = {
    [Kind.USERS]: {}
  }

  tracks.forEach((track) => {
    if (!track.track_id) return

    // Prime track data only if it doesn't exist and skipQueryData is false
    if (
      forceReplace ||
      (!skipQueryData &&
        !queryClient.getQueryData(getTrackQueryKey(track.track_id)))
    ) {
      const tqTrack: TrackMetadata = omit(track, 'user')
      queryClient.setQueryData(getTrackQueryKey(track.track_id), tqTrack)
    }

    if (
      forceReplace ||
      !queryClient.getQueryData(getTrackByPermalinkQueryKey(track.permalink))
    ) {
      queryClient.setQueryData(
        getTrackByPermalinkQueryKey(track.permalink),
        track.track_id
      )
    }

    // Prime user data from track owner
    if ('user' in track) {
      const user = (track as { user: User }).user
      primeUserData({
        users: [user],
        queryClient
      })
    }
  })

  return entries
}

export function* primeTrackDataSaga(tracks: (UserTrackMetadata | Track)[]) {
  const queryClient = yield* getContext('queryClient')

  return primeTrackData({ tracks, queryClient })
}
