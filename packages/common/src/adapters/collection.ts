import {
  CreateAlbumMetadata,
  CreatePlaylistMetadata,
  full,
  Id,
  OptionalHashId,
  type Playlist,
  type PlaylistFullWithoutTracks as DefaultPlaylistFullWithoutTracks,
  UpdateAlbumRequest,
  UpdatePlaylistRequest
} from '@audius/sdk'
import dayjs from 'dayjs'
import snakecaseKeys from 'snakecase-keys'

import {
  AccountCollection,
  Collection,
  PlaylistTrackId,
  UserCollectionMetadata,
  Variant
} from '~/models/Collection'
import { Copyright } from '~/models/Track'
import type { AlbumValues, PlaylistValues } from '~/schemas'

import { accessConditionsFromSDK } from './accessConditionsFromSDK'
import { resourceContributorFromSDK } from './attribution'
import { favoriteFromSDK } from './favorite'
import { coverArtSizesCIDsFromSDK } from './imageSize'
import { repostFromSDK } from './repost'
import { userTrackMetadataFromSDK } from './track'
import { userMetadataFromSDK } from './user'
import { transformAndCleanList } from './utils'

const addedTimestampToPlaylistTrackId = ({
  timestamp,
  trackId,
  metadataTimestamp
}: full.PlaylistAddedTimestamp): PlaylistTrackId | null => {
  const decoded = OptionalHashId.parse(trackId)
  if (decoded) {
    return {
      track: decoded,
      time: timestamp,
      metadata_time: metadataTimestamp
    }
  }
  return null
}

/** Playlist/album shape from default or full SDK (same runtime shape, shared camelCase fields). */
type CollectionFromSDK =
  | Playlist
  | full.PlaylistFullWithoutTracks
  | full.SearchPlaylistFull
  | full.PlaylistFull
  | DefaultPlaylistFullWithoutTracks

function collectionArtworkFromSDK(
  art: CollectionFromSDK['artwork']
): UserCollectionMetadata['artwork'] {
  if (!art) return {}
  return {
    '150x150': art._150x150,
    '480x480': art._480x480,
    '1000x1000': art._1000x1000,
    ...('mirrors' in art && art.mirrors ? { mirrors: art.mirrors } : {})
  }
}

export const userCollectionMetadataFromSDK = (
  input: CollectionFromSDK
): UserCollectionMetadata | undefined => {
  try {
    const userId =
      'userId' in input && input.userId ? input.userId : input.user?.id
    const decodedPlaylistId = OptionalHashId.parse(input.id)
    const decodedOwnerId = OptionalHashId.parse(userId)
    const user = userMetadataFromSDK(input.user)
    if (!decodedPlaylistId || !decodedOwnerId || !user) {
      return undefined
    }

    const access = input.access ?? { stream: true, download: true }
    const newCollection: UserCollectionMetadata = {
      variant: Variant.USER_GENERATED,
      is_album: input.isAlbum ?? false,
      track_count: input.trackCount ?? 0,
      repost_count: input.repostCount ?? 0,
      permalink: input.permalink ?? '',
      playlist_name: input.playlistName ?? '',
      access: { stream: access.stream, download: access.download },
      playlist_id: decodedPlaylistId,
      playlist_owner_id: decodedOwnerId,
      artwork: collectionArtworkFromSDK(input.artwork),
      playlist_contents: {
        track_ids: transformAndCleanList(
          input.playlistContents ?? [],
          addedTimestampToPlaylistTrackId
        )
      },
      user,
      save_count: input.favoriteCount ?? 0,
      release_date:
        'releaseDate' in input && input.releaseDate
          ? dayjs.utc(input.releaseDate).local().toString()
          : null,
      artists:
        'artists' in input && input.artists
          ? transformAndCleanList(
              input.artists as object[],
              resourceContributorFromSDK
            )
          : null,
      copyright_line:
        'copyrightLine' in input && input.copyrightLine
          ? (snakecaseKeys(
              input.copyrightLine as Record<string, unknown>
            ) as Copyright)
          : null,
      cover_art_cids:
        'coverArtCids' in input && input.coverArtCids
          ? coverArtSizesCIDsFromSDK(input.coverArtCids as full.CoverArt)
          : null,
      followee_reposts: transformAndCleanList(
        'followeeReposts' in input ? (input.followeeReposts ?? []) : [],
        repostFromSDK
      ),
      followee_saves: transformAndCleanList(
        'followeeFavorites' in input ? (input.followeeFavorites ?? []) : [],
        favoriteFromSDK
      ),
      producer_copyright_line:
        'producerCopyrightLine' in input && input.producerCopyrightLine
          ? (snakecaseKeys(
              input.producerCopyrightLine as Record<string, unknown>
            ) as Copyright)
          : null,
      stream_conditions:
        'streamConditions' in input && input.streamConditions
          ? accessConditionsFromSDK(input.streamConditions as full.AccessGate)
          : null,
      tracks: transformAndCleanList(
        ('tracks' in input ? (input.tracks ?? []) : []) as Parameters<
          typeof userTrackMetadataFromSDK
        >[0][],
        userTrackMetadataFromSDK
      ),
      cover_art: 'coverArt' in input ? (input.coverArt ?? null) : null,
      cover_art_sizes:
        'coverArtSizes' in input ? (input.coverArtSizes ?? null) : null,
      description: input.description ?? null,
      blocknumber: 'blocknumber' in input ? (input.blocknumber ?? 0) : 0,
      has_current_user_reposted:
        'hasCurrentUserReposted' in input
          ? (input.hasCurrentUserReposted ?? false)
          : false,
      has_current_user_saved:
        'hasCurrentUserSaved' in input
          ? (input.hasCurrentUserSaved ?? false)
          : false,
      is_delete: 'isDelete' in input ? (input.isDelete ?? false) : false,
      is_private: 'isPrivate' in input ? (input.isPrivate ?? false) : false,
      created_at:
        'createdAt' in input && input.createdAt
          ? dayjs(input.createdAt).toISOString()
          : '',
      updated_at:
        'updatedAt' in input && input.updatedAt
          ? dayjs(input.updatedAt).toISOString()
          : '',
      is_scheduled_release:
        'isScheduledRelease' in input
          ? (input.isScheduledRelease ?? false)
          : false,
      is_stream_gated:
        'isStreamGated' in input ? (input.isStreamGated ?? false) : false,
      upc: input.upc ?? null,
      ddex_app: input.ddexApp ?? null,
      ddex_release_ids:
        (input as { ddexReleaseIds?: unknown }).ddexReleaseIds ?? null,
      parental_warning_type:
        (input as { parentalWarningType?: string }).parentalWarningType ?? null
    }

    return newCollection
  } catch {
    return undefined
  }
}

