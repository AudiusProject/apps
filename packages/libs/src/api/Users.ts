import { pick } from 'lodash'

import { EntityManagerClient } from '../services/dataContracts/EntityManagerClient'
import { Nullable, UserMetadata, Utils } from '../utils'

import type { ServiceProvider } from './ServiceProvider'
import { Base, BaseConstructorArgs, Services } from './base'

const USER_PROPS = [
  'is_verified',
  'twitter_handle',
  'instagram_handle',
  'tiktok_handle',
  'website',
  'donation',
  'is_deactivated',
  'name',
  'handle',
  'profile_picture',
  'profile_picture_sizes',
  'cover_photo',
  'cover_photo_sizes',
  'bio',
  'location',
  'artist_pick_track_id',
  'creator_node_endpoint',
  'associated_wallets',
  'associated_sol_wallets',
  'collectibles',
  'playlist_library',
  'events',
  'allow_ai_attribution',
  'spl_usdc_payout_wallet'
] as Array<keyof UserMetadata>
const USER_REQUIRED_PROPS = ['name', 'handle']

const { decodeHashId } = Utils

export class Users extends Base {
  ServiceProvider: ServiceProvider
  preferHigherPatchForPrimary: boolean
  preferHigherPatchForSecondaries: boolean
  constructor(
    serviceProvider: ServiceProvider,
    preferHigherPatchForPrimary: boolean,
    preferHigherPatchForSecondaries: boolean,
    ...args: BaseConstructorArgs
  ) {
    super(...args)

    this.ServiceProvider = serviceProvider
    this.preferHigherPatchForPrimary = preferHigherPatchForPrimary
    this.preferHigherPatchForSecondaries = preferHigherPatchForSecondaries

    this.getUsers = this.getUsers.bind(this)
    this.getMutualFollowers = this.getMutualFollowers.bind(this)
    this.getFollowersForUser = this.getFollowersForUser.bind(this)
    this.getFolloweesForUser = this.getFolloweesForUser.bind(this)
    this.getUserRepostFeed = this.getUserRepostFeed.bind(this)
    this.getTopCreatorsByGenres = this.getTopCreatorsByGenres.bind(this)
    this.updateSocialVerification = this.updateSocialVerification.bind(this)
    this.getUserListenCountsMonthly = this.getUserListenCountsMonthly.bind(this)
    this.getUserSubscribers = this.getUserSubscribers.bind(this)
    this.bulkGetUserSubscribers = this.bulkGetUserSubscribers.bind(this)

    this.updateMetadataV2 = this.updateMetadataV2.bind(this)
    this.uploadProfileImagesV2 = this.uploadProfileImagesV2.bind(this)
    this.createEntityManagerUserV2 = this.createEntityManagerUserV2.bind(this)
    this._waitForDiscoveryToIndexUser =
      this._waitForDiscoveryToIndexUser.bind(this)

    this._validateUserMetadata = this._validateUserMetadata.bind(this)
    this.cleanUserMetadata = this.cleanUserMetadata.bind(this)
  }

  async getUsers(
    limit = 100,
    offset = 0,
    idsArray: Nullable<number[]> = null,
    walletAddress: Nullable<string> = null,
    handle: Nullable<string> = null,
    minBlockNumber: Nullable<number> = null
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getUsers(
      limit,
      offset,
      idsArray,
      walletAddress,
      handle,
      minBlockNumber
    )
  }

  async getMutualFollowers(
    limit = 100,
    offset = 0,
    followeeUserId: number,
    userId?: number
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    if (userId) {
      return await this.discoveryProvider.getFollowIntersectionUsers(
        limit,
        offset,
        followeeUserId,
        userId
      )
    }
    return []
  }

  async getFollowersForUser(limit = 100, offset = 0, followeeUserId: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getFollowersForUser(
      limit,
      offset,
      followeeUserId
    )
  }

  async getFolloweesForUser(limit = 100, offset = 0, followerUserId: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getFolloweesForUser(
      limit,
      offset,
      followerUserId
    )
  }

  async getUserRepostFeed(
    userId: number,
    limit = 100,
    offset = 0,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getUserRepostFeed(
      userId,
      limit,
      offset,
      withUsers
    )
  }

  async getTopCreatorsByGenres(
    genres: string[],
    limit = 30,
    offset = 0,
    withUsers = false
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getTopCreatorsByGenres(
      genres,
      limit,
      offset,
      withUsers
    )
  }

  async getUserListenCountsMonthly(
    encodedUserId: string,
    startTime: string,
    endTime: string
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.getUserListenCountsMonthly(
      encodedUserId,
      startTime,
      endTime
    )
  }

