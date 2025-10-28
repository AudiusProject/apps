import { Genre, Mood, NativeFile, MAX_DESCRIPTION_LENGTH } from '@audius/sdk'
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

/** Same as SDK but snake-cased */
const FollowGatedConditionsSchema = z
  .object({
    follow_user_id: z.number()
  })
  .strict()

/** Same as SDK but snake-cased */
const TipGatedConditionsSchema = z
  .object({
    tip_user_id: z.number()
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

/** Same as SDK but snake-cased */
const USDCPurchaseConditionsSchema = z
  .object({
    usdc_purchase: z.object({
      price: z.number().positive(),
      splits: z.any()
    })
  })
  .strict()

/** Same as SDK. */
const GenreSchema = z
  .enum(Object.values(Genre) as [Genre, ...Genre[]])
  .nullable()
  .refine((val) => val !== null, {
    message: messages.genreRequiredError
  })

/** Same as SDK. */
const MoodSchema = z
  .optional(z.enum(Object.values(Mood) as [Mood, ...Mood[]]))
  .nullable()

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
        TipGatedConditionsSchema,
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
        TipGatedConditionsSchema,
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

// TODO: KJ - Need to update the schema in sdk and then import here
/**
 * Creates a schema for validating tracks to be uploaded.
 *
 * Used on the EditTrackForm of the upload page, for single/multiple
 * track uploads.
 *
 * Note that it doesn't produce the same type as that used by those
 * forms and their consumers - the form actually submits more data than
 * is validated here.
 * Note the differences between this and other schemas for tracks:
 * - This is snake cased, save for a few fields (remixOf, namely).
 * - IDs are numeric.
 * - No fields that are only knowable after upload.
 */
const createSdkSchema = () =>
  z
    .object({
      track_id: z.optional(z.number()).nullable(),
      allowed_api_keys: z.optional(z.array(z.string())).nullable(),
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

/**
 * This is not really used as it is, since we pick out the title only of it
 * for collections and make the artwork required for non-collections.
 *
 * It does produce a more "validated" correct type for the form but that
 * wasn't used anywhere.
 */
const TrackMetadataSchema = createSdkSchema().merge(
  z.object({
    artwork: z
      .object({
        url: z.string().optional()
      })
      .nullable()
  })
)

/**
 * This is what's actually used on the EditTrackForm.
 * It makes the artwork required from the TrackMetadataSchema.
 *
 * @see {@link TrackMetadataSchema}
 * @see {@link createSdkSchema}
 */
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

/**
 * Produces a schema that validates a collection metadata for upload.
 * Note the differences between this schema and the normal collection type:
 * - This one is snake cased.
 * - It has artwork (only validates the url, not the file for some reason).
 * - There's extra track details to be validated.
 * - The tracks are only validated for their titles.
 * - The release date can be in the future.
 */
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
                // Album uploads set a price for all tracks.
                // Note: this is made "required" via validation logic, set to optional here to avoid TS conflicts
                // but is also prefilled in the form component (USDCPurchaseFields)
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
      // For albums, artwork is always required
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

/**
 * Extra metadata on the collection that doesn't get validated to
 * the types that are used.
 * - Playlist ID isn't on the schema.
 * - Artwork is more than just a URL.
 * - Tracks are full TrackForUploads, not just titles.
 */
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
}

export const PlaylistSchema = createCollectionSchema('playlist')
export type PlaylistValues = z.input<typeof PlaylistSchema> &
  UnvalidatedCollectionMetadata

export const AlbumSchema = createCollectionSchema('album')
export type AlbumValues = z.input<typeof AlbumSchema> &
  UnvalidatedCollectionMetadata

/** Values produced by the collection form. */
export type CollectionValues = PlaylistValues | AlbumValues
