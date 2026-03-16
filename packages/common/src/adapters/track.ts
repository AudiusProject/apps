import {
  type CrossPlatformFile,
  Genre,
  Mood,
  type NativeFile,
  type Track,
  type TrackSegment as SdkTrackSegment,
  type SearchTrack,
  type Stem,
  type UpdateTrackRequestBody,
  HashId,
  Id,
  OptionalHashId,
  OptionalId
} from '@audius/sdk/services'
import camelcaseKeys from 'camelcase-keys'
import { omit, pick, mapValues } from 'lodash'
import snakecaseKeys from 'snakecase-keys'

import {
  Copyright,
  RightsController,
  StemCategory,
  TrackSegment
} from '~/models'
import { StemTrackMetadata, UserTrackMetadata } from '~/models/Track'
import type { TrackMetadataForUpload } from '~/store/upload/types'
import { formatMusicalKey, License, Maybe, squashNewLines } from '~/utils'
import dayjs from '~/utils/dayjs'

import { accessConditionsFromSDK } from './accessConditionsFromSDK'
import { accessConditionsToSDK } from './accessConditionsToSDK'
import { resourceContributorFromSDK } from './attribution'
import { favoriteFromSDK } from './favorite'
import { coverArtSizesCIDsFromSDK } from './imageSize'
import { remixFromSDK } from './remix'
import { repostFromSDK } from './repost'
import { userMetadataFromSDK } from './user'
import { transformAndCleanList } from './utils'

const VALID_GENRES = new Set<string>(Object.values(Genre))
const VALID_MOODS = new Set<string>(Object.values(Mood))

function toSdkGenre(
  value: string | undefined | ''
): (typeof Genre)[keyof typeof Genre] | undefined {
  if (value === undefined || value === '') return undefined
  return VALID_GENRES.has(value)
    ? (value as (typeof Genre)[keyof typeof Genre])
    : undefined
}

function toSdkMood(
  value: string | null | undefined
): (typeof Mood)[keyof typeof Mood] | null | undefined {
  if (value === undefined || value === null || value === '') return undefined
  return VALID_MOODS.has(value)
    ? (value as (typeof Mood)[keyof typeof Mood])
    : undefined
}

export const trackSegmentFromSDK = ({
  duration,
  multihash
}: SdkTrackSegment): TrackSegment => ({
  // Client code expects duration as a string
  duration: `${duration}`,
  multihash
})

