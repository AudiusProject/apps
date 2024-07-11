import type { WalletAdapter } from '@solana/wallet-adapter-base'
import { z } from 'zod'

import { PublicKeySchema } from '../../services/Solana'
import {
  DDEXResourceContributor,
  DDEXCopyright,
  DDEXRightsController
} from '../../types/DDEX'
import { AudioFile, ImageFile } from '../../types/File'
import { Genre } from '../../types/Genre'
import { HashId } from '../../types/HashId'
import { Mood } from '../../types/Mood'
import { StemCategory } from '../../types/StemCategory'

const messages = {
  titleRequiredError: 'Your track must have a name',
  artworkRequiredError: 'Artwork is required',
  genreRequiredError: 'Genre is required',
  invalidReleaseDateError: 'Release date should not be in the future'
}

export const EthCollectibleGatedConditions = z
  .object({
    chain: z.literal('eth'),
    address: z.string(),
    standard: z.union([z.literal('ERC721'), z.literal('ERC1155')]),
    name: z.string(),
    slug: z.string(),
    imageUrl: z.optional(z.string()),
    externalLink: z.optional(z.string()).nullable()
  })
  .strict()

export const SolCollectibleGatedConditions = z
  .object({
    chain: z.literal('sol'),
    address: z.string(),
    name: z.string(),
    imageUrl: z.optional(z.string()),
    externalLink: z.optional(z.string()).nullable()
  })
  .strict()

export const CollectibleGatedConditions = z
  .object({
    nftCollection: z.optional(
      z.union([EthCollectibleGatedConditions, SolCollectibleGatedConditions])
    )
  })
  .strict()

export const FollowGatedConditions = z
  .object({
    followUserId: HashId
  })
  .strict()

export const TipGatedConditions = z
  .object({
    tipUserId: HashId
  })
  .strict()

export const USDCPurchaseConditions = z
  .object({
    usdcPurchase: z.object({
      price: z.number().positive(),
      splits: z.any()
    })
  })
  .strict()

export const createUploadTrackMetadataSchema = () =>
  z.object({
    aiAttributionUserId: z.optional(HashId),
    description: z.optional(z.string().max(1000)),
    fieldVisibility: z.optional(
      z.object({
        mood: z.optional(z.boolean()),
        tags: z.optional(z.boolean()),
        genre: z.optional(z.boolean()),
        share: z.optional(z.boolean()),
        playCount: z.optional(z.boolean()),
        remixes: z.optional(z.boolean())
      })
    ),
    genre: z
      .enum(Object.values(Genre) as [Genre, ...Genre[]])
      .nullable()
      .refine((val) => val !== null, {
        message: messages.genreRequiredError
      }),
    isrc: z.optional(z.string().nullable()),
    isUnlisted: z.optional(z.boolean()),
    iswc: z.optional(z.string().nullable()),
    license: z.optional(z.string().nullable()),
    mood: z
      .optional(z.enum(Object.values(Mood) as [Mood, ...Mood[]]))
      .nullable(),
    isStreamGated: z.optional(z.boolean()),
    streamConditions: z
      .optional(
        z.union([
          CollectibleGatedConditions,
          FollowGatedConditions,
          TipGatedConditions,
          USDCPurchaseConditions
        ])
      )
      .nullable(),
    isDownloadGated: z.optional(z.boolean()),
    downloadConditions: z
      .optional(
        z.union([
          CollectibleGatedConditions,
          FollowGatedConditions,
          TipGatedConditions,
          USDCPurchaseConditions
        ])
      )
      .nullable(),
    releaseDate: z.optional(
      z.date().max(new Date(), { message: messages.invalidReleaseDateError })
    ),
    remixOf: z.optional(
      z
        .object({
          tracks: z
            .array(
              z.object({
                parentTrackId: HashId
              })
            )
            .min(1)
        })
        .strict()
    ),
    stemOf: z.optional(
      z.object({
        category: z
          .enum(
            Object.values(StemCategory) as [StemCategory, ...StemCategory[]]
          )
          .default(StemCategory.OTHER),
        parentTrackId: HashId
      })
    ),
    tags: z.optional(z.string()),
    title: z.string({
      required_error: messages.titleRequiredError
    }),
    previewStartSeconds: z.optional(z.number()),
    placementHosts: z.optional(z.string()),
    audioUploadId: z.optional(z.string()),
    previewCid: z.optional(z.string()),
    origFileCid: z.optional(z.string()),
    origFilename: z.optional(z.string()),
    isDownloadable: z.optional(z.boolean()),
    isOriginalAvailable: z.optional(z.boolean()),
    ddexReleaseIds: z.optional(z.record(z.string()).nullable()),
    artists: z.optional(z.array(DDEXResourceContributor)).nullable(),
    resourceContributors: z.optional(
      z.array(DDEXResourceContributor).nullable()
    ),
    indirectResourceContributors: z.optional(
      z.array(DDEXResourceContributor).nullable()
    ),
    rightsController: z.optional(DDEXRightsController.nullable()),
    copyrightLine: z.optional(DDEXCopyright.nullable()),
    producerCopyrightLine: z.optional(DDEXCopyright.nullable()),
    parentalWarningType: z.optional(z.string().nullable()),
    bpm: z.optional(z.number().nullable()),
    musicalKey: z.optional(z.string().nullable()),
    audioAnalysisErrorCount: z.optional(z.number())
  })

