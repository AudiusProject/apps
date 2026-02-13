import {
  CreateAlbumMetadata,
  CreatePlaylistMetadata,
  full,
  Id,
  OptionalHashId,
  UpdateAlbumRequest,
  UpdatePlaylistRequest
} from '@audius/sdk'
import dayjs from 'dayjs'
import { omit } from 'lodash'
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

export const userCollectionMetadataFromSDK = (
  input:
    | full.PlaylistFullWithoutTracks
    | full.SearchPlaylistFull
    | full.PlaylistFull
): UserCollectionMetadata | undefined => {
  try {
    const decodedPlaylistId = OptionalHashId.parse(input.id)
    const decodedOwnerId = OptionalHashId.parse(input.userId ?? input.user.id)
    const user = userMetadataFromSDK(input.user)
    if (!decodedPlaylistId || !decodedOwnerId || !user) {
      return undefined
    }

    const newCollection: UserCollectionMetadata = {
      // Fields from API that are omitted in this model
      ...omit(snakecaseKeys(input), [
        'id',
        'user_id',
        'followee_favorites',
        'favorite_count',
        'added_timestamps'
      ]),
      artwork: input.artwork
        ? {
            '150x150': input.artwork._150x150,
            '480x480': input.artwork._480x480,
            '1000x1000': input.artwork._1000x1000,
            mirrors: input.artwork.mirrors
          }
        : {},
      variant: Variant.USER_GENERATED,

      // Conversions
      playlist_id: decodedPlaylistId,
      playlist_owner_id: decodedOwnerId,
      // TODO: Remove this when api is fixed to return UTC dates
      release_date: input.releaseDate
        ? dayjs.utc(input.releaseDate).local().toString()
        : null,

      // Nested Transformed Fields
      artists: input.artists
        ? transformAndCleanList(input.artists, resourceContributorFromSDK)
        : null,
      copyright_line: input.copyrightLine
        ? (snakecaseKeys(input.copyrightLine) as Copyright)
        : null,
      cover_art_cids: input.coverArtCids
        ? coverArtSizesCIDsFromSDK(input.coverArtCids)
        : null,
      followee_reposts: transformAndCleanList(
        input.followeeReposts,
        repostFromSDK
      ),
      followee_saves: transformAndCleanList(
        input.followeeFavorites,
        favoriteFromSDK
      ),
      playlist_contents: {
        track_ids: transformAndCleanList(
          input.playlistContents,
          addedTimestampToPlaylistTrackId
        )
      },
      producer_copyright_line: input.producerCopyrightLine
        ? (snakecaseKeys(input.producerCopyrightLine) as Copyright)
        : null,
      stream_conditions: input.streamConditions
        ? accessConditionsFromSDK(input.streamConditions)
        : null,
      tracks: transformAndCleanList(input.tracks, userTrackMetadataFromSDK),
      user,

      // Retypes / Renames
      save_count: input.favoriteCount,

      // Nullable fields
      cover_art: input.coverArt ?? null,
      cover_art_sizes: input.coverArtSizes ?? null,
      description: input.description ?? null
    }

    return newCollection
  } catch (e) {
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
