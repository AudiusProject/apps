import { wAUDIO } from '@audius/fixed-decimal'
import snakecaseKeys from 'snakecase-keys'

import { UninitializedEntityManagerError } from '../../errors'
import type { StorageService } from '../../services'
import { EmailEncryptionService } from '../../services/Encryption'
import {
  Action,
  AdvancedOptions,
  EntityManagerService,
  EntityType
} from '../../services/EntityManager/types'
import type { ClaimableTokensClient } from '../../services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient'
import type { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import { HashId } from '../../types/HashId'
import { generateMetadataCidV1 } from '../../utils/cid'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
import {
  Configuration,
  DownloadPurchasesAsCSVRequest,
  DownloadSalesAsCSVRequest,
  DownloadUSDCWithdrawalsAsCSVRequest,
  UsersApi as GeneratedUsersApi,
  type UserPlaylistLibrary
} from '../generated/default'
import * as runtime from '../generated/default/runtime'

import {
  AddAssociatedWalletRequest,
  AddAssociatedWalletSchema,
  CreateUserSchema,
  EmailRequest,
  EmailSchema,
  EntityManagerFollowUserRequest,
  FollowUserSchema,
  RemoveAssociatedWalletRequest,
  RemoveAssociatedWalletSchema,
  SendTipReactionRequest,
  SendTipReactionRequestSchema,
  SendTipRequest,
  SendTipSchema,
  EntityManagerSubscribeToUserRequest,
  SubscribeToUserSchema,
  EntityManagerUnfollowUserRequest,
  UnfollowUserSchema,
  EntityManagerUnsubscribeFromUserRequest,
  UnsubscribeFromUserSchema,
  UpdateCollectiblesRequest,
  UpdateCollectiblesSchema,
  UpdateProfileSchema,
  type EntityManagerCreateUserRequest,
  type EntityManagerUpdateProfileRequest,
  type UpdateUserRequestWithFiles,
  type CreateUserRequestWithFiles,
  type UserFileUploadParams,
  type EntityManagerPlaylistLibraryContents,
  type UsersApiServicesConfig
} from './types'

export class UsersApi extends GeneratedUsersApi {
  private readonly storage: StorageService
  private readonly entityManager?: EntityManagerService
  private readonly claimableTokens: ClaimableTokensClient
  private readonly solanaClient: SolanaClient
  private readonly emailEncryption: EmailEncryptionService

  constructor(configuration: Configuration, services: UsersApiServicesConfig) {
    super(configuration)
    this.storage = services.storage
    this.entityManager = services.entityManager
    this.claimableTokens = services.claimableTokensClient
    this.solanaClient = services.solanaClient
    this.emailEncryption = services.emailEncryptionService
  }

  /** @hidden
   * Generate a new user id for use in creation flow
   */
  private async generateUserId() {
    const response = new runtime.JSONApiResponse<{ data: string }>(
      await this.request({
        path: '/users/unclaimed_id',
        method: 'GET',
        headers: {},
        query: {
          noCache: Math.floor(Math.random() * 1000).toString()
        }
      })
    )
    return await response.value()
  }

  /** @hidden
   * Create a user
   */
  async createUserWithEntityManager(
    params: EntityManagerCreateUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { metadata } = await parseParams(
      'createUser',
      CreateUserSchema
    )(params)

    const { data } = await this.generateUserId()
    if (!data) {
      throw new Error('Failed to generate userId')
    }
    const userId = HashId.parse(data)

    const entityMetadata = snakecaseKeys(metadata)

    const cid = (await generateMetadataCidV1(entityMetadata)).toString()

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    // Write metadata to chain
    const { blockHash, blockNumber } = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: userId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid,
        data: entityMetadata
      }),
      ...advancedOptions
    })

    return { blockHash, blockNumber, metadata, userId: data }
  }

  override async createUser(
    params: CreateUserRequestWithFiles,
    requestInit?: RequestInit
  ) {
    const metadata = await this.updateMetadataWithFiles(params.metadata, params)
    if (this.entityManager) {
      const res = await this.createUserWithEntityManager({
        metadata
      })
      return {
        success: true,
        transactionHash: res.blockHash,
        userId: res.userId
      }
    }
    return super.createUser(
      {
        metadata
      },
      requestInit
    )
  }

  /** @hidden
   * Creates a guest for guest checkout
   */
  async createGuestAccount(advancedOptions?: AdvancedOptions) {
    const { data } = await this.generateUserId()
    if (!data) {
      throw new Error('Failed to generate userId')
    }
    const userId = HashId.parse(data)
    const metadata = {
      userId
    }

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    // Write metadata to chain
    const { blockHash, blockNumber } = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: userId,
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: null,
        data: null
      }),

      ...advancedOptions
    })

    return { blockHash, blockNumber, metadata }
  }

  /** @hidden
   * Update a user profile
   */
  async updateUserWithEntityManager(
    params: EntityManagerUpdateProfileRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, metadata } = await parseParams(
      'updateUser',
      UpdateProfileSchema
    )(params)
    const cid = (await generateMetadataCidV1(metadata)).toString()

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    // Write metadata to chain
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: userId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid,
        data: snakecaseKeys(metadata)
      }),
      ...advancedOptions
    })
  }

  private async updateMetadataWithFiles<
    T extends
      | CreateUserRequestWithFiles['metadata']
      | UpdateUserRequestWithFiles['metadata']
  >(metadata: T, fileUploadParams: UserFileUploadParams) {
    const { onProgress, profilePictureFile, coverArtFile } = fileUploadParams
    const [profilePictureResp, coverArtResp] = await Promise.all([
      profilePictureFile
        ? await this.storage
            .uploadFile({
              file: profilePictureFile,
              onProgress,
              metadata: {
                template: 'img_square'
              }
            })
            .start()
        : null,
      coverArtFile
        ? await this.storage
            .uploadFile({
              file: coverArtFile,
              onProgress,
              metadata: {
                template: 'img_backdrop'
              }
            })
            .start()
        : null
    ])
    if (profilePictureResp) {
      metadata.profilePicture = profilePictureResp.orig_file_cid
      metadata.profilePictureSizes = profilePictureResp.orig_file_cid
    }
    if (coverArtResp) {
      metadata.coverPhoto = coverArtResp.orig_file_cid
      metadata.coverPhotoSizes = coverArtResp.orig_file_cid
    }
    return metadata
  }

  private mapLibraryContentsToEntityManagerFormat(
    libraryItems: UserPlaylistLibrary['contents']
  ): EntityManagerPlaylistLibraryContents {
    const items: EntityManagerPlaylistLibraryContents = []
    for (const item of libraryItems) {
      if (item.type === 'folder') {
        const folder = {
          id: item.id,
          type: 'folder' as const,
          name: item.name,
          contents: this.mapLibraryContentsToEntityManagerFormat(item.contents)
        }
        items.push(folder)
      }
      if (item.type === 'playlist') {
        items.push({
          playlist_id: item.playlistId,
          type: 'playlist' as const
        })
      }
      if (item.type === 'explore_playlist') {
        items.push({
          playlist_id: item.playlistId,
          type: 'explore_playlist' as const
        })
      }
    }
    return items
  }

  override async updateUser(
    params: UpdateUserRequestWithFiles,
    requestInit?: RequestInit
  ) {
    const metadata = await this.updateMetadataWithFiles(params.metadata, params)
    if (this.entityManager) {
      return await this.updateUserWithEntityManager({
        userId: params.id,
        metadata: {
          ...metadata,
          playlistLibrary: metadata.playlistLibrary?.contents
            ? {
                contents: this.mapLibraryContentsToEntityManagerFormat(
                  metadata.playlistLibrary?.contents || []
                )
              }
            : undefined
        }
      })
    }
    return super.updateUser(
      {
        id: params.id,
        userId: params.userId,
        metadata
      },
      requestInit
    )
  }

  /** @hidden
   * Follow a user
   */
  async followUserWithEntityManager(
    params: EntityManagerFollowUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, followeeUserId } = await parseParams(
      'followUser',
      FollowUserSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: followeeUserId,
      action: Action.FOLLOW,
      ...advancedOptions
    })
  }

  override async followUser(
    params: EntityManagerFollowUserRequest | { id: string },
    requestInit?: RequestInit
  ) {
    if (this.entityManager && 'userId' in params) {
      const res = await this.followUserWithEntityManager(
        params as EntityManagerFollowUserRequest
      )
      return {
        success: true,
        transactionHash: res.transactionHash
      }
    }
    return super.followUser(params as any, requestInit)
  }

  /** @hidden
   * Unfollow a user
   */
  async unfollowUserWithEntityManager(
    params: EntityManagerUnfollowUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, followeeUserId } = await parseParams(
      'unfollowUser',
      UnfollowUserSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: followeeUserId,
      action: Action.UNFOLLOW,
      ...advancedOptions
    })
  }

  override async unfollowUser(
    params: EntityManagerUnfollowUserRequest | { id: string },
    requestInit?: RequestInit
  ) {
    if (this.entityManager && 'userId' in params) {
      const res = await this.unfollowUserWithEntityManager(
        params as EntityManagerUnfollowUserRequest
      )
      return {
        success: true,
        transactionHash: res.transactionHash
      }
    }
    return super.unfollowUser(params as any, requestInit)
  }

  /** @hidden
   * Subscribe to a user
   */
  async subscribeToUserWithEntityManager(
    params: EntityManagerSubscribeToUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, subscribeeUserId } = await parseParams(
      'subscribeToUser',
      SubscribeToUserSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: subscribeeUserId,
      action: Action.SUBSCRIBE,
      ...advancedOptions
    })
  }

  override async subscribeToUser(
    params: EntityManagerSubscribeToUserRequest | { id: string },
    requestInit?: RequestInit
  ) {
    if (this.entityManager && 'userId' in params) {
      const res = await this.subscribeToUserWithEntityManager(
        params as EntityManagerSubscribeToUserRequest
      )
      return {
        success: true,
        transactionHash: res.transactionHash
      }
    }
    return super.subscribeToUser(params as any, requestInit)
  }

  /** @hidden
   * Unsubscribe from a user
   */
  async unsubscribeFromUserWithEntityManager(
    params: EntityManagerUnsubscribeFromUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, subscribeeUserId } = await parseParams(
      'unsubscribeFromUser',
      UnsubscribeFromUserSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: subscribeeUserId,
      action: Action.UNSUBSCRIBE,
      ...advancedOptions
    })
  }

  override async unsubscribeFromUser(
    params: EntityManagerUnsubscribeFromUserRequest | { id: string },
    requestInit?: RequestInit
  ) {
    if (this.entityManager && 'userId' in params) {
      const res = await this.unsubscribeFromUserWithEntityManager(
        params as EntityManagerUnsubscribeFromUserRequest
      )
      return {
        success: true,
        transactionHash: res.transactionHash
      }
    }
    return super.unsubscribeFromUser(params as any, requestInit)
  }

  /**
   * Downloads the sales the user has made as a CSV file.
   * Similar to generated raw method, but forced response type as blob
   */
  async downloadSalesAsCSVBlob(
    params: DownloadSalesAsCSVRequest
  ): Promise<Blob> {
    if (params.id === null || params.id === undefined) {
      throw new runtime.RequiredError(
        'id',
        'Required parameter params.id was null or undefined when calling downloadSalesAsCSV.'
      )
    }

    const queryParameters: any = {}

    if (params.userId !== undefined) {
      queryParameters.user_id = params.userId
    }

    const headerParameters: runtime.HTTPHeaders = {}

    const response = await this.request({
      path: `/users/{id}/sales/download`.replace(
        `{${'id'}}`,
        encodeURIComponent(String(params.id))
      ),
      method: 'GET',
      headers: headerParameters,
      query: queryParameters
    })

    return await new runtime.BlobApiResponse(response).value()
  }

  /**
   * Downloads the purchases the user has made as a CSV file.
   * Similar to generated raw method, but forced response type as blob
   */
  async downloadPurchasesAsCSVBlob(
    params: DownloadPurchasesAsCSVRequest
  ): Promise<Blob> {
    if (params.id === null || params.id === undefined) {
      throw new runtime.RequiredError(
        'id',
        'Required parameter params.id was null or undefined when calling downloadPurchasesAsCSV.'
      )
    }

    const queryParameters: any = {}

    if (params.userId !== undefined) {
      queryParameters.user_id = params.userId
    }

    const headerParameters: runtime.HTTPHeaders = {}

    const response = await this.request({
      path: `/users/{id}/purchases/download`.replace(
        `{${'id'}}`,
        encodeURIComponent(String(params.id))
      ),
      method: 'GET',
      headers: headerParameters,
      query: queryParameters
    })

    return await new runtime.BlobApiResponse(response).value()
  }

  /**
   * Downloads the USDC withdrawals the user has made as a CSV file
   * Similar to generated raw method, but forced response type as blob
   */
  async downloadUSDCWithdrawalsAsCSVBlob(
    params: DownloadUSDCWithdrawalsAsCSVRequest
  ): Promise<Blob> {
    if (params.id === null || params.id === undefined) {
      throw new runtime.RequiredError(
        'id',
        'Required parameter params.id was null or undefined when calling downloadUSDCWithdrawalsAsCSV.'
      )
    }

    const queryParameters: any = {}
    if (params.userId !== undefined) {
      queryParameters.user_id = params.userId
    }

    const headerParameters: runtime.HTTPHeaders = {}

    const response = await this.request({
      path: `/users/{id}/withdrawals/download`.replace(
        `{${'id'}}`,
        encodeURIComponent(String(params.id))
      ),
      method: 'GET',
      headers: headerParameters,
      query: queryParameters
    })

    return await new runtime.BlobApiResponse(response).value()
  }

  /**
   * Sends a wAUDIO tip from one user to another.
   * @hidden subject to change
   */
  async sendTip(request: SendTipRequest) {
    const { amount } = await parseParams('sendTip', SendTipSchema)(request)

    const { ethWallet } = await this.getWalletAndUserBank(request.senderUserId)
    const { ethWallet: receiverEthWallet, userBank: destination } =
      await this.getWalletAndUserBank(request.receiverUserId)

    if (!ethWallet) {
      throw new Error('Invalid sender: No Ethereum wallet found.')
    }
    if (!receiverEthWallet) {
      throw new Error('Invalid recipient: No Ethereum wallet found.')
    }
    if (!destination) {
      throw new Error('Invalid recipient: No user bank found.')
    }

    const secp = await this.claimableTokens.createTransferSecpInstruction({
      ethWallet,
      destination,
      amount: wAUDIO(amount).value,
      mint: 'wAUDIO'
    })
    const transfer = await this.claimableTokens.createTransferInstruction({
      ethWallet,
      destination,
      mint: 'wAUDIO'
    })

    const transaction = await this.solanaClient.buildTransaction({
      instructions: [secp, transfer]
    })
    return await this.claimableTokens.sendTransaction(transaction)
  }

  /**
   * Submits a reaction to a tip being received.
   * @hidden
   */
  async sendTipReaction(
    params: SendTipReactionRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, metadata } = await parseParams(
      'sendTipReaction',
      SendTipReactionRequestSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.TIP,
      entityId: userId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(metadata)
      }),
      ...advancedOptions
    })
  }

  /**
   * Helper function for sendTip that gets the user wallet and creates
   * or gets the wAUDIO user bank for given user ID.
   */
  private async getWalletAndUserBank(id: string) {
    const res = await this.getUser({ id })
    const ethWallet = res.data?.ercWallet
    if (!ethWallet) {
      return { ethWallet: null, userBank: null }
    }
    const { userBank } = await this.claimableTokens.getOrCreateUserBank({
      ethWallet,
      mint: 'wAUDIO'
    })
    return { ethWallet, userBank }
  }

  /** @hidden
   * Share an encrypted email with a user
   */
  async shareEmail(params: EmailRequest, advancedOptions?: AdvancedOptions) {
    const {
      emailOwnerUserId,
      receivingUserId,
      email,
      granteeUserIds,
      initialEmailEncryptionUuid
    } = await parseParams('shareEmail', EmailSchema)(params)

    let symmetricKey: Uint8Array
    // Get hashed IDs and validate
    const emailOwnerUserIdHash = encodeHashId(emailOwnerUserId)
    const receivingUserIdHash = encodeHashId(receivingUserId)
    const initialEmailEncryptionUuidHash = encodeHashId(
      initialEmailEncryptionUuid
    )
    if (
      !emailOwnerUserIdHash ||
      !receivingUserIdHash ||
      !initialEmailEncryptionUuidHash
    ) {
      throw new Error('Email owner user ID and receiving user ID are required')
    }

    const accessGrants = [] as any[]

    const {
      data: { encryptedKey: emailOwnerKey, isInitial } = {
        encryptedKey: '',
        isInitial: false
      }
    } = await this.getUserEmailKey({
      receivingUserId: emailOwnerUserIdHash,
      grantorUserId: emailOwnerUserIdHash
    })

    let action, entityType
    if (emailOwnerKey) {
      symmetricKey = await this.emailEncryption.decryptSymmetricKey(
        emailOwnerKey,
        isInitial ? initialEmailEncryptionUuidHash : emailOwnerUserIdHash
      )
      action = Action.UPDATE
      entityType = EntityType.EMAIL_ACCESS
    } else {
      symmetricKey = this.emailEncryption.createSymmetricKey()
      // Create encrypted keys for owner and receiver
      const ownerEncryptedKey = await this.emailEncryption.encryptSymmetricKey(
        emailOwnerUserIdHash,
        symmetricKey
      )
      accessGrants.push({
        receiving_user_id: emailOwnerUserId,
        grantor_user_id: emailOwnerUserId,
        encrypted_key: ownerEncryptedKey
      })
      action = Action.ADD_EMAIL
      entityType = EntityType.ENCRYPTED_EMAIL
    }

    const encryptedEmail = await this.emailEncryption.encryptEmail(
      email,
      symmetricKey
    )

    const receiverEncryptedKey = await this.emailEncryption.encryptSymmetricKey(
      receivingUserIdHash,
      symmetricKey
    )

    accessGrants.push({
      receiving_user_id: receivingUserId,
      grantor_user_id: emailOwnerUserId,
      encrypted_key: receiverEncryptedKey
    })

    if (granteeUserIds?.length) {
      await Promise.all(
        granteeUserIds.map(async (granteeUserIdHash) => {
          const granteeEncryptedKey =
            await this.emailEncryption.encryptSymmetricKey(
              granteeUserIdHash,
              symmetricKey
            )

          accessGrants.push({
            receiving_user_id: decodeHashId(granteeUserIdHash),
            grantor_user_id: receivingUserId, // The primary receiver grants access
            encrypted_key: granteeEncryptedKey
          })
        })
      )
    }

    const metadata = {
      email_owner_user_id: emailOwnerUserId,
      encrypted_email: encryptedEmail,
      access_grants: accessGrants
    }

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId: emailOwnerUserId,
      entityType,
      entityId: emailOwnerUserId,
      action,
      metadata: JSON.stringify({
        cid: '',
        data: metadata
      }),
      ...advancedOptions
    })
  }

  /** @hidden
   * Associate a new wallet with a user
   */
  async addAssociatedWallet(
    params: AddAssociatedWalletRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const {
      userId,
      wallet: { address: wallet_address, chain },
      signature
    } = await parseParams(
      'addAssociatedWallet',
      AddAssociatedWalletSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.ASSOCIATED_WALLET,
      entityId: 0, // unused
      action: Action.CREATE,
      metadata: JSON.stringify({
        cid: '',
        data: {
          wallet_address,
          chain,
          signature
        }
      }),
      ...advancedOptions
    })
  }

  /** @hidden
   * Remove a wallet from a user
   */
  async removeAssociatedWallet(params: RemoveAssociatedWalletRequest) {
    const {
      userId,
      wallet: { address: wallet_address, chain }
    } = await parseParams(
      'removeAssociatedWallet',
      RemoveAssociatedWalletSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.ASSOCIATED_WALLET,
      entityId: 0, // unused
      action: Action.DELETE,
      metadata: JSON.stringify({
        cid: '',
        data: {
          wallet_address,
          chain
        }
      })
    })
  }

  /** @hidden
   * Update user collectibles preferences
   */
  async updateCollectibles(params: UpdateCollectiblesRequest) {
    const { userId, collectibles } = await parseParams(
      'updateCollectibles',
      UpdateCollectiblesSchema
    )(params)

    if (!this.entityManager) {
      throw new UninitializedEntityManagerError()
    }
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.COLLECTIBLES,
      entityId: 0, // unused
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: { collectibles: collectibles ?? {} }
      })
    })
  }
}
