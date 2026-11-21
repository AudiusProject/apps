import sigUtil from 'eth-sig-util'
import { Buffer as SafeBuffer } from 'safe-buffer'
import type { TransactionReceipt } from 'web3-core'

import * as signatureSchemas from '../../data-contracts/signatureSchemas'
import type { TrackMetadata, UserMetadata } from '../../utils'
import { ContractClient } from '../contracts/ContractClient'
import type { Web3Manager } from '../web3Manager'

export enum Action {
  CREATE = 'Create',
  UPDATE = 'Update',
  DELETE = 'Delete',
  VERIFY = 'Verify',
  FOLLOW = 'Follow',
  UNFOLLOW = 'Unfollow',
  SAVE = 'Save',
  UNSAVE = 'Unsave',
  REPOST = 'Repost',
  UNREPOST = 'Unrepost',
  SUBSCRIBE = 'Subscribe',
  UNSUBSCRIBE = 'Unsubscribe',
  VIEW = 'View',
  VIEW_PLAYLIST = 'ViewPlaylist',
  APPROVE = 'Approve',
  REJECT = 'Reject',
  DOWNLOAD = 'Download',
  REACT = 'React',
  UNREACT = 'Unreact',
  REPORT = 'Report',
  PIN = 'Pin',
  UNPIN = 'Unpin',
  MUTE = 'Mute',
  UNMUTE = 'Unmute',
  ADD_EMAIL = 'AddEmail',
  UPDATE_EMAIL = 'UpdateEmail',
  ADD_EMAIL_KEY = 'AddEmailKey',
  UPDATE_EMAIL_KEY = 'UpdateEmailKey',
  ADD_ACCESS_KEY = 'AddAccessKey',
  UPDATE_ACCESS_KEY = 'UpdateAccessKey'
}

export enum EntityType {
  PLAYLIST = 'Playlist',
  TRACK = 'Track',
  USER = 'User',
  USER_REPLICA_SET = 'UserReplicaSet',
  NOTIFICATION = 'Notification',
  COMMENT = 'Comment'
}

export type ManageEntityCIDMetadata = {
  cid: string
  data: TrackMetadata | UserMetadata
}

export class EntityManagerClient extends ContractClient {
  static Action = Action
  static EntityType = EntityType

  async getManageEntityParams(
    userId: number,
    entityType: EntityType,
    entityId: number,
    action: Action,
    metadataMultihash: string,
    privateKey?: string
  ): Promise<[string, string]> {
    const nonce = await signatureSchemas.getNonce()
    const chainId = await this.getEthChainId()
    const contractAddress = await this.getAddress()
    const signatureData = signatureSchemas.generators.getManageEntityData(
      chainId,
      contractAddress,
      userId,
      entityType,
      entityId,
      action,
      metadataMultihash,
      nonce
    )
    let sig
    if (privateKey) {
      sig = sigUtil.signTypedData(
        SafeBuffer.from(privateKey, 'hex') as unknown as Buffer,
        {
          data: signatureData
        }
      )
    } else {
      sig = await (this.web3Manager as Web3Manager).signTypedData(signatureData)
    }
    const method = await this.getMethod(
      'manageEntity',
      userId,
      entityType,
      entityId,
      action,
      metadataMultihash,
      nonce,
      sig
    )
    return [method.encodeABI(), contractAddress]
  }

  async manageEntity(
    userId: number,
    entityType: EntityType,
    entityId: number,
    action: Action,
    metadata: string,
    privateKey?: string
  ): Promise<{ txReceipt: TransactionReceipt }> {
    const nonce = await signatureSchemas.getNonce()
    const chainId = await this.getEthChainId()
    const contractAddress = await this.getAddress()
    const nethermindContractAddress = await this.getNethermindAddress()
    const signatureData = signatureSchemas.generators.getManageEntityData(
      chainId,
      contractAddress,
      userId,
      entityType,
      entityId,
      action,
      metadata,
      nonce
    )
    let sig
    if (privateKey) {
      sig = sigUtil.signTypedData(
        SafeBuffer.from(privateKey, 'hex') as unknown as Buffer,
        {
          data: signatureData
        }
      )
    } else {
      sig = await (this.web3Manager as Web3Manager).signTypedData(signatureData)
    }
    const method = await this.getMethod(
      'manageEntity',
      userId,
      entityType,
      entityId,
      action,
      metadata,
      nonce,
      sig
    )

    let nethermindMethod
    if (nethermindContractAddress) {
      const nethermindSignatureData =
        signatureSchemas.generators.getManageEntityData(
          1056800, // TODO get from chain after web3Manager uses nethermind only
          nethermindContractAddress,
          userId,
          entityType,
          entityId,
          action,
          metadata,
          nonce
        )
      const nethermindSig = await (
        this.web3Manager as Web3Manager
      ).signTypedData(nethermindSignatureData)

      nethermindMethod = await this.getMethod(
        'manageEntity',
        userId,
        entityType,
        entityId,
        action,
        metadata,
        nonce,
        nethermindSig
      )
    }
    const tx = await this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress,
      undefined,
      undefined,
      nethermindContractAddress,
      nethermindMethod
    )
    return {
      txReceipt: tx
    }
  }
}