export const userTrackMetadataFromSDK = (
  input: Track | SearchTrack
): UserTrackMetadata | undefined => {
  const decodedTrackId = OptionalHashId.parse(input.id)
  const decodedOwnerId = OptionalHashId.parse(input.userId)
  const user = userMetadataFromSDK(input.user)
  if (!decodedTrackId || !decodedOwnerId || !user) {
    return undefined
  }

  const remixes = transformAndCleanList(input.remixOf?.tracks, remixFromSDK)

  const newTrack: UserTrackMetadata = {
    // Fields from API that are omitted in this model
    ...omit(snakecaseKeys(input), [
      'id',
      'user_id',
      'followee_favorites',
      'favorite_count',
      'is_streamable'
    ]),

    // Conversions
    track_id: decodedTrackId,
    owner_id: decodedOwnerId,
    // TODO: Remove this when api is fixed to return UTC dates
    release_date: input.releaseDate
      ? dayjs
          .utc(input.releaseDate)
          .local()
          // utc -> local
          .format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ')
      : null,

    // Nested Transformed Fields
    cover_art_cids: input.coverArtCids
      ? coverArtSizesCIDsFromSDK(input.coverArtCids)
      : null,
    download_conditions: input.downloadConditions
      ? accessConditionsFromSDK(input.downloadConditions)
      : null,
    field_visibility: snakecaseKeys(input.fieldVisibility),
    followee_saves: transformAndCleanList(
      input.followeeFavorites,
      favoriteFromSDK
    ),
    followee_reposts: transformAndCleanList(
      input.followeeReposts,
      repostFromSDK
    ),
    remix_of:
      remixes.length > 0
        ? {
            tracks: remixes
          }
        : null,
    stem_of: input.stemOf?.parentTrackId
      ? {
          category: input.stemOf.category as StemCategory,
          parent_track_id: input.stemOf.parentTrackId
        }
      : undefined,
    stream_conditions: input.streamConditions
      ? accessConditionsFromSDK(input.streamConditions)
      : null,
    track_segments: input.trackSegments.map(trackSegmentFromSDK),
    user,

    // Retypes
    license: (input.license as License) ?? null,

    // Nullable fields
    allowed_api_keys: input.allowedApiKeys ?? null,
    artists: input.artists
      ? transformAndCleanList(input.artists, resourceContributorFromSDK)
      : null,
    audio_upload_id: input.audioUploadId ?? null,
    copyright_line: input.copyrightLine
      ? (snakecaseKeys(input.copyrightLine) as Copyright)
      : null,
    cover_art: input.coverArt ?? null,
    create_date: input.createDate ?? null,
    credits_splits: input.creditsSplits ?? null,
    ddex_app: input.ddexApp ?? null,
    ddex_release_ids: input.ddexReleaseIds ?? null,
    description: input.description ?? null,
    indirect_resource_contributors: input.indirectResourceContributors
      ? transformAndCleanList(
          input.indirectResourceContributors,
          resourceContributorFromSDK
        )
      : null,
    isrc: input.isrc ?? null,
    iswc: input.iswc ?? null,
    mood: input.mood ?? null,
    orig_file_cid: input.origFileCid ?? null,
    tags: input.tags ?? null,
    track_cid: input.trackCid ?? null,
    orig_filename: input.origFilename ?? null,
    parental_warning_type: input.parentalWarningType ?? null,
    preview_cid: input.previewCid ?? null,
    preview_start_seconds: input.previewStartSeconds ?? null,
    producer_copyright_line: input.producerCopyrightLine
      ? (snakecaseKeys(input.producerCopyrightLine) as Copyright)
      : null,
    resource_contributors: input.resourceContributors
      ? transformAndCleanList(
          input.resourceContributors,
          resourceContributorFromSDK
        )
      : null,
    rights_controller: input.rightsController
      ? (snakecaseKeys(input.rightsController) as RightsController)
      : null,
    save_count: input.favoriteCount,
    pinned_comment_id: input.pinnedCommentId ?? null,
    is_owned_by_user: input.isOwnedByUser,
    cover_original_artist: input.coverOriginalArtist ?? null,
    cover_original_song_title: input.coverOriginalSongTitle ?? null,
    album_backlink: input.albumBacklink
      ? snakecaseKeys(input.albumBacklink)
      : undefined
  }

  return newTrack
}

export const stemTrackMetadataFromSDK = (
  input: Stem
): StemTrackMetadata | undefined => {
  const [id, parentId, ownerId] = [input.id, input.parentId, input.userId].map(
    (id) => HashId.parse(id)
  )
  if (!(id && parentId && ownerId)) return undefined

  return {
    blocknumber: input.blocknumber,
    is_delete: false,
    track_id: id,
    created_at: '',
    isrc: null,
    iswc: null,
    credits_splits: null,
    create_date: null,
    description: null,
    followee_reposts: [],
    followee_saves: [],
    genre: '',
    has_current_user_reposted: false,
    has_current_user_saved: false,
    license: null,
    mood: null,
    play_count: 0,
    owner_id: ownerId,
    release_date: null,
    repost_count: 0,
    save_count: 0,
    comment_count: 0,
    tags: null,
    title: '',
    track_segments: [],
    cover_art: null,
    cover_art_sizes: null,
    cover_art_cids: null,
    is_scheduled_release: false,
    is_unlisted: false,
    stem_of: {
      parent_track_id: parentId,
      category: input.category as StemCategory
    },
    artwork: {},
    remix_of: null,
    duration: 0,
    updated_at: '',
    permalink: '',
    is_available: true,
    is_stream_gated: false,
    stream_conditions: null,
    is_download_gated: false,
    download_conditions: null,
    access: { stream: true, download: true },
    track_cid: input.cid,
    orig_file_cid: '',
    orig_filename: input.origFilename,
    is_downloadable: true,
    is_original_available: false,
    is_playlist_upload: false,
    is_owned_by_user: false
  }
}

