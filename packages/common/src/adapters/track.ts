import {
  type full,
  type CrossPlatformFile,
  type Genre,
  type Mood,
  type NativeFile,
  type Track,
  HashId,
  Id,
  OptionalHashId,
  OptionalId
} from '@audius/sdk'
import camelcaseKeys from 'camelcase-keys'
import dayjs from 'dayjs'
import { pick, mapValues } from 'lodash'
import snakecaseKeys from 'snakecase-keys'

import {
  Copyright,
  RightsController,
  StemCategory,
  TrackSegment
} from '~/models'
import { SquareSizes } from '~/models/ImageSizes'
import { StemTrackMetadata, UserTrackMetadata } from '~/models/Track'
import type { TrackMetadataForUpload } from '~/store/upload/types'
import { formatMusicalKey, License, Maybe, squashNewLines } from '~/utils'

import { accessConditionsFromSDK } from './accessConditionsFromSDK'
import { accessConditionsToSDK } from './accessConditionsToSDK'
import { resourceContributorFromSDK } from './attribution'
import { favoriteFromSDK } from './favorite'
import { coverArtSizesCIDsFromSDK } from './imageSize'
import { remixFromSDK } from './remix'
import { repostFromSDK } from './repost'
import { userMetadataFromSDK } from './user'
import { transformAndCleanList } from './utils'

export const trackSegmentFromSDK = ({
  duration,
  multihash
}: {
  duration: number
  multihash: string
}): TrackSegment => ({
  // Client code expects duration as a string
  duration: `${duration}`,
  multihash
})

/** Track-like shape from default or full SDK (same runtime shape, shared camelCase fields). */
type TrackFromSDK = Track | full.TrackFull | full.SearchTrackFull

type SdkArtwork = {
  _150x150?: string
  _480x480?: string
  _1000x1000?: string
  mirrors?: string[]
}

function artworkFromSDK(
  art: SdkArtwork | undefined
): UserTrackMetadata['artwork'] {
  if (!art) return {}
  return {
    [SquareSizes.SIZE_150_BY_150]: art._150x150,
    [SquareSizes.SIZE_480_BY_480]: art._480x480,
    [SquareSizes.SIZE_1000_BY_1000]: art._1000x1000,
    ...(art.mirrors ? { mirrors: art.mirrors } : {})
  }
}

function getStemOf(
  stemOf: TrackFromSDK['stemOf']
): { parent_track_id: number; category: StemCategory } | undefined {
  const raw = Array.isArray(stemOf) ? stemOf[0] : stemOf
  if (!raw || typeof raw !== 'object' || !('parentTrackId' in raw))
    return undefined
  const parentId = OptionalHashId.parse(
    typeof (raw as { parentTrackId?: string }).parentTrackId === 'string'
      ? (raw as { parentTrackId: string }).parentTrackId
      : undefined
  )
  const category = (raw as { category?: string }).category
  if (!parentId || !category) return undefined
  return { parent_track_id: parentId, category: category as StemCategory }
}

