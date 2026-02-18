import type {
  AddManagerRequest as GeneratedAddManagerRequest,
  ApproveGrantRequest as GeneratedApproveGrantRequest,
  Configuration,
  CreateGrantRequest as GeneratedCreateGrantRequest,
  RemoveManagerRequest as GeneratedRemoveManagerRequest,
  RevokeGrantRequest as GeneratedRevokeGrantRequest,
  User,
  UsersApi
} from '../../api/generated/default'
import type { EntityManagerService } from '../../services'
import {
  Action,
  AdvancedOptions,
  EntityType
} from '../../services/EntityManager/types'
import { encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'

import {
  AddManagerSchema,
  ApproveGrantSchema,
  CreateGrantSchema,
  RemoveManagerSchema,
  RevokeGrantSchema,
  type EntityManagerAddManagerRequest,
  type EntityManagerApproveGrantRequest,
  type EntityManagerCreateGrantRequest,
  type EntityManagerRemoveManagerRequest,
  type EntityManagerRevokeGrantRequest
} from './types'

export class GrantsApi {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    _config: Configuration,
    private readonly entityManager: EntityManagerService,
    private readonly usersApi: UsersApi
  ) {}

  async createGrantWithEntityManager(
    params: EntityManagerCreateGrantRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, appApiKey } = await parseParams(
      'createGrant',
      CreateGrantSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0,
      action: Action.CREATE,
      metadata: JSON.stringify({
        grantee_address: `0x${appApiKey}`
      }),
      ...advancedOptions
    })
  }

  async createGrant(
    params: EntityManagerCreateGrantRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.createGrantWithEntityManager(params)
    }
    const { userId, appApiKey } = await parseParams(
      'createGrant',
      CreateGrantSchema
    )(params)
    const request: GeneratedCreateGrantRequest = {
      id: encodeHashId(userId)!,
      createGrantRequestBody: { appApiKey }
    }
    return await this.usersApi.createGrant(request, requestInit)
  }

  async addManagerWithEntityManager(
    params: EntityManagerAddManagerRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, managerUserId } = await parseParams(
      'addManager',
      AddManagerSchema
    )(params)
    const managerUser = await this.getManagerUser(managerUserId, 'addManager')

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0,
      action: Action.CREATE,
      metadata: JSON.stringify({
        grantee_address: managerUser.ercWallet
      }),
      ...advancedOptions
    })
  }

  async addManager(
    params: EntityManagerAddManagerRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.addManagerWithEntityManager(params)
    }
    const { userId, managerUserId } = await parseParams(
      'addManager',
      AddManagerSchema
    )(params)
    const request: GeneratedAddManagerRequest = {
      id: encodeHashId(userId)!,
      addManagerRequestBody: {
        managerUserId: encodeHashId(managerUserId)!
      }
    }
    return await this.usersApi.addManager(request, requestInit)
  }

  async removeManagerWithEntityManager(
    params: EntityManagerRemoveManagerRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, managerUserId } = await parseParams(
      'removeManager',
      RemoveManagerSchema
    )(params)
    const managerUser = await this.getManagerUser(
      managerUserId,
      'removeManager'
    )

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0,
      action: Action.DELETE,
      metadata: JSON.stringify({
        grantee_address: managerUser.ercWallet
      }),
      ...advancedOptions
    })
  }

  async removeManager(
    params: EntityManagerRemoveManagerRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.removeManagerWithEntityManager(params)
    }
    const { userId, managerUserId } = await parseParams(
      'removeManager',
      RemoveManagerSchema
    )(params)
    const request: GeneratedRemoveManagerRequest = {
      id: encodeHashId(userId)!,
      managerUserId: encodeHashId(managerUserId)!
    }
    return await this.usersApi.removeManager(request, requestInit)
  }

  async revokeGrantWithEntityManager(
    params: EntityManagerRevokeGrantRequest,
    advancedOptions?: AdvancedOptions
  ) {
    const { userId, appApiKey } = await parseParams(
      'revokeGrant',
      RevokeGrantSchema
    )(params)

    return await this.entityManager.manageEntity({
      userId,
      entityType: EntityType.GRANT,
      entityId: 0,
      action: Action.DELETE,
      metadata: JSON.stringify({
        grantee_address: `0x${appApiKey}`
      }),
      ...advancedOptions
    })
  }

  async revokeGrant(
    params: EntityManagerRevokeGrantRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.revokeGrantWithEntityManager(params)
    }
    const { userId, appApiKey } = await parseParams(
      'revokeGrant',
      RevokeGrantSchema
    )(params)
    const request: GeneratedRevokeGrantRequest = {
      id: encodeHashId(userId)!,
      address: appApiKey
    }
    return await this.usersApi.revokeGrant(request, requestInit)
  }

  async approveGrantWithEntityManager(
    params: EntityManagerApproveGrantRequest,
    advancedOptions?: AdvancedOptions
  ) {
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
      }),
      ...advancedOptions
    })
  }

  async approveGrant(
    params: EntityManagerApproveGrantRequest,
    requestInit?: RequestInit
  ) {
    if (this.entityManager) {
      return await this.approveGrantWithEntityManager(params)
    }
    const { userId, grantorUserId } = await parseParams(
      'approveGrant',
      ApproveGrantSchema
    )(params)
    const request: GeneratedApproveGrantRequest = {
      id: encodeHashId(userId)!,
      approveGrantRequestBody: {
        grantorUserId: encodeHashId(grantorUserId)!
      }
    }
    return await this.usersApi.approveGrant(request, requestInit)
  }

  private async getManagerUser(
    managerUserId: number,
    operation: string
  ): Promise<User> {
    const managerUser = (
      await this.usersApi.getUser({
        id: encodeHashId(managerUserId)!
      })
    ).data
    if (!managerUser?.ercWallet) {
      throw new Error(
        `\`managerUserId\` passed to \`${operation}\` method is invalid.`
      )
    }
    return managerUser
  }
}
