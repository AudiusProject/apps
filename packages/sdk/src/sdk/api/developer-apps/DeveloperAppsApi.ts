import { generatePrivateKey, privateKeyToAddress } from 'viem/accounts'

import {
  createAppWalletClient,
  type EntityManagerService
} from '../../services'
import {
  Action,
  EntityType,
  AdvancedOptions
} from '../../services/EntityManager/types'
import { parseParams } from '../../utils/parseParams'
import {
  Configuration,
  DeveloperAppsApi as GeneratedDeveloperAppsApi,
  type CreateDeveloperAppRequest,
  type DeleteDeveloperAppRequest,
  type UpdateDeveloperAppRequest
} from '../generated/default'

import {
  EntityManagerCreateDeveloperAppRequest,
  CreateDeveloperAppSchema,
  EntityManagerUpdateDeveloperAppRequest,
  UpdateDeveloperAppSchema,
  EntityManagerDeleteDeveloperAppRequest,
  DeleteDeveloperAppSchema
} from './types'

/** Extended params to allow bypassing entity manager for bearer token response */
type CreateDeveloperAppParams = CreateDeveloperAppRequest & {
  /** When true, use API POST endpoint to get bearer_token; otherwise use entity manager */
  useApiEndpoint?: boolean
}

export class DeveloperAppsApi extends GeneratedDeveloperAppsApi {
  constructor(
    config: Configuration,
    private readonly entityManager: EntityManagerService
  ) {
    super(config)
  }

  /**
   * Create a developer app via relay (user-signed) + API key registration.
   * 1. User signs CreateDeveloperApp ManageEntity tx → POST /relay
   * 2. After relay succeeds, register api_keys + api_access_keys → POST /developer-apps/{address}/access-keys
   */
  async createDeveloperAppWithEntityManager(
    params: EntityManagerCreateDeveloperAppRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { name, userId, description, imageUrl } = await parseParams(
      'createDeveloperApp',
      CreateDeveloperAppSchema
    )(params)

    const privateKey = generatePrivateKey()
    const address = privateKeyToAddress(privateKey)
    const wallet = createAppWalletClient({
      apiKey: address,
      apiSecret: privateKey
    })

    const unixTs = Math.round(new Date().getTime() / 1000) // current unix timestamp (sec)
    const message = `Creating Audius developer app at ${unixTs}`

    const signature = await wallet.signMessage({ message })
    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.DEVELOPER_APP,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.CREATE,
      metadata: JSON.stringify({
        address: address.toLowerCase(),
        name,
        description,
        image_url: imageUrl,
        app_signature: {
          message,
          signature
        }
      }),
      ...advancedOptions
    })

    const apiKey = address.startsWith('0x')
      ? address.slice(2).toLowerCase()
      : address.toLowerCase()
    const apiSecret = (privateKey as string).startsWith('0x')
      ? (privateKey as string).slice(2).toLowerCase()
      : (privateKey as string).toLowerCase()

    // Create api_access_key for the relay-created app (user from auth headers; indexer may lag, so retry)
    const bearerToken = await this.createAccessKeyWithRetry({
      address,
      userId: userId.toString()
    })

    return {
      ...response,
      apiKey,
      apiSecret,
      bearer_token: bearerToken,
      bearerToken
    }
  }

  /**
   * Call POST /developer-apps/{address}/access-keys to create the first api_access_key
   * for a relay-created app. User is identified from request auth headers. Retries on 404
   * while indexer processes the CreateDeveloperApp tx.
   */
  private async createAccessKeyWithRetry(params: {
    address: string
    userId: string
  }): Promise<string> {
    const { address, userId } = params
    const maxAttempts = 5
    const delayMs = 2000

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const path = `/developer-apps/${encodeURIComponent(address)}/access-keys`
        const res = await this.request({
          path,
          method: 'POST',
          headers: {},
          query: { user_id: userId }
        })
        const json = (await res.json()) as { api_access_key: string }
        return json.api_access_key ?? ''
      } catch (e: unknown) {
        const status =
          e && typeof e === 'object' && 'response' in e
            ? (e as { response?: { status?: number } }).response?.status
            : undefined
        if (status === 404 && attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, delayMs))
          continue
        }
        throw e
      }
    }
    return ''
  }

  /**
   * Get developer apps with api_access_keys (bearer tokens).
   * Uses include=metrics to fetch bearer tokens from the API.
   */
  async getDeveloperAppsWithMetrics(params: { id: string }) {
    const path = `/users/${encodeURIComponent(params.id)}/developer-apps`
    const response = await this.request({
      path,
      method: 'GET',
      headers: {},
      query: { include: 'metrics' }
    })
    const json = (await response.json()) as {
      data: Array<{
        address: string
        user_id: string
        name: string
        description?: string | null
        image_url?: string | null
        api_access_keys?: Array<{ api_access_key: string; is_active: boolean }>
      }>
    }
    return json
  }

  override async createDeveloperApp(
    params: CreateDeveloperAppParams,
    requestInit?: RequestInit
  ) {
    const useApi = (params as CreateDeveloperAppParams).useApiEndpoint === true
    if (this.entityManager && !useApi) {
      return await this.createDeveloperAppWithEntityManager({
        ...params.metadata,
        userId: params.userId
      })
    }
    const { useApiEndpoint: ignored, ...apiParams } = params
    return await super.createDeveloperApp(apiParams, requestInit)
  }

  /**
   * Update a developer app
   */
  async updateDeveloperAppWithEntityManager(
    params: EntityManagerUpdateDeveloperAppRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { appApiKey, name, userId, description, imageUrl } =
      await parseParams('updateDeveloperApp', UpdateDeveloperAppSchema)(params)

    const response = await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.DEVELOPER_APP,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.UPDATE,
      metadata: JSON.stringify({
        address: `0x${appApiKey}`,
        name,
        description,
        image_url: imageUrl
      }),
      ...advancedOptions
    })

    return {
      ...response
    }
  }

  override async updateDeveloperApp(
    params: UpdateDeveloperAppRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.updateDeveloperAppWithEntityManager({
        ...params.metadata,
        userId: params.userId,
        appApiKey: params.address
      })
    } else {
      return await super.updateDeveloperApp(params, requestInit)
    }
  }

  /**
   * Delete a developer app
   */
  async deleteDeveloperAppWithEntityManager(
    params: EntityManagerDeleteDeveloperAppRequest
  ) {
    const { userId, appApiKey } = await parseParams(
      'deleteDeveloperApp',
      DeleteDeveloperAppSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.DEVELOPER_APP,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.DELETE,
      metadata: JSON.stringify({
        address: `0x${appApiKey}`
      })
    })
  }

  override async deleteDeveloperApp(
    params: DeleteDeveloperAppRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.deleteDeveloperAppWithEntityManager({
        userId: params.userId,
        appApiKey: params.address
      })
    } else {
      return await super.deleteDeveloperApp(params, requestInit)
    }
  }
}
