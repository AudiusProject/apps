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
  DeveloperAppsApi as GeneratedDeveloperAppsApi
} from '../generated/default'

import {
  CreateDeveloperAppRequest,
  CreateDeveloperAppSchema,
  UpdateDeveloperAppRequest,
  UpdateDeveloperAppSchema,
  DeleteDeveloperAppRequest,
  DeleteDeveloperAppSchema
} from './types'

export class DeveloperAppsApi extends GeneratedDeveloperAppsApi {
  constructor(
    config: Configuration,
    private readonly entityManager: EntityManagerService
  ) {
    super(config)
  }

  /**
   * Create a developer app
   */
  async createDeveloperApp(
    params: CreateDeveloperAppRequest,
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

    const apiKey = address.slice(2).toLowerCase()
    const apiSecret = privateKey.slice(2).toLowerCase()
    return {
      ...response,
      apiKey,
      apiSecret
    }
  }

  /**
   * Update a developer app
   */
  async updateDeveloperApp(
    params: UpdateDeveloperAppRequest,
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

  /**
   * Delete a developer app
   */
  async deleteDeveloperApp(params: DeleteDeveloperAppRequest) {
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
}
