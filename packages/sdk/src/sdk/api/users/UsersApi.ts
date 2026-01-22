import { wAUDIO } from '@audius/fixed-decimal'
import snakecaseKeys from 'snakecase-keys'

import type { StorageService } from '../../services'
import { EmailEncryptionService } from '../../services/Encryption'
import {
  Action,
  AdvancedOptions,
  EntityManagerService,
  EntityType
} from '../../services/EntityManager/types'
import type { LoggerService } from '../../services/Logger'
import type { ClaimableTokensClient } from '../../services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient'
import type { SolanaClient } from '../../services/Solana/programs/SolanaClient'
import { HashId } from '../../types/HashId'
import { generateMetadataCidV1 } from '../../utils/cid'
import { decodeHashId, encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'
import { retry3 } from '../../utils/retry'
import {
  Configuration,
  DownloadPurchasesAsCSVRequest,
  DownloadSalesAsCSVRequest,
  DownloadUSDCWithdrawalsAsCSVRequest,
  UsersApi as GeneratedUsersApi
} from '../generated/default'
import * as runtime from '../generated/default/runtime'

import {
  AddAssociatedWalletRequest,
  AddAssociatedWalletSchema,
  CreateUserRequest,
  CreateUserSchema,
  EmailRequest,
  EmailSchema,
  FollowUserRequest,
  FollowUserSchema,
  RemoveAssociatedWalletRequest,
  RemoveAssociatedWalletSchema,
  SendTipReactionRequest,
  SendTipReactionRequestSchema,
  SendTipRequest,
  SendTipSchema,
  SubscribeToUserRequest,
  SubscribeToUserSchema,
  UnfollowUserRequest,
  UnfollowUserSchema,
  UnsubscribeFromUserRequest,
  UnsubscribeFromUserSchema,
  UpdateCollectiblesRequest,
  UpdateCollectiblesSchema,
  UpdateProfileRequest,
  UpdateProfileSchema
} from './types'

export class UsersApi extends GeneratedUsersApi {
  constructor(
    configuration: Configuration,
    private readonly storage: StorageService,
    private readonly entityManager: EntityManagerService,
    private readonly logger: LoggerService,
    private readonly claimableTokens: ClaimableTokensClient,
    private readonly solanaClient: SolanaClient,
    private readonly emailEncryption: EmailEncryptionService
  ) {
    super(configuration)
    this.logger = logger.createPrefixedLogger('[users-api]')
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
  async createUser(
    params: CreateUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { onProgress, profilePictureFile, coverArtFile, metadata } =
      await parseParams('createUser', CreateUserSchema)(params)

    const { data } = await this.generateUserId()
    if (!data) {
      throw new Error('Failed to generate userId')
    }
    const userId = HashId.parse(data)

    const [profilePictureResp, coverArtResp] = await Promise.all([
      profilePictureFile &&
        retry3(
          async () =>
            await this.storage
              .uploadFile({
                file: profilePictureFile,
                onProgress,
                metadata: {
                  template: 'img_square'
                }
              })
              .start(),
          (e) => {
            this.logger.info('Retrying uploadProfilePicture', e)
          }
        ),
      coverArtFile &&
        retry3(
          async () =>
            await this.storage
              .uploadFile({
                file: coverArtFile,
                onProgress,
                metadata: {
                  template: 'img_backdrop'
                }
              })
              .start(),
          (e) => {
            this.logger.info('Retrying uploadProfileCoverArt', e)
          }
        )
    ])

    const updatedMetadata = {
      ...metadata,
      userId,
      ...(profilePictureResp
        ? {
            profilePicture: profilePictureResp?.id,
            profilePictureSizes: profilePictureResp?.id
          }
        : {}),
      ...(coverArtResp
        ? { coverPhoto: coverArtResp?.id, coverPhotoSizes: coverArtResp?.id }
        : {})
    }

    const entityMetadata = snakecaseKeys(updatedMetadata)

    const cid = (await generateMetadataCidV1(entityMetadata)).toString()

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

    return { blockHash, blockNumber, metadata: updatedMetadata }
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
  async updateProfile(
    params: UpdateProfileRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { onProgress, profilePictureFile, coverArtFile, userId, metadata } =
      await parseParams('updateProfile', UpdateProfileSchema)(params)

    const [profilePictureResp, coverArtResp] = await Promise.all([
      profilePictureFile &&
        retry3(
          async () =>
            await this.storage
              .uploadFile({
                file: profilePictureFile,
                onProgress,
                metadata: {
                  template: 'img_square'
                }
              })
              .start(),
          (e) => {
            this.logger.info('Retrying uploadProfilePicture', e)
          }
        ),
      coverArtFile &&
        retry3(
          async () =>
            await this.storage
              .uploadFile({
                file: coverArtFile,
                onProgress,
                metadata: {
                  template: 'img_backdrop'
                }
              })
              .start(),
          (e) => {
            this.logger.info('Retrying uploadProfileCoverArt', e)
          }
        )
    ])

    const updatedMetadata = snakecaseKeys({
      ...metadata,
      ...(profilePictureResp
        ? {
            profilePicture: profilePictureResp?.id,
            profilePictureSizes: profilePictureResp?.id
          }
        : {}),
      ...(coverArtResp
        ? { coverPhoto: coverArtResp?.id, coverPhotoSizes: coverArtResp?.id }
        : {})
    })

    const cid = (await generateMetadataCidV1(updatedMetadata)).toString()

    // Write metadata to chain
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: userId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid,
        data: updatedMetadata
      }),
      ...advancedOptions
    })
  }

  /** @hidden
   * Follow a user
   */
  async followUser(
    params: FollowUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, followeeUserId } = await parseParams(
      'followUser',
      FollowUserSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: followeeUserId,
      action: Action.FOLLOW,
      ...advancedOptions
    })
  }

  /** @hidden
   * Unfollow a user
   */
  async unfollowUser(
    params: UnfollowUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, followeeUserId } = await parseParams(
      'unfollowUser',
      UnfollowUserSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: followeeUserId,
      action: Action.UNFOLLOW,
      ...advancedOptions
    })
  }

  /** @hidden
   * Subscribe to a user
   */
  async subscribeToUser(
    params: SubscribeToUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, subscribeeUserId } = await parseParams(
      'subscribeToUser',
      SubscribeToUserSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: subscribeeUserId,
      action: Action.SUBSCRIBE,
      ...advancedOptions
    })
  }

  /** @hidden
   * Unsubscribe from a user
   */
  async unsubscribeFromUser(
    params: UnsubscribeFromUserRequest,
    advancedOptions?: AdvancedOptions
  ) {
    // Parse inputs
    const { userId, subscribeeUserId } = await parseParams(
      'unsubscribeFromUser',
      UnsubscribeFromUserSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: subscribeeUserId,
      action: Action.UNSUBSCRIBE,
      ...advancedOptions
    })
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
