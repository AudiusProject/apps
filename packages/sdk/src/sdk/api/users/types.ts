import { z } from 'zod'

import { ProgressHandler } from '../../services/Storage/types'
import { EthAddressSchema } from '../../types/EthAddress'
import { ImageFile } from '../../types/File'
import { HashId } from '../../types/HashId'
import { SolanaAddressSchema } from '../../types/SolanaAddress'
import { getReaction, reactionsMap } from '../../utils/reactionsMap'

export const UserEventsSchema = z.object({
  referrer: z.optional(HashId),
  isMobileUser: z.optional(z.boolean())
})

export const CreateUserSchema = z.object({
  profilePictureFile: z.optional(ImageFile),
  coverArtFile: z.optional(ImageFile),
  onProgress: z.optional(z.function()),
  metadata: z
    .object({
      allowAiAttribution: z.optional(z.boolean()),
      bio: z.optional(z.string()),
      coverPhotoSizes: z.optional(z.string()),
      donation: z.optional(z.string()),
      handle: z.optional(z.string()),
      events: z.optional(UserEventsSchema),
      location: z.optional(z.string()),
      name: z.optional(z.string()),
      profilePictureSizes: z.optional(z.string()),
      splUsdcPayoutWallet: z.optional(z.string()),
      wallet: z.string(),
      website: z.optional(z.string())
    })
    .strict()
})

export type CreateUserRequest = Omit<
  z.input<typeof CreateUserSchema>,
  'onProgress'
> & {
  // Typing function manually because z.function() does not
  // support argument names
  onProgress?: (progress: number) => void
}

export const CreateAssociatedWalletsSchema = z.record(
  z.string(),
  z.object({
    signature: z.string()
  })
)

const CollectiblesMetadataSchema = z.union([
  z
    .object({
      order: z.array(z.string())
    })
    .catchall(z.object({})),
  z.null()
])

const PlaylistIdentifierSchema = z.object({
  type: z.literal('playlist'),
  playlist_id: z.number()
})

const ExplorePlaylistIdentifierSchema = z.object({
  type: z.literal('explore_playlist'),
  playlist_id: z.string()
})

const PlaylistLibraryIdentifierSchema = z.union([
  PlaylistIdentifierSchema,
  ExplorePlaylistIdentifierSchema
])

type PlaylistLibraryFolder = {
  id: string
  type: 'folder'
  name: string
  contents: Array<
    PlaylistLibraryFolder | z.infer<typeof PlaylistLibraryIdentifierSchema>
  >
}

const PlaylistLibraryFolderSchema: z.ZodType<PlaylistLibraryFolder> = z.object({
  id: z.string(),
  type: z.literal('folder'),
  name: z.string(),
  contents: z.array(
    z.lazy(() =>
      z.union([PlaylistLibraryFolderSchema, PlaylistLibraryIdentifierSchema])
    )
  )
})

const PlaylistLibrarySchema = z.object({
  contents: z.array(
    z.union([PlaylistLibraryFolderSchema, PlaylistLibraryIdentifierSchema])
  )
})

export const UpdateProfileSchema = z
  .object({
    userId: HashId,
    events: z.optional(UserEventsSchema),
    profilePictureFile: z.optional(ImageFile),
    coverArtFile: z.optional(ImageFile),
    onProgress: z.optional(z.function()),
    metadata: z
      .object({
        name: z.optional(z.string()),
        handle: z.optional(z.string()),
        bio: z.optional(z.string()),
        website: z.optional(z.string()),
        donation: z.optional(z.string()),
        location: z.optional(z.string()),
        profileType: z.optional(z.enum(['label']).nullable()),
        metadataMultihash: z.optional(z.string()),
        events: z.optional(UserEventsSchema),
        isDeactivated: z.optional(z.boolean()),
        artistPickTrackId: z.optional(HashId),
        allowAiAttribution: z.optional(z.boolean()),
        playlistLibrary: z.optional(PlaylistLibrarySchema),
        twitterHandle: z.optional(z.string()),
        instagramHandle: z.optional(z.string()),
        tiktokHandle: z.optional(z.string()),
        splUsdcPayoutWallet: z.optional(SolanaAddressSchema).nullable(),
        coinFlairMint: z.optional(z.string().nullable())
      })
      .strict()
  })
  .strict()