export const userTrackMetadataFromSDK = (
  input: TrackFromSDK
): UserTrackMetadata | undefined => {
  const decodedTrackId = OptionalHashId.parse(input.id)
  const decodedOwnerId =
    OptionalHashId.parse((input as { userId?: string }).userId) ??
    OptionalHashId.parse(input.user?.id)
  const user = input.user ? userMetadataFromSDK(input.user) : undefined
  if (!decodedTrackId || !decodedOwnerId || !user) {
    return undefined
  }

  const remixTracks = input.remixOf?.tracks ?? []
  const remixes = transformAndCleanList(
    remixTracks.filter(
      (item): item is full.FullRemix =>
        !!item &&
        typeof item === 'object' &&
        'user' in item &&
        !!(item as full.FullRemix).user
    ),
    remixFromSDK
  )
  const stemOf = getStemOf(input.stemOf)
  const accessRaw =
    input.access && 'stream' in input.access
      ? input.access
      : (
          input as {
            access?: { access?: { stream: boolean; download: boolean } }
          }
        ).access?.access
  const access = accessRaw ?? { stream: true, download: true }

  const coverArtCidsSource =
    (input as full.TrackFull).coverArtCids ?? input.artwork
  const cover_art_cids =
    coverArtCidsSource != null
      ? coverArtSizesCIDsFromSDK(coverArtCidsSource as full.CoverArt)
      : null

  const trackSegmentsRaw = input.trackSegments
  const track_segments = Array.isArray(trackSegmentsRaw)
    ? (trackSegmentsRaw as Array<{ duration?: number; multihash?: string }>)
        .filter(
          (s): s is { duration: number; multihash: string } =>
            !!s &&
            typeof s === 'object' &&
            typeof s.duration === 'number' &&
            typeof s.multihash === 'string'
        )
        .map(trackSegmentFromSDK)
    : []

  const defaultFieldVisibility = {
    genre: true,
    mood: true,
    tags: true,
    share: true,
    play_count: true,
    remixes: true
  }
  const field_visibility = input.fieldVisibility
    ? (snakecaseKeys(
        input.fieldVisibility as Record<string, unknown>
      ) as UserTrackMetadata['field_visibility'])
    : defaultFieldVisibility

  const newTrack: UserTrackMetadata = {
    blocknumber: input.blocknumber ?? 0,
    is_delete: input.isDelete ?? false,
    track_id: decodedTrackId,
    owner_id: decodedOwnerId,
    created_at:
      input.createdAt instanceof Date
        ? input.createdAt.toISOString()
        : ((input as { createdAt?: string }).createdAt ?? ''),
    updated_at:
      input.updatedAt instanceof Date
        ? input.updatedAt.toISOString()
        : ((input as { updatedAt?: string }).updatedAt ?? ''),
    genre: input.genre,
    title: input.title,
    duration: input.duration,
    play_count: input.playCount ?? 0,
    repost_count: input.repostCount ?? 0,
    save_count: input.favoriteCount ?? 0,
    comment_count: input.commentCount ?? 0,
    permalink: input.permalink,
    is_stream_gated: input.isStreamGated ?? false,
    stream_conditions: input.streamConditions
      ? accessConditionsFromSDK(input.streamConditions)
      : null,
    is_download_gated: input.isDownloadGated ?? false,
    download_conditions: input.downloadConditions
      ? accessConditionsFromSDK(input.downloadConditions)
      : null,
    access: { stream: access.stream, download: access.download },
    is_available: input.isAvailable ?? true,
    is_scheduled_release: input.isScheduledRelease ?? false,
    is_unlisted: input.isUnlisted ?? false,
    artwork: artworkFromSDK(input.artwork as SdkArtwork),
    track_segments,
    followee_reposts: transformAndCleanList(
      (input.followeeReposts ?? []) as full.Repost[],
      repostFromSDK
    ),
    followee_saves: transformAndCleanList(
      (input.followeeFavorites ?? []) as full.Favorite[],
      favoriteFromSDK
    ),
    has_current_user_reposted: input.hasCurrentUserReposted ?? false,
    has_current_user_saved: input.hasCurrentUserSaved ?? false,
    field_visibility,
    remix_of: remixes.length > 0 ? { tracks: remixes } : null,
    stem_of: stemOf,
    cover_art_cids,
    user,

    release_date: input.releaseDate
      ? dayjs
          .utc(input.releaseDate)
          .local()
          .format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ')
      : null,
    license: (input.license as License) ?? null,
    allowed_api_keys: input.allowedApiKeys ?? null,
    artists: input.artists
      ? transformAndCleanList(
          (input.artists as object[]) ?? [],
          resourceContributorFromSDK
        )
      : null,
    audio_upload_id: input.audioUploadId ?? null,
    copyright_line: input.copyrightLine
      ? (snakecaseKeys(
          input.copyrightLine as Record<string, unknown>
        ) as Copyright)
      : null,
    cover_art: input.coverArt ?? null,
    create_date: input.createDate ?? null,
    credits_splits: input.creditsSplits ?? null,
    ddex_app: input.ddexApp ?? null,
    ddex_release_ids: input.ddexReleaseIds ?? null,
    description: input.description ?? null,
    indirect_resource_contributors: input.indirectResourceContributors
      ? transformAndCleanList(
          (input.indirectResourceContributors as object[]) ?? [],
          resourceContributorFromSDK
        )
      : null,
    isrc: input.isrc ?? null,
    iswc: input.iswc ?? null,
    mood: input.mood ?? null,
    orig_file_cid: input.origFileCid ?? null,
    orig_filename: input.origFilename ?? null,
    tags: input.tags ?? null,
    track_cid: input.trackCid ?? null,
    parental_warning_type: input.parentalWarningType ?? null,
    preview_cid: input.previewCid ?? null,
    preview_start_seconds: input.previewStartSeconds ?? null,
    producer_copyright_line: input.producerCopyrightLine
      ? (snakecaseKeys(
          input.producerCopyrightLine as Record<string, unknown>
        ) as Copyright)
      : null,
    resource_contributors: input.resourceContributors
      ? transformAndCleanList(
          (input.resourceContributors as object[]) ?? [],
          resourceContributorFromSDK
        )
      : null,
    rights_controller: input.rightsController
      ? (snakecaseKeys(
          input.rightsController as Record<string, unknown>
        ) as RightsController)
      : null,
    pinned_comment_id: input.pinnedCommentId ?? null,
    is_owned_by_user: input.isOwnedByUser ?? false,
    cover_original_artist: input.coverOriginalArtist ?? null,
    cover_original_song_title: input.coverOriginalSongTitle ?? null,
    album_backlink: input.albumBacklink
      ? (snakecaseKeys(
          input.albumBacklink as unknown as Record<string, unknown>
        ) as UserTrackMetadata['album_backlink'])
      : undefined,
    is_downloadable: input.isDownloadable ?? false,
    is_original_available: input.isOriginalAvailable ?? false,
    cover_art_sizes: input.coverArtSizes ?? null,
    bpm: input.bpm ?? null,
    is_custom_bpm: input.isCustomBpm ?? false,
    is_custom_musical_key: input.isCustomMusicalKey ?? false,
    comments_disabled: input.commentsDisabled ?? false,
    musical_key: input.musicalKey ?? null,
    audio_analysis_error_count: input.audioAnalysisErrorCount
  }

  return newTrack
}

export const stemTrackMetadataFromSDK = (
  input: full.StemFull | Record<string, any>
): StemTrackMetadata | undefined => {
  const parentTrackId =
    'parentId' in input ? input.parentId : (input as any).parentTrackId
  const ownerTrackId =
    'userId' in input ? input.userId : (input as any).user?.id
  const [id, parentId, ownerId] = [input.id, parentTrackId, ownerTrackId].map(
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

export const trackMetadataForUploadToSdk = (input: TrackMetadataForUpload) => ({
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
  mood: input.mood as Mood,
  tags: input.tags ?? undefined,
  genre: (input.genre as Genre) || undefined,
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
})

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
