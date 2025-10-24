import {
  encodeFunctionData,
  decodeFunctionData,
  type Hex,
  type TypedDataDefinition,
  recoverTypedDataAddress
} from 'viem'

import * as runtime from '../../api/generated/default/runtime'
import { productionConfig } from '../../config/production'
import fetch, { Headers } from '../../utils/fetch'
import { mergeConfigWithDefaults } from '../../utils/mergeConfigs'
import { getNonce } from '../../utils/signatureSchemas'
import type { AudiusWalletClient } from '../AudiusWalletClient'
import type { LoggerService } from '../Logger'

import {
  EntityManager,
  type EntityManagerTypes
} from './contract/EntityManagerContract'
import { getDefaultEntityManagerConfig } from './getDefaultConfig'
import {
  Action,
  BlockConfirmation,
  EntityManagerConfig,
  EntityManagerService,
  EntityManagerTransactionReceipt,
  EntityType,
  ManageEntityOptions
} from './types'

const DEFAULT_GAS_LIMIT = 2000000
const CONFIRMATION_POLLING_INTERVAL = 2000
const CONFIRMATION_TIMEOUT = 45000

export class EntityManagerClient implements EntityManagerService {
  private readonly audiusWalletClient: AudiusWalletClient
  private readonly logger: LoggerService

  private readonly chainId: number
  private readonly contractAddress: string
  private readonly endpoint: string

  constructor(config_: EntityManagerConfig) {
    const config = mergeConfigWithDefaults(
      config_,
      getDefaultEntityManagerConfig(productionConfig)
    )
    this.audiusWalletClient = config.audiusWalletClient
    this.chainId = config.chainId
    this.contractAddress = config.contractAddress
    this.logger = config.logger.createPrefixedLogger('[entity-manager]')
    this.endpoint = config.endpoint
  }

