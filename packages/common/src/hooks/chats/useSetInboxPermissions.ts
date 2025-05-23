import { useCallback } from 'react'

import { useDispatch, useSelector } from 'react-redux'

import { useCurrentUserId } from '~/api'
import { useQueryContext } from '~/api/tan-query/utils'
import { useAppContext } from '~/context/appContext'
import { Name } from '~/models/Analytics'
import {
  chatActions,
  chatSelectors,
  InboxSettingsFormValues
} from '~/store/pages'
import { transformMapToPermitList } from '~/utils/chatUtils'

const { fetchPermissions } = chatActions
const { getChatPermissionsStatus, getUserChatPermissions } = chatSelectors

export const useSetInboxPermissions = () => {
  const { audiusSdk, reportToSentry } = useQueryContext()
  const dispatch = useDispatch()
  const permissions = useSelector(getUserChatPermissions)
  const {
    analytics: { track, make }
  } = useAppContext()
  const permissionsStatus = useSelector(getChatPermissionsStatus)
  const { data: userId } = useCurrentUserId()

  const doFetchPermissions = useCallback(() => {
    if (userId) {
      dispatch(fetchPermissions({ userIds: [userId] }))
    }
  }, [dispatch, userId])

  const savePermissions = useCallback(
    async (permitMap: InboxSettingsFormValues) => {
      let permitList
      try {
        const sdk = await audiusSdk()
        permitList = transformMapToPermitList(permitMap)
        await sdk.chats.permit({ permitList, allow: true })
        doFetchPermissions()
        track(
          make({
            eventName: Name.CHANGE_INBOX_SETTINGS_SUCCESS,
            permitList
          })
        )
      } catch (e) {
        reportToSentry({
          name: 'Chats',
          error: e as Error
        })
        track(
          make({
            eventName: Name.CHANGE_INBOX_SETTINGS_FAILURE,
            permitList
          })
        )
      }
    },
    [audiusSdk, doFetchPermissions, track, make, reportToSentry]
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