export type UpdateProfileRequest = Omit<
  z.input<typeof UpdateProfileSchema>,
  'onProgress'
> & {
  // Typing function manually because z.function() does not
  // support argument names
  onProgress?: ProgressHandler
}

export const FollowUserSchema = z
  .object({
    userId: HashId,
    followeeUserId: HashId
  })
  .strict()

export type FollowUserRequest = z.input<typeof FollowUserSchema>

export const UnfollowUserSchema = z
  .object({
    userId: HashId,
    followeeUserId: HashId
  })
  .strict()

export type UnfollowUserRequest = z.input<typeof UnfollowUserSchema>

export const SubscribeToUserSchema = z
  .object({
    userId: HashId,
    subscribeeUserId: HashId
  })
  .strict()

export type SubscribeToUserRequest = z.input<typeof SubscribeToUserSchema>

export const UnsubscribeFromUserSchema = z
  .object({
    userId: HashId,
    subscribeeUserId: HashId
  })
  .strict()

export type UnsubscribeFromUserRequest = z.input<
  typeof UnsubscribeFromUserSchema
>

export const SendTipSchema = z
  .object({
    amount: z.number().positive().int(),
    senderUserId: HashId,
    receiverUserId: HashId
  })
  .strict()

export type SendTipRequest = z.input<typeof SendTipSchema>

export type ReactionTypes = keyof typeof reactionsMap

const ReactionTypeSchema = z
  .custom<ReactionTypes>(
    (value) => {
      const validReactions = Object.keys(reactionsMap) as ReactionTypes[]
      return validReactions.includes(value as ReactionTypes)
    },
    {
      message: 'Invalid reaction type'
    }
  )
  .transform<number>((data, ctx) => {
    const value = getReaction(data)
    if (value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'reactionValue invalid'
      })
      return z.NEVER
    }
    return value
  })

export const SendTipReactionRequestSchema = z.object({
  userId: HashId,
  metadata: z.object({
    reactedTo: z.string().nonempty(),
    reactionValue: ReactionTypeSchema
  })
})

export type SendTipReactionRequest = z.input<
  typeof SendTipReactionRequestSchema
>

// Email-related types
export interface EmailRequest {
  emailOwnerUserId: number
  receivingUserId: number
  initialEmailEncryptionUuid: number
  granteeUserIds?: string[]
  email: string
}

export const EmailSchema = z.object({
  emailOwnerUserId: z.number(),
  receivingUserId: z.number(),
  initialEmailEncryptionUuid: z.number(),
  granteeUserIds: z.array(z.string()).optional(),
  email: z.string()
})

export const WalletSchema = z.discriminatedUnion('chain', [
  z.object({
    address: SolanaAddressSchema,
    chain: z.literal('sol')
  }),
  z.object({
    // Relaxing type here so we can pass in a string and use EthAddressSchema to validate at runtime
    address: z.string().pipe(EthAddressSchema),
    chain: z.literal('eth')
  })
])

export const AddAssociatedWalletSchema = z.object({
  userId: HashId,
  wallet: WalletSchema,
  signature: z.string()
})

export const RemoveAssociatedWalletSchema = z.object({
  userId: HashId,
  wallet: WalletSchema
})

export type AddAssociatedWalletRequest = z.input<
  typeof AddAssociatedWalletSchema
>

export type RemoveAssociatedWalletRequest = z.input<
  typeof RemoveAssociatedWalletSchema
>

export const UpdateCollectiblesSchema = z.object({
  userId: HashId,
  collectibles: CollectiblesMetadataSchema
})

export type UpdateCollectiblesRequest = z.input<typeof UpdateCollectiblesSchema>