  async getUserSubscribers(encodedUserId: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    const timeoutMs = 60000
    return await this.discoveryProvider.getUserSubscribers(
      encodedUserId,
      timeoutMs
    )
  }

  async bulkGetUserSubscribers(encodedUserIds: string) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    const timeoutMs = 60000
    return await this.discoveryProvider.bulkGetUserSubscribers(
      encodedUserIds,
      timeoutMs
    )
  }

  async uploadProfileImagesV2(
    profilePictureFile: File,
    coverPhotoFile: File,
    metadata: UserMetadata
  ) {
    let didMetadataUpdate = false
    if (profilePictureFile) {
      const resp =
        await this.creatorNode.uploadProfilePictureV2(profilePictureFile)
      metadata.profile_picture_sizes = resp.id
      didMetadataUpdate = true
    }
    if (coverPhotoFile) {
      const resp = await this.creatorNode.uploadCoverPhotoV2(coverPhotoFile)
      metadata.cover_photo_sizes = resp.id
      didMetadataUpdate = true
    }

    if (didMetadataUpdate) {
      await this.updateMetadataV2({
        newMetadata: metadata,
        userId: metadata.user_id
      })
    }

    return metadata
  }

  async createEntityManagerUserV2({
    metadata,
    profilePictureFile,
    coverPhotoFile
  }: {
    metadata: UserMetadata
    profilePictureFile: Nullable<File>
    coverPhotoFile: Nullable<File>
  }) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)

    try {
      const userId = await this._generateUserId()
      const newMetadata = this.cleanUserMetadata({ ...metadata })
      this._validateUserMetadata(newMetadata)

      newMetadata.is_storage_v2 = true
      newMetadata.wallet = this.web3Manager.getWalletAddress()
      newMetadata.user_id = userId

      if (profilePictureFile) {
        const resp =
          await this.creatorNode.uploadProfilePictureV2(profilePictureFile)
        newMetadata.profile_picture_sizes = resp.id
      }
      if (coverPhotoFile) {
        const resp = await this.creatorNode.uploadCoverPhotoV2(coverPhotoFile)
        newMetadata.cover_photo_sizes = resp.id
      }

      const cid = await Utils.fileHasher.generateMetadataCidV1(newMetadata)
      const manageEntityResponse =
        await this.contracts.EntityManagerClient!.manageEntity(
          userId,
          EntityManagerClient.EntityType.USER,
          userId,
          EntityManagerClient.Action.CREATE,
          JSON.stringify({
            cid: cid.toString(),
            data: newMetadata
          })
        )
      await this._waitForDiscoveryToIndexUser(
        userId,
        manageEntityResponse.txReceipt.blockNumber
      )

      return {
        newMetadata,
        blockHash: manageEntityResponse.txReceipt.blockHash,
        blockNumber: manageEntityResponse.txReceipt.blockNumber
      }
    } catch (e) {
      const errorMsg = `createEntityManagerUserV2() error: ${e}`
      if (e instanceof Error) {
        e.message = errorMsg
        throw e
      }
      throw new Error(errorMsg)
    }
  }

  async createEntityManagerGuestUser(newMetadata: UserMetadata) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)

    try {
      const userId = await this._generateUserId()

      newMetadata.is_storage_v2 = true
      newMetadata.wallet = this.web3Manager.getWalletAddress()
      newMetadata.handle = null

      const manageEntityResponse =
        await this.contracts.EntityManagerClient!.manageEntity(
          userId,
          EntityManagerClient.EntityType.USER,
          userId,
          EntityManagerClient.Action.CREATE,
          JSON.stringify({
            cid: null,
            data: null
          })
        )
      await this._waitForDiscoveryToIndexUser(
        userId,
        manageEntityResponse.txReceipt.blockNumber
      )

      return {
        newMetadata,
        blockHash: manageEntityResponse.txReceipt.blockHash,
        blockNumber: manageEntityResponse.txReceipt.blockNumber
      }
    } catch (e) {
      const errorMsg = `createEntityManagerUserV2() error: ${e}`
      if (e instanceof Error) {
        e.message = errorMsg
        throw e
      }
      throw new Error(errorMsg)
    }
  }

  async repairEntityManagerUserV2(newMetadata: any) {
    const { user_id: userId } = newMetadata
    const dnUser = await this.discoveryProvider.getUserAccount(
      newMetadata.wallet
    )
    if (!dnUser) {
      try {
        const cid = await Utils.fileHasher.generateMetadataCidV1(newMetadata)
        const manageEntityResponse =
          await this.contracts.EntityManagerClient!.manageEntity(
            userId,
            EntityManagerClient.EntityType.USER,
            userId,
            EntityManagerClient.Action.CREATE,
            JSON.stringify({
              cid: cid.toString(),
              data: newMetadata
            })
          )
        await this._waitForDiscoveryToIndexUser(
          userId,
          manageEntityResponse.txReceipt.blockNumber
        )
      } catch (e) {
        const errorMsg = `repairEntityManagerUserV2() error: ${e}`
        if (e instanceof Error) {
          e.message = errorMsg
          throw e
        }
        throw new Error(errorMsg)
      }
    }
  }

  async updateSocialVerification(
    userId: number,
    privateKey: string,
    metadata:
      | {
          is_verified: boolean
          twitter_handle: string
        }
      | {
          is_verified: boolean
          instagram_handle: string
        }
      | {
          is_verified: boolean
          tiktok_handle: string
        }
  ) {
    const cid = await Utils.fileHasher.generateMetadataCidV1(metadata)
    return await this.contracts.EntityManagerClient!.getManageEntityParams(
      userId,
      EntityManagerClient.EntityType.USER,
      userId,
      EntityManagerClient.Action.VERIFY,
      JSON.stringify({
        cid: cid.toString(),
        data: metadata
      }),
      privateKey
    )
  }

  async addUserSubscribe(subscribeToUserId: number, userId: number) {
    try {
      const response = await this.contracts.EntityManagerClient!.manageEntity(
        userId,
        EntityManagerClient.EntityType.USER,
        subscribeToUserId,
        EntityManagerClient.Action.SUBSCRIBE,
        ''
      )
      return {
        blockHash: response.txReceipt.blockHash,
        blockNumber: response.txReceipt.blockNumber
      }
    } catch (e) {
      return {
        error: (e as Error).message
      }
    }
  }

  async deleteUserSubscribe(subscribedToUserId: number, userId: number) {
    try {
      const response = await this.contracts.EntityManagerClient!.manageEntity(
        userId,
        EntityManagerClient.EntityType.USER,
        subscribedToUserId,
        EntityManagerClient.Action.UNSUBSCRIBE,
        ''
      )
      return {
        blockHash: response.txReceipt.blockHash,
        blockNumber: response.txReceipt.blockNumber
      }
    } catch (e) {
      return {
        error: (e as Error).message
      }
    }
  }

  async updateMetadataV2({
    newMetadata,
    userId
  }: {
    newMetadata: UserMetadata
    userId: number
  }) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    this.IS_OBJECT(newMetadata)

    newMetadata = this.cleanUserMetadata(newMetadata)
    this._validateUserMetadata(newMetadata)

    try {
      const cid = await Utils.fileHasher.generateMetadataCidV1(newMetadata)
      const { txReceipt } =
        await this.contracts.EntityManagerClient!.manageEntity(
          userId,
          EntityManagerClient.EntityType.USER,
          userId,
          EntityManagerClient.Action.UPDATE,
          JSON.stringify({
            cid: cid.toString(),
            data: newMetadata
          })
        )
      const blockNumber = txReceipt.blockNumber

      return {
        blockHash: txReceipt.blockHash,
        blockNumber
      }
    } catch (e) {
      const errorMsg = `updateMetadataV2() error: ${e}`
      if (e instanceof Error) {
        e.message = errorMsg
        throw e
      }
      throw new Error(errorMsg)
    }
  }

  async _waitForDiscoveryToIndexUser(
    userId: number,
    blockNumber: number,
    timeoutMs = 60000
  ): Promise<void> {
    const asyncFn = async () => {
      while (true) {
        let user
        try {
          user = (
            await this.discoveryProvider.getUsers(
              1, // limit
              0, // offset
              [userId], // userIds
              null, // walletAddress
              null, // handle
              blockNumber, // minBlockNumber
              true
            )
          )?.[0]
        } catch (err) {}

        if (user?.user_id === userId) {
          break
        }

        await Utils.wait(500)
      }
    }
    await Utils.racePromiseWithTimeout(
      asyncFn(),
      timeoutMs,
      `[User:_waitForDiscoveryToIndexUser()] Timeout error after ${timeoutMs}ms`
    )
  }

  _validateUserMetadata(metadata: UserMetadata) {
    this.OBJECT_HAS_PROPS(metadata, USER_PROPS, USER_REQUIRED_PROPS)
    this.creatorNode.validateUserSchema(metadata)
  }

  cleanUserMetadata(metadata: UserMetadata) {
    USER_PROPS.forEach((prop) => {
      if (!(prop in metadata)) {
        // @ts-expect-error
        metadata[prop] = null
      }
    })
    return pick(metadata, USER_PROPS.concat('user_id'))
  }

  async _generateUserId(): Promise<number> {
    const encodedId = await this.discoveryProvider.getUnclaimedId('users')
    if (!encodedId) {
      throw new Error('No unclaimed user IDs')
    }
    return decodeHashId(encodedId)!
  }
}
