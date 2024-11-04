import { WalletAdapter } from '@solana/wallet-adapter-base'
import { z } from 'zod'

import { PublicKeySchema } from '../../services/Solana'
import { DDEXResourceContributor, DDEXCopyright } from '../../types/DDEX'
import { AudioFile, ImageFile } from '../../types/File'
import { Genre } from '../../types/Genre'
import { HashId } from '../../types/HashId'
import { Mood } from '../../types/Mood'
import {
  createUploadTrackMetadataSchema,
  USDCPurchaseConditions
} from '../tracks/types'

export const getAlbumSchema = z.object({
  userId: HashId.optional(),
  albumId: HashId
})

export type getAlbumRequest = z.input<typeof getAlbumSchema>

export const getAlbumsSchema = z.object({
  userId: HashId.optional(),
  id: z.array(HashId)
})

export type getAlbumsRequest = z.input<typeof getAlbumsSchema>

export const getAlbumTracksSchema = z.object({
  albumId: HashId
})

export type getAlbumTracksRequest = z.input<typeof getAlbumTracksSchema>

export const createUploadAlbumMetadataSchema = () =>
  z
    .object({
      albumName: z.string(),
      description: z.optional(z.string().max(1000)),
      genre: z.enum(Object.values(Genre) as [Genre, ...Genre[]]),
      license: z.optional(z.string()),
      mood: z.optional(z.enum(Object.values(Mood) as [Mood, ...Mood[]])),
      releaseDate: z.optional(
        z.date().max(new Date(), { message: 'should not be in the future' })
      ),
      ddexReleaseIds: z.optional(z.record(z.string()).nullable()),
      ddexApp: z.optional(z.string()),
      tags: z.optional(z.string()),
      upc: z.optional(z.string()),
      artists: z.optional(z.array(DDEXResourceContributor).nullable()),
      copyrightLine: z.optional(DDEXCopyright.nullable()),
      producerCopyrightLine: z.optional(DDEXCopyright.nullable()),
      parentalWarningType: z.optional(z.string().nullable()),
      isStreamGated: z.optional(z.boolean()),
      streamConditions: z.optional(USDCPurchaseConditions).nullable(),
      isDownloadGated: z.optional(z.boolean()),
      downloadConditions: z.optional(USDCPurchaseConditions).nullable()
    })
    .strict()

export type AlbumMetadata = z.input<
  ReturnType<typeof createUploadAlbumMetadataSchema>
>

const createAlbumTrackMetadataSchema = () =>
  createUploadTrackMetadataSchema().partial({
    genre: true,
    mood: true,
    tags: true,
    isStreamGated: true,
    streamConditions: true,
    isDownloadable: true,
    downloadConditions: true
  })

export const createUploadAlbumSchema = () =>
  z
    .object({
      userId: HashId,
      coverArtFile: ImageFile,
      metadata: createUploadAlbumMetadataSchema(),
      onProgress: z.optional(z.function().args(z.number())),
      /**
       * Track metadata is populated from the album if fields are missing
       */
      trackMetadatas: z.array(createAlbumTrackMetadataSchema()),
      trackFiles: z.array(AudioFile)
    })
    .strict()

export type UploadAlbumRequest = z.input<
  ReturnType<typeof createUploadAlbumSchema>
>

export const createUpdateAlbumSchema = () =>
  z
    .object({
      userId: HashId,
      albumId: HashId,
      coverArtFile: z.optional(ImageFile),
      metadata: createUploadAlbumMetadataSchema().partial(),
      onProgress: z.optional(z.function().args(z.number()))
    })
    .strict()

export type UpdateAlbumRequest = z.input<
  ReturnType<typeof createUpdateAlbumSchema>
>

export const DeleteAlbumSchema = z
  .object({
    userId: HashId,
    albumId: HashId
  })
  .strict()

export type DeleteAlbumRequest = z.input<typeof DeleteAlbumSchema>

export const FavoriteAlbumSchema = z
  .object({
    userId: HashId,
    albumId: HashId,
    metadata: z.optional(
      z.object({
        /**
         * Is this a save of a repost? Used to dispatch notifications
         * when a user favorites another user's repost
         */
        isSaveOfRepost: z.boolean()
      })
    )
  })
  .strict()

export type FavoriteAlbumRequest = z.input<typeof FavoriteAlbumSchema>

export const UnfavoriteAlbumSchema = z
  .object({
    userId: HashId,
    albumId: HashId
  })
  .strict()

export type UnfavoriteAlbumRequest = z.input<typeof UnfavoriteAlbumSchema>

export const RepostAlbumSchema = z
  .object({
    userId: HashId,
    albumId: HashId,
    metadata: z.optional(
      z.object({
        /**
         * Is this a repost of a repost? Used to dispatch notifications
         * when a user favorites another user's repost
         */
        isRepostOfRepost: z.boolean()
      })
    )
  })
  .strict()

export type RepostAlbumRequest = z.input<typeof RepostAlbumSchema>

export const UnrepostAlbumSchema = z
  .object({
    userId: HashId,
    albumId: HashId
  })
  .strict()

export type UnrepostAlbumRequest = z.input<typeof UnrepostAlbumSchema>

const PurchaseAlbumSchemaBase = z.object({
  /** The ID of the user purchasing the album. */
  userId: HashId,
  /** The ID of the album to purchase. */
  albumId: HashId,
  /**
   * The price of the album at the time of purchase (in dollars if number, USDC if bigint).
   * Used to check against current album price in case it changed,
   * effectively setting a "max price" for the purchase.
   */
  price: z.union([z.number().min(0), z.bigint().min(BigInt(0))]),
  /** Any extra amount the user wants to donate (in dollars if number, USDC if bigint) */
  extraAmount: z
    .union([z.number().min(0), z.bigint().min(BigInt(0))])
    .optional(),
  /** Whether to include the staking system as a recipient */
  includeNetworkCut: z.boolean().optional()
})

export const GetPurchaseAlbumInstructionsSchema = z
  .object({})
  .merge(PurchaseAlbumSchemaBase)

export type GetPurchaseAlbumInstructionsRequest = z.input<
  typeof GetPurchaseAlbumInstructionsSchema
>

export const PurchaseAlbumSchema = z
  .object({
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    walletAdapter: z
      .custom<Pick<WalletAdapter, 'publicKey' | 'sendTransaction'>>()
      .optional(),
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    wallet: PublicKeySchema.optional()
  })
  .merge(PurchaseAlbumSchemaBase)
  .strict()

export type PurchaseAlbumRequest = z.input<typeof PurchaseAlbumSchema>
