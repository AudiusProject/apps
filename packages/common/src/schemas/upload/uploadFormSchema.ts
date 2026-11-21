import { Mood, NativeFile, MAX_DESCRIPTION_LENGTH } from '@audius/sdk'
import { z } from 'zod'

import { imageBlank } from '~/assets'
import { Collection } from '~/models'
import { TrackForEdit, TrackForUpload } from '~/store/upload/types'

const messages = {
  artworkRequiredError: 'Artwork is required.',
  genreRequiredError: 'Genre is required.',
  track: {
    titleRequiredError: 'Your track must have a name.'
  },
  playlist: {
    nameRequiredError: 'Your playlist must have a name.'
  },
  album: {
    nameRequiredError: 'Your album must have a name.'
  }
}

const FollowGatedConditionsSchema = z
  .object({
    follow_user_id: z.number()
  })
  .strict()

const TokenGatedConditionsSchema = z
  .object({
    token_gate: z.object({
      token_mint: z.string(),
      token_amount: z.number().positive().min(1)
    })
  })
  .strict()

const PaymentSplitSchema = z.object({
  user_id: z.number(),
  percentage: z.number().min(0).max(100),
  payout_wallet: z.string().optional(),
  amount: z.number().nonnegative().optional(),
  eth_wallet: z.optional(z.string())
})

const USDCPurchaseConditionsSchema = z
  .object({
    usdc_purchase: z.object({
      price: z.number().positive(),
      splits: z.array(PaymentSplitSchema).default([])
    })
  })
  .strict()

const GenreSchema = z
  .string()
  .min(1, { message: messages.genreRequiredError })
  .max(100)
  .nullable()
  .refine((val) => val !== null && val.length > 0, {
    message: messages.genreRequiredError
  })

const MoodSchema = z
  .enum(Object.values(Mood) as [Mood, ...Mood[]])
  .nullable()
  .optional()

const DDEXResourceContributor = z
  .object({
    name: z.string(),
    roles: z.array(z.string()),
    sequence_number: z.optional(z.number())
  })
  .strict()

const DDEXCopyright = z
  .object({
    year: z.string(),
    text: z.string()
  })
  .strict()

const DDEXRightsController = z
  .object({
    name: z.string(),
    roles: z.array(z.string()),
    rights_share_unknown: z.optional(z.string())
  })
  .strict()

const premiumMetadataSchema = z.object({
  is_stream_gated: z.optional(z.boolean()).nullable(),
  stream_conditions: z
    .optional(
      z.union([
        FollowGatedConditionsSchema,
        USDCPurchaseConditionsSchema,
        TokenGatedConditionsSchema
      ])
    )
    .nullable(),
  is_download_gated: z.optional(z.boolean()).nullable(),
  download_conditions: z
    .optional(
      z.union([
        FollowGatedConditionsSchema,
        USDCPurchaseConditionsSchema,
        TokenGatedConditionsSchema
      ])
    )
    .nullable()
})

const hiddenMetadataSchema = z.object({
  is_unlisted: z.optional(z.boolean()),
  field_visibility: z.optional(
    z.object({
      mood: z.optional(z.boolean()),
      tags: z.optional(z.boolean()),
      genre: z.optional(z.boolean()),
      share: z.optional(z.boolean()),
      play_count: z.optional(z.boolean()),
      remixes: z.optional(z.boolean())
    })
  )
})

const createSdkSchema = () =>
  z
    .object({
      track_id: z.optional(z.number()).nullable(),
      allowed_api_keys: z.optional(z.array(z.string())).nullable(),
      collaborators: z.optional(
        z.array(z.object({ user_id: z.number() }).passthrough()).nullable()
      ),
      description: z
        .optional(z.string().max(MAX_DESCRIPTION_LENGTH))
        .nullable(),

      genre: GenreSchema,
      isrc: z.optional(z.string().nullable()),
      is_scheduled_release: z.optional(z.boolean()),
      iswc: z.optional(z.string().nullable()),
      license: z.optional(z.string().nullable()),
      mood: MoodSchema,
      release_date: z.optional(z.string()).nullable(),
      remix_of: z.optional(
        z
          .object({
            tracks: z
              .array(
                z.object({
                  parent_track_id: z.number()
                })
              )
              .min(1)
          })
          .strict()
          .nullable()
      ),
      tags: z.optional(z.string()).nullable(),
      title: z.string({
        required_error: messages.track.titleRequiredError
      }),
      is_downloadable: z.optional(z.boolean()),
      is_original_available: z.optional(z.boolean()),
      ddex_release_ids: z.optional(z.record(z.string()).nullable()),
      artists: z.optional(z.array(DDEXResourceContributor).nullable()),
      resourceContributors: z.optional(
        z.array(DDEXResourceContributor).nullable()
      ),
      indirectResourceContributors: z.optional(
        z.array(DDEXResourceContributor).nullable()
      ),
      rightsController: z.optional(DDEXRightsController).nullable(),
      copyrightLine: z.optional(DDEXCopyright.nullable()),
      producerCopyrightLine: z.optional(DDEXCopyright.nullable()),
      parentalWarningType: z.optional(z.string().nullable()),
      bpm: z.optional(z.number().nullable()),
      musicalKey: z.optional(z.string().nullable())
    })
    .merge(premiumMetadataSchema)
    .merge(hiddenMetadataSchema)