export const accountCollectionFromSDK = (
  input: full.AccountCollection
): AccountCollection | undefined => {
  const playlistId = OptionalHashId.parse(input.id)
  const userId = OptionalHashId.parse(input.user.id)
  if (!playlistId || !userId) {
    return undefined
  }

  return {
    id: playlistId,
    is_album: input.isAlbum,
    name: input.name,
    permalink: input.permalink,
    user: {
      id: userId,
      handle: input.user.handle,
      is_deactivated: !!input.user.isDeactivated
    }
  }
}

export const playlistMetadataForCreateWithSDK = (
  input: Collection | PlaylistValues
): CreatePlaylistMetadata => {
  return {
    playlistName: input.playlist_name ?? '',
    description: input.description ?? '',
    isPrivate: input.is_private ?? false,
    releaseDate: input.release_date ? new Date(input.release_date) : undefined,
    ddexReleaseIds: input.ddex_release_ids ?? null,
    ddexApp: input.ddex_app ?? '',
    upc: input.upc ?? '',
    artists: input.artists ?? null,
    copyrightLine: input.copyright_line ?? null,
    producerCopyrightLine: input.producer_copyright_line ?? null,
    parentalWarningType: input.parental_warning_type ?? null,
    ...('cover_art_sizes' in input
      ? {
          coverArtCid: input.cover_art_sizes ?? '',
          isImageAutogenerated: input.is_image_autogenerated ?? false
        }
      : {})
  }
}

export const playlistMetadataForUpdateWithSDK = (
  input: Collection
): UpdatePlaylistRequest['metadata'] => {
  return {
    ...playlistMetadataForCreateWithSDK(input),
    playlistContents: input.playlist_contents
      ? input.playlist_contents.track_ids.map((t) => ({
          timestamp: t.time,
          trackId: Id.parse(t.track),
          metadataTimestamp: t.metadata_time
        }))
      : undefined,
    playlistName: input.playlist_name ?? '',
    description: input.description ?? '',
    coverArtCid: input.cover_art_sizes ?? '',
    isPrivate: input.is_private ?? false
  }
}

export const albumMetadataForCreateWithSDK = (
  input: Collection | AlbumValues
): CreateAlbumMetadata => {
  return {
    streamConditions:
      input.stream_conditions && 'usdc_purchase' in input.stream_conditions
        ? {
            usdcPurchase: input.stream_conditions.usdc_purchase
          }
        : null,
    isStreamGated: input.is_stream_gated ?? false,
    isScheduledRelease: input.is_scheduled_release ?? false,
    albumName: input.playlist_name ?? '',
    description: input.description ?? '',
    license: input.ddex_app ?? '',
    releaseDate: input.release_date ? new Date(input.release_date) : undefined,
    ddexReleaseIds: input.ddex_release_ids ?? null,
    ddexApp: input.ddex_app ?? '',
    upc: input.upc ?? '',
    artists: input.artists ?? null,
    copyrightLine: input.copyright_line ?? null,
    producerCopyrightLine: input.producer_copyright_line ?? null,
    parentalWarningType: input.parental_warning_type ?? null,
    isPrivate: input.is_private ?? false
  }
}

export const albumMetadataForUpdateWithSDK = (
  input: Collection
): UpdateAlbumRequest['metadata'] => {
  return {
    ...albumMetadataForCreateWithSDK(input),
    playlistContents: input.playlist_contents
      ? input.playlist_contents.track_ids.map((t) => ({
          timestamp: t.time,
          trackId: Id.parse(t.track),
          metadataTimestamp: t.metadata_time
        }))
      : undefined
  } as UpdateAlbumRequest['metadata']
}
