import { beforeEach, describe, expect, it, vitest } from 'vitest'

import {
  EntityManagerAction,
  EntityManagerService,
  EntityType
} from '../../services/EntityManager'
import { decodeHashId } from '../../utils/hashId'
import {
  Configuration,
  UsersApi as GeneratedUsersApi
} from '../generated/default'

import { GrantsApi } from './GrantsApi'

describe('GrantsApi', () => {
  const managerUserId = '0EdNZyj'
  const grantorUserId = 'n3A5v'
  const managerWallet = '0xc54bbb0ccf422e3c66c9120fce31f9aa2596b016'

  let grants: GrantsApi
  let manageEntity: ReturnType<typeof vitest.fn>

  beforeEach(() => {
    vitest.resetAllMocks()
    vitest.spyOn(GeneratedUsersApi.prototype, 'getUser').mockResolvedValue({
      data: {
        ercWallet: managerWallet
      }
    } as any)
    manageEntity = vitest.fn().mockResolvedValue({
      blockHash: 'blockHash',
      blockNumber: 1,
      transactionHash: 'transactionHash'
    })

    grants = new GrantsApi(new Configuration(), {
      entityManager: {
        manageEntity,
        confirmWrite: vitest.fn(),
        decodeManageEntity: vitest.fn(),
        recoverSigner: vitest.fn()
      } as unknown as EntityManagerService
    })
  })

  it('approves manager grants with the accepting manager wallet', async () => {
    await grants.approveGrant({
      userId: managerUserId,
      grantorUserId
    })

    expect(GeneratedUsersApi.prototype.getUser).toHaveBeenCalledWith({
      id: managerUserId
    })
    expect(manageEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: decodeHashId(managerUserId),
        entityType: EntityType.GRANT,
        entityId: 0,
        action: EntityManagerAction.APPROVE
      })
    )
    const [{ metadata }] = manageEntity.mock.calls[0]!
    expect(JSON.parse(metadata)).toEqual({
      grantee_address: managerWallet,
      grantor_user_id: decodeHashId(grantorUserId)
    })
  })

  it('rejects manager grants with the accepting manager wallet', async () => {
    await grants.rejectGrant({
      userId: managerUserId,
      grantorUserId
    })

    expect(GeneratedUsersApi.prototype.getUser).toHaveBeenCalledWith({
      id: managerUserId
    })
    expect(manageEntity).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: decodeHashId(managerUserId),
        entityType: EntityType.GRANT,
        entityId: 0,
        action: EntityManagerAction.REJECT
      })
    )
    const [{ metadata }] = manageEntity.mock.calls[0]!
    expect(JSON.parse(metadata)).toEqual({
      grantee_address: managerWallet,
      grantor_user_id: decodeHashId(grantorUserId)
    })
  })
})
