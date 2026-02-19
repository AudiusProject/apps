import type { UsersApi, Configuration, User } from '../../api/generated/default'
import type { EntityManagerService } from '../../services'
import { Action, EntityType } from '../../services/EntityManager/types'
import { encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'

import {
  ApproveGrantSchema,
  ApproveGrantRequest,
  AddManagerRequest,
  AddManagerSchema,
  CreateGrantRequest,
  CreateGrantSchema,
  RevokeGrantRequest,
  RevokeGrantSchema,
  RemoveManagerRequest
} from './types'

export class GrantsApi {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    _config: Configuration,
    private readonly entityManager: EntityManagerService,
    private readonly usersApi: UsersApi
  ) {}

  /**
   * When user authorizes app to perform actions on their behalf.
   * For user-to-user grants, use `addManager`.
   */
  async createGrant(params: CreateGrantRequest) {
    const { userId, appApiKey } = await parseParams(
      'createGrant',
      CreateGrantSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.CREATE,
      metadata: JSON.stringify({
        grantee_address: `0x${appApiKey}`
      })
    })
  }

  /**
   * When user authorizes another user to perform actions on their behalf.
   * The grant has to be approved by the proposed manager.
   */
  async addManager(params: AddManagerRequest) {
    const { userId, managerUserId } = await parseParams(
      'addManager',
      AddManagerSchema
    )(params)
    let managerUser: User | undefined
    try {
      managerUser = (
        await this.usersApi.getUser({
          id: encodeHashId(managerUserId)!
        })
      ).data
      if (!managerUser) {
        throw new Error()
      }
    } catch (e) {
      throw new Error(
        '`managerUserId` passed to `addManager` method is invalid.'
      )
    }

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.CREATE,
      metadata: JSON.stringify({
        grantee_address: managerUser!.ercWallet
      })
    })
  }

  /**
   * Revokes a user's manager access - can either be called by the manager user or the child user
   */
  async removeManager(params: RemoveManagerRequest) {
    const { userId, managerUserId } = await parseParams(
      'addManager',
      AddManagerSchema
    )(params)
    let managerUser: User | undefined
    try {
      managerUser = (
        await this.usersApi.getUser({
          id: encodeHashId(managerUserId)!
        })
      ).data
      if (!managerUser) {
        throw new Error()
      }
    } catch (e) {
      throw new Error(
        '`managerUserId` passed to `removeManager` method is invalid.'
      )
    }

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.DELETE,
      metadata: JSON.stringify({
        grantee_address: managerUser!.ercWallet
      })
    })
  }

  /**
   * When user revokes an app's authorization to perform actions on their behalf
   */
  async revokeGrant(params: RevokeGrantRequest) {
    const { userId, appApiKey } = await parseParams(
      'revokeGrant',
      RevokeGrantSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0, // Contract requires uint, but we don't actually need this field for this action. Just use 0.
      action: Action.DELETE,
      metadata: JSON.stringify({
        grantee_address: `0x${appApiKey}`
      })
    })
  }

  /**
   * Approve manager request
   */
  async approveGrant(params: ApproveGrantRequest) {
    const { userId, grantorUserId } = await parseParams(
      'approveGrant',
      ApproveGrantSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0,
      action: Action.APPROVE,
      metadata: JSON.stringify({
        grantor_user_id: grantorUserId
      })
    })
  }
}