const TrackMetadataSchema = createSdkSchema().merge(
  z.object({
    artwork: z
      .object({
        url: z.string().optional()
      })
      .nullable()
  })
)

export const TrackMetadataFormSchema = TrackMetadataSchema.refine(
  (form) => form.artwork?.url != null,
  {
    message: messages.artworkRequiredError,
    path: ['artwork']
  }
)

const CollectionTrackMetadataSchema = TrackMetadataSchema.pick({
  title: true,
  track_id: true
})

export const createCollectionSchema = (collectionType: 'playlist' | 'album') =>
  z
    .object({
      artwork: z
        .object({
          url: collectionType === 'album' ? z.string() : z.string().optional()
        })
        .nullable(),
      playlist_name: z.string({
        required_error: messages[collectionType].nameRequiredError
      }),
      description: z.optional(z.string().max(1000)),
      release_date: z.optional(z.string()).nullable(),
      is_scheduled_release: z.optional(z.boolean()),
      trackDetails: z.optional(
        z.object({
          genre: z.optional(GenreSchema),
          mood: MoodSchema,
          tags: z.optional(z.string())
        })
      ),
      is_private: z.optional(z.boolean()),
      is_album: z.literal(collectionType === 'album'),
      tracks: z.array(z.object({ metadata: CollectionTrackMetadataSchema })),
      ddex_release_ids: z.optional(z.record(z.string()).nullable()),
      artists: z.optional(z.array(DDEXResourceContributor).nullable()),
      copyrightLine: z.optional(DDEXCopyright.nullable()),
      producerCopyrightLine: z.optional(DDEXCopyright.nullable()),
      parentalWarningType: z.optional(z.string().nullable()),
      is_downloadable: z.optional(z.boolean()),
      isUpload: z.optional(z.boolean())
    })
    .merge(
      premiumMetadataSchema.extend({
        stream_conditions: z
          .intersection(
            USDCPurchaseConditionsSchema,
            z.object({
              usdc_purchase: z.object({
                albumTrackPrice: z.optional(z.number().nullable())
              })
            })
          )
          .optional()
          .nullable()
      })
    )
    .merge(hiddenMetadataSchema)
    .superRefine((data, ctx) => {
      if (collectionType === 'album') {
        if (!data.artwork?.url || data.artwork.url === imageBlank) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.artworkRequiredError,
            path: ['artwork']
          })
        }
      }
      // For playlists, artwork is only required if the playlist is public (not private)
      else if (collectionType === 'playlist') {
        if (
          !data.is_private &&
          (!data.artwork?.url || data.artwork.url === imageBlank)
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: messages.artworkRequiredError,
            path: ['artwork']
          })
        }
      }
    })

type UnvalidatedCollectionMetadata = {
  playlist_id?: number
  artwork:
    | {
        file: File | NativeFile
        source?: string
      }
    | { url: string }
    | null
  tracks: (TrackForUpload | TrackForEdit)[]
  playlist_contents?: Collection['playlist_contents']
  upc?: string
  license?: string
  ddex_app?: string
  copyright_line?: Collection['copyright_line']
  producer_copyright_line?: Collection['producer_copyright_line']
  parental_warning_type?: Collection['parental_warning_type']
}

export const PlaylistSchema = createCollectionSchema('playlist')
export type PlaylistValues = z.input<typeof PlaylistSchema> &
  UnvalidatedCollectionMetadata

export const AlbumSchema = createCollectionSchema('album')
export type AlbumValues = z.input<typeof AlbumSchema> &
  UnvalidatedCollectionMetadata

export type CollectionValues = PlaylistValues | AlbumValues