export type TrackMetadata = z.input<
  ReturnType<typeof createUploadTrackMetadataSchema>
>

export const createUploadTrackSchema = () =>
  z
    .object({
      userId: HashId,
      coverArtFile: ImageFile,
      metadata: createUploadTrackMetadataSchema().strict(),
      onProgress: z.optional(z.function().args(z.number())),
      trackFile: AudioFile
    })
    .strict()

export type UploadTrackRequest = Omit<
  z.input<ReturnType<typeof createUploadTrackSchema>>,
  'onProgress'
> & {
  // Typing function manually because z.function() does not
  // support argument names
  onProgress?: (progress: number) => void
}

export const createUpdateTrackSchema = () =>
  z
    .object({
      userId: HashId,
      trackId: HashId,
      metadata: createUploadTrackMetadataSchema().strict().partial(),
      transcodePreview: z.optional(z.boolean()),
      coverArtFile: z.optional(ImageFile),
      onProgress: z.optional(z.function().args(z.number()))
    })
    .strict()

export type UpdateTrackRequest = Omit<
  z.input<ReturnType<typeof createUpdateTrackSchema>>,
  'onProgress'
> & {
  onProgress?: (progress: number) => void
}

export const DeleteTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId
  })
  .strict()

export type DeleteTrackRequest = z.input<typeof DeleteTrackSchema>

export const FavoriteTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId,
    metadata: z.optional(
      z
        .object({
          /**
           * Is this a save of a repost? Used to dispatch notifications
           * when a user favorites another user's repost
           */
          isSaveOfRepost: z.boolean()
        })
        .strict()
    )
  })
  .strict()

export type FavoriteTrackRequest = z.input<typeof FavoriteTrackSchema>

export const UnfavoriteTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId
  })
  .strict()

export type UnfavoriteTrackRequest = z.input<typeof UnfavoriteTrackSchema>

export const RepostTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId,
    metadata: z.optional(
      z
        .object({
          /**
           * Is this a repost of a repost? Used to dispatch notifications
           * when a user favorites another user's repost
           */
          isRepostOfRepost: z.boolean()
        })
        .strict()
    )
  })
  .strict()

export type RepostTrackRequest = z.input<typeof RepostTrackSchema>

export const UnrepostTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId
  })
  .strict()

export type UnrepostTrackRequest = z.input<typeof UnrepostTrackSchema>

export const RecordTrackDownloadSchema = z
  .object({
    userId: HashId.optional(),
    trackId: HashId
  })
  .strict()

export type RecordTrackDownloadRequest = z.input<
  typeof RecordTrackDownloadSchema
>

const PurchaseTrackSchemaBase = z.object({
  /** The ID of the user purchasing the track. */
  userId: HashId,
  /** The ID of the track to purchase. */
  trackId: HashId,
  /**
   * The price of the track at the time of purchase (in dollars if number, USDC if bigint).
   * Used to check against current track price in case it changed,
   * effectively setting a "max price" for the purchase.
   */
  price: z.union([z.number().min(0), z.bigint().min(BigInt(0))]),
  /** Any extra amount the user wants to donate (in dollars if number, USDC if bigint) */
  extraAmount: z
    .union([z.number().min(0), z.bigint().min(BigInt(0))])
    .optional()
})

export const GetPurchaseTrackTransactionSchema = z
  .object({
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    wallet: PublicKeySchema.optional()
  })
  .merge(PurchaseTrackSchemaBase)
  .strict()

export type GetPurchaseTrackTransactionRequest = z.input<
  typeof GetPurchaseTrackTransactionSchema
>

export const PurchaseTrackSchema = z
  .object({
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    walletAdapter: z
      .custom<Pick<WalletAdapter, 'publicKey' | 'sendTransaction'>>()
      .optional()
  })
  .merge(PurchaseTrackSchemaBase)
  .strict()

export type PurchaseTrackRequest = z.input<typeof PurchaseTrackSchema>
