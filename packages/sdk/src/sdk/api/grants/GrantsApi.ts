import type { Configuration, User, UsersApi } from '../../api/generated/default'
import type { EntityManagerService } from '../../services'
import {
  Action,
  AdvancedOptions,
  EntityType
} from '../../services/EntityManager/types'
import { encodeHashId } from '../../utils/hashId'
import { parseParams } from '../../utils/parseParams'

import {
  ApproveGrantSchema,
  type ApproveGrantRequest,
  AddManagerSchema,
  type AddManagerRequest,
  type CreateGrantRequest,
  CreateGrantSchema,
  type RemoveManagerRequest,
  RemoveManagerSchema,
  type RevokeGrantRequest,
  RevokeGrantSchema
} from './types'

export class GrantsApi {
  // eslint-disable-next-line no-useless-constructor
  constructor(
    _config: Configuration,
    private readonly entityManager: EntityManagerService,
    private readonly usersApi: UsersApi
  ) {}

  async createGrantWithEntityManager(
    params: CreateGrantRequest,
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

  async createGrant(params: CreateGrantRequest, requestInit?: RequestInit) {
    if (this.entityManager) {
      return await this.createGrantWithEntityManager(params)
    }
    const { userId, appApiKey } = await parseParams(
      'createGrant',
      CreateGrantSchema
    )(params)
    return await this.usersApi.createGrant(
      {
        id: encodeHashId(userId)!,
        createGrantRequestBody: { appApiKey }
      },
      requestInit
    )
  }

  async addManagerWithEntityManager(
    params: AddManagerRequest,
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

  async addManager(params: AddManagerRequest, requestInit?: RequestInit) {
    if (this.entityManager) {
      return await this.addManagerWithEntityManager(params)
    }
    const { userId, managerUserId } = await parseParams(
      'addManager',
      AddManagerSchema
    )(params)
    return await this.usersApi.addManager(
      {
        id: encodeHashId(userId)!,
        addManagerRequestBody: {
          managerUserId: encodeHashId(managerUserId)!
        }
      },
      requestInit
    )
  }

  async removeManagerWithEntityManager(
    params: RemoveManagerRequest,
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

  async removeManager(params: RemoveManagerRequest, requestInit?: RequestInit) {
    if (this.entityManager) {
      return await this.removeManagerWithEntityManager(params)
    }
    const { userId, managerUserId } = await parseParams(
      'removeManager',
      RemoveManagerSchema
    )(params)
    return await this.usersApi.removeManager(
      {
        id: encodeHashId(userId)!,
        managerUserId: encodeHashId(managerUserId)!
      },
      requestInit
    )
  }

  async revokeGrantWithEntityManager(
    params: RevokeGrantRequest,
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

  async revokeGrant(params: RevokeGrantRequest, requestInit?: RequestInit) {
    if (this.entityManager) {
      return await this.revokeGrantWithEntityManager(params)
    }
    const { userId, appApiKey } = await parseParams(
      'revokeGrant',
      RevokeGrantSchema
    )(params)
    return await this.usersApi.revokeGrant(
      {
        id: encodeHashId(userId)!,
        address: appApiKey
      },
      requestInit
    )
  }

  async approveGrantWithEntityManager(
    params: ApproveGrantRequest,
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

  async approveGrant(params: ApproveGrantRequest, requestInit?: RequestInit) {
    if (this.entityManager) {
      return await this.approveGrantWithEntityManager(params)
    }
    const { userId, grantorUserId } = await parseParams(
      'approveGrant',
      ApproveGrantSchema
    )(params)
    return await this.usersApi.approveGrant(
      {
        id: encodeHashId(userId)!,
        approveGrantRequestBody: {
          grantorUserId: encodeHashId(grantorUserId)!
        }
      },
      requestInit
    )
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