const DEFAULT_GENRE = Genre.Electronic

export const trackMetadataForUploadToSdk = (
  input: TrackMetadataForUpload
): UpdateTrackRequestBody => {
  const sdkGenre = toSdkGenre(input.genre)
  const genre = sdkGenre ?? DEFAULT_GENRE
  return {
    ...camelcaseKeys(
      pick(input, [
        'license',
        'isrc',
        'iswc',
        'is_unlisted',
        'is_premium',
        'premium_conditions',
        'is_stream_gated',
        'stream_conditions',
        'is_download_gated',
        'is_downloadable',
        'is_original_available',
        'is_scheduled_release',
        'bpm',
        'is_custom_bpm',
        'is_custom_musical_key',
        'comments_disabled',
        'ddex_release_ids',
        'parental_warning_type'
      ])
    ),
    trackId: OptionalId.parse(input.track_id),
    title: input.title,
    description: squashNewLines(input.description) ?? undefined,
    mood: toSdkMood(input.mood),
    tags: input.tags ?? undefined,
    genre,
    releaseDate: input.release_date ? new Date(input.release_date) : undefined,
    previewStartSeconds: input.preview_start_seconds ?? undefined,
    previewCid: input.preview_cid ?? '',
    ddexApp: input.ddex_app ?? '',
    audioUploadId: input.audio_upload_id ?? undefined,
    duration: input.duration ?? undefined,
    musicalKey: input.musical_key
      ? formatMusicalKey(input.musical_key)
      : undefined,
    trackCid: input.track_cid ?? '',
    origFileCid: input.orig_file_cid ?? '',
    origFilename: input.orig_filename ?? undefined,
    fieldVisibility: input.field_visibility
      ? mapValues(
          camelcaseKeys(input.field_visibility),
          (value: Maybe<boolean>) => (value === null ? undefined : value)
        )
      : undefined,
    downloadConditions: input.download_conditions
      ? accessConditionsToSDK(input.download_conditions)
      : null,
    streamConditions: input.stream_conditions
      ? accessConditionsToSDK(input.stream_conditions)
      : null,
    remixOf: input.remix_of
      ? {
          tracks: input.remix_of.tracks.map((track) => ({
            parentTrackId: Id.parse(track.parent_track_id)
          }))
        }
      : undefined,
    stemOf: input.stem_of
      ? {
          category: input.stem_of.category,
          parentTrackId: Id.parse(input.stem_of.parent_track_id)
        }
      : undefined,
    copyrightLine: input.copyright_line
      ? camelcaseKeys(input.copyright_line)
      : undefined,
    producerCopyrightLine: input.producer_copyright_line
      ? camelcaseKeys(input.producer_copyright_line)
      : undefined,
    rightsController: input.rights_controller
      ? camelcaseKeys(input.rights_controller)
      : undefined,
    resourceContributors: input.resource_contributors
      ? input.resource_contributors.map((contributor) =>
          camelcaseKeys(contributor)
        )
      : undefined,
    indirectResourceContributors: input.indirect_resource_contributors
      ? input.indirect_resource_contributors.map((contributor) =>
          camelcaseKeys(contributor)
        )
      : undefined
  } as UpdateTrackRequestBody
}

export const fileToSdk = (
  file: Blob | File | NativeFile,
  name: string
): CrossPlatformFile => {
  // If we're in react-native, return as-is
  if ('uri' in file) {
    return file
  }

  // If it's already a File, return as-is
  if (file instanceof File) {
    return file
  }

  // If it's a Blob, convert to File with a name
  return new File([file], name, { type: file.type })
}
