import { useCallback } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { useCurrentUserId } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { CommonState } from '~/store'
import {
  chatActions,
  chatSelectors,
  InboxSettingsFormValues
} from '~/store/pages'
import { transformMapToPermitList } from '~/utils/chatUtils'

const { fetchPermissions } = chatActions
const { getChatPermissionsStatus, getUserChatPermissions } = chatSelectors

export const useSetInboxPermissions = () => {
  const { audiusSdk } = useQueryContext()
  const dispatch = useDispatch()
  const { data: userId } = useCurrentUserId()
  const permissions = useSelector((state: CommonState) =>
    getUserChatPermissions(state, userId)
  )
  const permissionsStatus = useSelector(getChatPermissionsStatus)

  const doFetchPermissions = useCallback(() => {
    if (userId) {
      dispatch(fetchPermissions({ userIds: [userId] }))
    }
  }, [dispatch, userId])

  const savePermissions = useCallback(
    async (permitMap: InboxSettingsFormValues) => {
      try {
        const sdk = await audiusSdk()
        const permitList = transformMapToPermitList(permitMap)
        await sdk.chats.permit({ permitList, allow: true })
        doFetchPermissions()
      } catch (e) {
        console.error('Chats', e as Error)
      }
    },
    [audiusSdk, doFetchPermissions]
  )

  return {
    /**
     * The current user's permissions.
     */
    permissions,
    /**
     * The current permissions status.
     */
    permissionsStatus,
    /**
     * Fetches the current user's permissions from the backend.
     */
    doFetchPermissions,
    /**
     * Saves the current user's permissions to the backend.
     */
    savePermissions
  }
}
