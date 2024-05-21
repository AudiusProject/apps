import dayjs from 'dayjs'

import { createApi } from '~/audius-query'
import {
  ID,
  User,
  UserMetadata,
  managedUserListFromSDK,
  userManagerListFromSDK
} from '~/models'

import { Id } from './utils'

type ResetPasswordArgs = {
  email: string
  password: string
}

type RequestAddManagerPayload = {
  userId: number
  managerUser: UserMetadata | User
}

type RemoveManagerPayload = {
  userId: number
  managerUserId: number
}

type ApproveManagedAccountPayload = {
  userId: number
  grantorUser: UserMetadata | User
}

const accountApi = createApi({
  reducerPath: 'accountApi',
  endpoints: {
    getCurrentUserId: {
      async fetch(_, context) {
        const { audiusBackend } = context
        const account = await audiusBackend.getAccount()
        return account?.user_id || null
      },
      options: {
        type: 'query'
      }
    },
    getCurrentWeb3User: {
      async fetch(_, { audiusBackend }) {
        const libs = await audiusBackend.getAudiusLibsTyped()
        // TODO: https://linear.app/audius/issue/PAY-2838/separate-walletentropy-user-and-current-user-in-state
        // What happens in the cache if something here is null?

        // Note: This cast is mostly safe, but is missing info populated in AudiusBackend.getAccount()
        // Okay for now as that info isn't generally available on non-account users and isn't used in manager mode.
        return libs.Account?.getWeb3User() as UserMetadata | null
      },
      options: {
        type: 'query',
        schemaKey: 'currentWeb3User'
      }
    },
    resetPassword: {
      async fetch(args: ResetPasswordArgs, context) {
        const { email, password } = args
        const { audiusBackend } = context

        await audiusBackend.resetPassword(email, password)
        return { status: 'ok' }
      },
      options: {
        type: 'mutation'
      }
    },
    getManagedAccounts: {
      async fetch({ userId }: { userId: ID }, { audiusSdk }) {
        const sdk = await audiusSdk()
        const managedUsers = await sdk.full.users.getManagedUsers({
          id: Id.parse(userId)
        })

        const { data = [] } = managedUsers
        return managedUserListFromSDK(data)
      },
      options: {
        type: 'query',
        idArgKey: 'manager.user_id',
        schemaKey: 'managedUsers'
      }
    },
    getManagers: {
      async fetch({ userId }: { userId: ID }, { audiusSdk }) {
        const sdk = await audiusSdk()
        const managedUsers = await sdk.full.users.getManagers({
          id: Id.parse(userId)
        })

        const { data: rawData = [] } = managedUsers
        const data = rawData.filter((g) => g.grant.isApproved !== false)
        return userManagerListFromSDK(data)
      },
      options: {
        type: 'query',
        idArgKey: 'user.user_id',
        schemaKey: 'userManagers'
      }
    },
    requestAddManager: {
      async fetch(payload: RequestAddManagerPayload, { audiusSdk }) {
        const { managerUser, userId } = payload
        const managerUserId = managerUser.user_id
        const encodedUserId = Id.parse(userId) as string
        const encodedManagerUserId = Id.parse(managerUserId)
        const sdk = await audiusSdk()

        await sdk.grants.addManager({
          userId: encodedUserId,
          managerUserId: encodedManagerUserId
        })

        return payload
      },
      options: {
        idArgKey: 'managerUser.user_id',
        type: 'mutation',
        schemaKey: 'userManagers'
      },
      async onQuerySuccess(
        _res,
        payload: RequestAddManagerPayload,
        { dispatch }
      ) {
        const { userId, managerUser } = payload
        dispatch(
          accountApi.util.updateQueryData(
            'getManagers',
            { userId },
            (state) => {
              const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
              // TODO(C-4330) - The state type is incorrect - fix.
              // @ts-expect-error
              state.userManagers.push({
                grant: {
                  created_at: currentTime,
                  grantee_address: managerUser.erc_wallet ?? managerUser.wallet,
                  is_approved: null,
                  is_revoked: false,
                  updated_at: currentTime,
                  user_id: userId
                },
                manager: managerUser
              })
            }
          )
        )
      }
    },
    removeManager: {
      async fetch(payload: RemoveManagerPayload, { audiusSdk }) {
        const { managerUserId, userId } = payload
        const encodedUserId = Id.parse(userId) as string
        const encodedManagerUserId = Id.parse(managerUserId)
        const sdk = await audiusSdk()

        await sdk.grants.removeManager({
          userId: encodedUserId,
          managerUserId: encodedManagerUserId
        })

        return payload
      },
      options: {
        idArgKey: 'managerUserId',
        type: 'mutation',
        schemaKey: 'userManagers'
      },
      async onQueryStarted(payload: RemoveManagerPayload, { dispatch }) {
        const { managerUserId, userId } = payload
        dispatch(
          accountApi.util.updateQueryData(
            'getManagedAccounts',
            { userId: managerUserId },
            (state) => {
              // TODO(C-4330) - The state type is incorrect - fix.
              // @ts-expect-error
              const foundIndex = state.managedUsers?.findIndex(
                (m: { user: number }) => m.user === userId
              )
              if (foundIndex != null && foundIndex > -1) {
                // @ts-expect-error (C-4330)
                state.managedUsers.splice(foundIndex, 1)
              }
            }
          )
        )
        dispatch(
          accountApi.util.updateQueryData(
            'getManagers',
            { userId },
            (state) => {
              // TODO(C-4330) - The state type is incorrect - fix.
              // @ts-expect-error
              const foundIndex = state.userManagers?.findIndex(
                (m: { manager: number }) => {
                  return m.manager === managerUserId
                }
              )
              if (foundIndex != null && foundIndex > -1) {
                // @ts-expect-error (C-4330)
                state.userManagers.splice(foundIndex, 1)
              }
            }
          )
        )
      }
      // TODO(C-4331) - Add onQueryErrored for cleaning up optimistic update if the call fails.
    },
    approveManagedAccount: {
      async fetch(payload: ApproveManagedAccountPayload, { audiusSdk }) {
        const { grantorUser, userId } = payload
        const grantorUserId = grantorUser.user_id
        const encodedUserId = Id.parse(userId) as string
        const encodedGrantorUserId = Id.parse(grantorUserId)
        const sdk = await audiusSdk()

        await sdk.grants.approveGrant({
          userId: encodedUserId,
          grantorUserId: encodedGrantorUserId
        })

        return payload
      },
      options: {
        idArgKey: 'grantorUser.user_id',
        type: 'mutation'
      },
      async onQueryStarted(
        payload: ApproveManagedAccountPayload,
        { dispatch }
      ) {
        const { userId, grantorUser } = payload
        dispatch(
          accountApi.util.updateQueryData(
            'getManagedAccounts',
            { userId },
            (state) => {
              const currentTime = dayjs().format('YYYY-MM-DD HH:mm:ss')
              // TODO(C-4330) - The state type is incorrect - fix.
              // @ts-expect-error
              const foundIndex = state.managedUsers.findIndex(
                (m: { user: number }) => m.user === grantorUser.user_id
              )
              // @ts-expect-error
              state.managedUsers.splice(foundIndex, 1, {
                grant: {
                  created_at: currentTime,
                  // TODO(nkang - C-4332) - Fill this in
                  grantee_address: '',
                  is_approved: true,
                  is_revoked: false,
                  updated_at: currentTime,
                  user_id: userId
                },
                user: grantorUser
              })
            }
          )
        )
      }
      // TODO(C-4331) - Add onQueryErrored for cleaning up optimistic update if the call fails.
    }
  }
})

export const {
  useGetCurrentUserId,
  useGetCurrentWeb3User,
  useResetPassword,
  useGetManagedAccounts,
  useGetManagers,
  useRequestAddManager,
  useApproveManagedAccount,
  useRemoveManager
} = accountApi.hooks

export const accountApiReducer = accountApi.reducer