  /**
   * Calls the manage entity method on chain to update some data
   */
  public async manageEntity({
    userId,
    entityType,
    entityId,
    action,
    metadata = '',
    confirmationTimeout = CONFIRMATION_TIMEOUT,
    skipConfirmation = false
  }: ManageEntityOptions): Promise<EntityManagerTransactionReceipt> {
    const nonce = await getNonce()

    const typedData: TypedDataDefinition<EntityManagerTypes, 'ManageEntity'> = {
      domain: this.getDomain(),
      primaryType: 'ManageEntity',
      message: {
        // TODO: Strictly check callsites to ensure userId always passed in
        // @ts-ignore Need to update this type to "uint32" instead of "uint"
        userId: userId!,
        entityType,
        // @ts-ignore Need to update this type to "uint32" instead of "uint"
        entityId,
        action,
        metadata,
        nonce
      },
      types: EntityManager.types
    }

    const [senderAddress] = await this.audiusWalletClient.getAddresses()
    const signature = await this.audiusWalletClient.signTypedData(typedData)

    const url = `${this.endpoint}/relay`
    this.logger.info(`Making relay request to ${url}`)
    const response = await fetch(url, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({
        contractAddress: this.contractAddress,
        contractRegistryKey: 'EntityManager',
        encodedABI: encodeFunctionData({
          abi: EntityManager.abi,
          args: [
            BigInt(userId!),
            entityType,
            BigInt(entityId),
            action,
            metadata,
            nonce,
            signature
          ],
          functionName: 'manageEntity'
        }),
        // Gas limit not really needed with ACDC
        gasLimit: DEFAULT_GAS_LIMIT,
        senderAddress
      })
    })
    if (response.ok) {
      const jsonResponse = await response.json()
      if (!skipConfirmation) {
        await this.confirmWrite({
          blockHash: jsonResponse.receipt.blockHash,
          blockNumber: jsonResponse.receipt.blockNumber,
          confirmationTimeout
        })
      }

      return {
        blockHash: jsonResponse.receipt.blockHash,
        blockNumber: jsonResponse.receipt.blockNumber
      }
    } else {
      if (response.status === 429) {
        this.logger.error(
          'API Rate Limit Exceeded: You have exceeded the allowed number of requests for this action. Please wait and try again later. If you require a higher rate limit, please send an email to api@audius.co with your request, detailing the reasons and expected usage.'
        )
      }
      throw new runtime.ResponseError(
        response,
        'Response returned an error code'
      )
    }
  }

  /**
   * Confirms a write by polling for the block to be indexed by API
   */
  public async confirmWrite({
    blockHash,
    blockNumber,
    confirmationTimeout = CONFIRMATION_TIMEOUT,
    confirmationPollingInterval = CONFIRMATION_POLLING_INTERVAL
  }: {
    blockHash: string
    blockNumber: number
    confirmationTimeout?: number
    confirmationPollingInterval?: number
  }) {
    this.logger.info(`Confirming write ${blockHash} ${blockNumber}`)
    const confirmBlock = async () => {
      const url = `${this.endpoint}/block_confirmation?blocknumber=${blockNumber}&blockhash=${blockHash}`
      const {
        data: { block_passed }
      } = await (await fetch(url)).json()

      return block_passed
        ? BlockConfirmation.CONFIRMED
        : BlockConfirmation.UNKNOWN
    }

    let confirmation: BlockConfirmation = await confirmBlock()

    const start = Date.now()
    while (confirmation === BlockConfirmation.UNKNOWN) {
      if (Date.now() - start > confirmationTimeout) {
        throw new Error(
          `Could not confirm write within ${confirmationTimeout}ms`
        )
      }
      await new Promise((resolve) =>
        setTimeout(resolve, confirmationPollingInterval)
      )
      confirmation = await confirmBlock()
    }

    this.logger.info('Write confirmed')
    return true
  }

  /**
   * Decodes the manage entity function data
   * @param data - The encoded function data
   * @returns The decoded function data
   */
  public decodeManageEntity(data: Hex) {
    const decodedAbi = decodeFunctionData({
      abi: EntityManager.abi,
      data
    })
    if (decodedAbi.functionName !== 'manageEntity') {
      throw new Error('Expected manageEntity function')
    }
    const [userId, entityType, entityId, action, metadata, nonce, subjectSig] =
      decodedAbi.args
    if (
      !userId ||
      !entityType ||
      // 0 is a valid entityId for some actions
      (!entityId && entityId !== BigInt(0)) ||
      !action ||
      // Empty string is valid metadata for some actions
      (!metadata && metadata !== '') ||
      !nonce ||
      !subjectSig
    ) {
      throw new Error('Missing complete manageEntity function data')
    }
    return {
      userId,
      entityType: entityType as EntityType,
      entityId,
      action: action as Action,
      metadata,
      nonce,
      subjectSig
    }
  }

  /**
   * Gets the domain used for proxy signing for the entity manager
   * @returns The domain object
   */
  private getDomain() {
    return {
      name: 'Entity Manager',
      chainId: BigInt(this.chainId),
      version: '1',
      verifyingContract: this.contractAddress as Hex
    } as const
  }

  /**
   * Recovers the signer address from the encoded ABI
   * @param encodedABI - The encoded ABI
   * @returns The recovered signer address
   */
  public async recoverSigner(encodedABI: Hex) {
    const decodedAbi = this.decodeManageEntity(encodedABI)
    const {
      userId,
      entityType,
      entityId,
      action,
      metadata,
      nonce,
      subjectSig
    } = decodedAbi

    return await recoverTypedDataAddress({
      domain: this.getDomain(),
      primaryType: 'ManageEntity',
      message: {
        // @ts-ignore Need to update this type to "uint32" instead of "uint"
        userId: Number(userId),
        entityType,
        // @ts-ignore Need to update this type to "uint32" instead of "uint"
        entityId: Number(entityId),
        action,
        metadata,
        nonce
      },
      types: EntityManager.types,
      signature: subjectSig
    })
  }
}
