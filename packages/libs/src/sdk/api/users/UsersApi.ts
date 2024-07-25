import snakecaseKeys from 'snakecase-keys'

import type {
  AuthService,
  PaymentRouterClient,
  StorageService
} from '../../services'
import {
  Action,
  EntityManagerService,
  EntityType,
  AdvancedOptions
} from '../../services/EntityManager/types'
import type { LoggerService } from '../../services/Logger'
import type { ClaimableTokensClient } from '../../services/Solana/programs/ClaimableTokensClient/ClaimableTokensClient'
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
  FollowUserRequest,
  FollowUserSchema,
  SubscribeToUserRequest,
  SubscribeToUserSchema,
  UpdateProfileRequest,
  UnfollowUserRequest,
  UnfollowUserSchema,
  UnsubscribeFromUserRequest,
  UnsubscribeFromUserSchema,
  UpdateProfileSchema,
  SendTipRequest,
  SendTipSchema,
  SendTipReactionRequest,
  SendTipReactionRequestSchema,
  SplitDonationsRequestSchema,
  SplitDonationsRequest,
  GetSplitDonationsTransactionSchema
} from './types'

export class UsersApi extends GeneratedUsersApi {
  constructor(
    configuration: Configuration,
    private readonly storage: StorageService,
    private readonly entityManager: EntityManagerService,
    private readonly auth: AuthService,
    private readonly logger: LoggerService,
    private readonly claimableTokens: ClaimableTokensClient,
    private paymentRouterClient: PaymentRouterClient
  ) {
    super(configuration)
    this.logger = logger.createPrefixedLogger('[users-api]')
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
            await this.storage.uploadFile({
              file: profilePictureFile,
              onProgress,
              template: 'img_square'
            }),
          (e) => {
            this.logger.info('Retrying uploadProfilePicture', e)
          }
        ),
      coverArtFile &&
        retry3(
          async () =>
            await this.storage.uploadFile({
              file: coverArtFile,
              onProgress,
              template: 'img_backdrop'
            }),
          (e) => {
            this.logger.info('Retrying uploadProfileCoverArt', e)
          }
        )
    ])

    const updatedMetadata = {
      ...metadata,
      ...(profilePictureResp ? { profilePicture: profilePictureResp?.id } : {}),
      ...(coverArtResp ? { coverPhoto: coverArtResp?.id } : {})
    }

    // Write metadata to chain
    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.USER,
      entityId: userId,
      action: Action.UPDATE,
      metadata: JSON.stringify({
        cid: '',
        data: snakecaseKeys(updatedMetadata)
      }),
      auth: this.auth,
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
      auth: this.auth,
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
      auth: this.auth,
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
      auth: this.auth,
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
      auth: this.auth,
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
      amount,
      mint: 'wAUDIO',
      auth: this.auth
    })
    const transfer = await this.claimableTokens.createTransferInstruction({
      ethWallet,
      destination,
      mint: 'wAUDIO'
    })

    const transaction = await this.claimableTokens.buildTransaction({
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
      auth: this.auth,
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

  private async getSplitDonationsTransaction(params: SplitDonationsRequest) {
    const { total, splits, wallet } = await parseParams(
      'getSplitDonationsTransaction',
      GetSplitDonationsTransactionSchema
    )(params)

    if (wallet) {
      const transferInstruction =
        await this.paymentRouterClient.createTransferInstruction({
          sourceWallet: wallet,
          total,
          mint: 'wAUDIO'
        })
      const routeInstruction =
        await this.paymentRouterClient.createRouteInstruction({
          splits,
          total,
          mint: 'wAUDIO'
        })
      const transaction = await this.paymentRouterClient.buildTransaction({
        feePayer: wallet,
        instructions: [transferInstruction, routeInstruction]
      })
      return transaction
    }
    return null
  }

  /**
   * Split donations
   *
   * @hidden
   */
  public async sendSplitDonations(params: SplitDonationsRequest) {
    await parseParams(
      'splitDonationsRequest',
      SplitDonationsRequestSchema
    )(params)
    const transaction = await this.getSplitDonationsTransaction(params)
    if (!transaction) return

    if (params.walletAdapter) {
      if (!params.walletAdapter.publicKey) {
        throw new Error(
          'Param walletAdapter was specified, but no wallet selected'
        )
      }
      return await params.walletAdapter.sendTransaction(
        transaction,
        this.paymentRouterClient.connection
      )
    }
    return this.paymentRouterClient.sendTransaction(transaction)
  }
}
