import type { WalletAdapter } from '@solana/wallet-adapter-base'
import { z } from 'zod'

import { PublicKeySchema } from '../../services/Solana'
import { ProgressHandler } from '../../services/Storage/types'
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

import { MAX_DESCRIPTION_LENGTH } from './constants'

const messages = {
  titleRequiredError: 'Your track must have a name',
  artworkRequiredError: 'Artwork is required',
  genreRequiredError: 'Genre is required',
  genreAllError: 'Genre cannot be set to "All Genres"'
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
    followUserId: z.number()
  })
  .strict()

export const TipGatedConditions = z
  .object({
    tipUserId: z.number()
  })
  .strict()

export const TokenGatedConditions = z
  .object({
    tokenGate: z.object({
      tokenMint: z.string(),
      tokenAmount: z.number()
    })
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

export const UploadTrackMetadataSchema = z.object({
  trackId: z.optional(HashId),
  aiAttributionUserId: z.optional(HashId),
  description: z.optional(z.string().max(MAX_DESCRIPTION_LENGTH)),
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
    })
    .refine((val) => val !== Genre.ALL, {
      message: messages.genreAllError
    }),
  isrc: z.optional(z.string().nullable()),
  isUnlisted: z.optional(z.boolean()),
  iswc: z.optional(z.string().nullable()),
  license: z.optional(z.string().nullable()),
  mood: z.optional(z.enum(Object.values(Mood) as [Mood, ...Mood[]])).nullable(),
  isStreamGated: z.optional(z.boolean()),
  streamConditions: z
    .optional(
      z.union([
        CollectibleGatedConditions,
        FollowGatedConditions,
        TipGatedConditions,
        USDCPurchaseConditions,
        TokenGatedConditions
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
        USDCPurchaseConditions,
        TokenGatedConditions
      ])
    )
    .nullable(),
  releaseDate: z.optional(z.date()),
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
        .enum(Object.values(StemCategory) as [StemCategory, ...StemCategory[]])
        .default(StemCategory.OTHER),
      parentTrackId: HashId
    })
  ),
  tags: z.optional(z.string()),
  title: z.string({
    required_error: messages.titleRequiredError
  }),
  duration: z.optional(z.number()),
  previewStartSeconds: z.optional(z.number()),
  placementHosts: z.optional(z.string()),
  audioUploadId: z.optional(z.string()),
  trackCid: z.optional(z.string()),
  previewCid: z.optional(z.string()),
  origFileCid: z.optional(z.string()),
  origFilename: z.optional(z.string()),
  isDownloadable: z.optional(z.boolean()),
  isOriginalAvailable: z.optional(z.boolean()),
  ddexReleaseIds: z.optional(z.record(z.string()).nullable()),
  ddexApp: z.optional(z.string()),
  artists: z.optional(z.array(DDEXResourceContributor)).nullable(),
  resourceContributors: z.optional(z.array(DDEXResourceContributor).nullable()),
  indirectResourceContributors: z.optional(
    z.array(DDEXResourceContributor).nullable()
  ),
  rightsController: z.optional(DDEXRightsController.nullable()),
  copyrightLine: z.optional(DDEXCopyright.nullable()),
  producerCopyrightLine: z.optional(DDEXCopyright.nullable()),
  parentalWarningType: z.optional(z.string().nullable()),
  bpm: z.optional(z.number().nullable()),
  isCustomBpm: z.optional(z.boolean()),
  musicalKey: z.optional(z.string().nullable()),
  isCustomMusicalKey: z.optional(z.boolean()),
  audioAnalysisErrorCount: z.optional(z.number()),
  commentsDisabled: z.optional(z.boolean()),
  isScheduledRelease: z.optional(z.boolean())
})

export type TrackMetadata = z.input<typeof UploadTrackMetadataSchema>

export const UploadTrackSchema = z
  .object({
    userId: HashId,
    coverArtFile: ImageFile,
    metadata: UploadTrackMetadataSchema.strict(),
    onProgress: z.optional(z.function()),
    trackFile: AudioFile
  })
  .strict()

export type UploadTrackRequest = Omit<
  z.input<typeof UploadTrackSchema>,
  'onProgress'
> & {
  // Typing function manually because z.function() does not
  // support argument names
  onProgress?: ProgressHandler
}

export const UploadTrackFilesSchema = z
  .object({
    userId: HashId,
    coverArtFile: z.optional(ImageFile),
    metadata: UploadTrackMetadataSchema.extend({
      genre: z.optional(z.enum(Object.values(Genre) as [Genre, ...Genre[]]))
    }).strict(),
    onProgress: z.optional(z.function()),
    trackFile: AudioFile
  })
  .strict()

export type TrackFilesMetadata = z.input<
  typeof UploadTrackFilesSchema
>['metadata']

export type UploadTrackFilesRequest = Omit<
  z.input<typeof UploadTrackFilesSchema>,
  'onProgress'
> & {
  // Typing function manually because z.function() does not
  // support argument names
  onProgress?: ProgressHandler
}

export const UpdateTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId,
    metadata: UploadTrackMetadataSchema.strict().partial(),
    generatePreview: z.optional(z.boolean()),
    coverArtFile: z.optional(ImageFile),
    onProgress: z.optional(z.function())
  })
  .strict()

export type UpdateTrackRequest = Omit<
  z.input<typeof UpdateTrackSchema>,
  'onProgress'
> & {
  onProgress?: ProgressHandler
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

export const ShareTrackSchema = z
  .object({
    userId: HashId,
    trackId: HashId
  })
  .strict()

export type ShareTrackRequest = z.input<typeof ShareTrackSchema>

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
    .optional(),
  /** Whether to include the staking system as a recipient */
  includeNetworkCut: z.boolean().optional()
})

export const GetPurchaseTrackInstructionsSchema = z
  .object({})
  .merge(PurchaseTrackSchemaBase)

export type GetPurchaseTrackInstructionsRequest = z.input<
  typeof GetPurchaseTrackInstructionsSchema
>

export const PurchaseTrackSchema = z
  .object({
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    walletAdapter: z
      .custom<Pick<WalletAdapter, 'publicKey' | 'sendTransaction'>>()
      .optional(),
    /** A wallet to use to purchase (defaults to the authed user's user bank if not specified) */
    wallet: PublicKeySchema.optional()
  })
  .merge(PurchaseTrackSchemaBase)
  .strict()

export type PurchaseTrackRequest = z.input<typeof PurchaseTrackSchema>
