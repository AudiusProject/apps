import { useCallback, useEffect, useMemo } from 'react'

import { useMutedUsers, useProfileUser } from '@audius/common/api'
import { commentsMessages } from '@audius/common/messages'
import { ShareSource } from '@audius/common/models'
import {
  chatActions,
  chatSelectors,
  shareModalUIActions
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import ActionDrawer from 'app/components/action-drawer'
import { setVisibility } from 'app/store/drawers/slice'

const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { getBlockees } = chatSelectors
const { fetchBlockees } = chatActions

const PROFILE_ACTIONS_MODAL_NAME = 'ProfileActions'

const messages = {
  shareProfile: 'Share Profile',
  blockMessages: 'Block Messages',
  unblockMessages: 'Unblock Messages'
}

export const ProfileActionsDrawer = () => {
  const dispatch = useDispatch()
  const { user } = useProfileUser()
  const userId = user?.user_id
  const blockeeList = useSelector(getBlockees)
  const isBlockee = userId ? blockeeList.includes(userId) : false

  const { data: mutedUsers } = useMutedUsers()
  const isMuted = mutedUsers?.some((user) => user.user_id === userId) ?? false
  useEffect(() => {
    dispatch(fetchBlockees())
  }, [dispatch])

  const handleShareProfilePress = useCallback(() => {
    dispatch(
      setVisibility({
        drawer: 'ProfileActions',
        visible: false
      })
    )
    if (userId) {
      dispatch(
        requestOpenShareModal({
          type: 'profile',
          profileId: userId,
          source: ShareSource.PAGE
        })
      )
    }
  }, [userId, dispatch])

  const handleBlockMessagesPress = useCallback(() => {
    dispatch(
      setVisibility({
        drawer: 'ProfileActions',
        visible: false
      })
    )
    if (userId) {
      dispatch(
        setVisibility({
          drawer: 'BlockMessages',
          visible: true,
          data: { userId }
        })
      )
    }
  }, [dispatch, userId])

  const handleMuteCommentPress = useCallback(() => {
    if (userId) {
      dispatch(
        setVisibility({
          drawer: 'ProfileActions',
          visible: false
        })
      )
      if (userId) {
        dispatch(
          setVisibility({
            drawer: 'MuteComments',
            visible: true,
            data: { userId, isMuted }
          })
        )
      }
    }
  }, [dispatch, isMuted, userId])

  const rows = useMemo(
    () => [
      { text: messages.shareProfile, callback: handleShareProfilePress },
      {
        text: isBlockee ? messages.unblockMessages : messages.blockMessages,
        callback: handleBlockMessagesPress
      },
      {
        text: isMuted
          ? commentsMessages.popups.unmuteUser.title
          : commentsMessages.popups.muteUser.title,
        callback: handleMuteCommentPress
      }
    ],
    [
      handleShareProfilePress,
      isBlockee,
      handleBlockMessagesPress,
      isMuted,
      handleMuteCommentPress
    ]
  )

  return <ActionDrawer modalName={PROFILE_ACTIONS_MODAL_NAME} rows={rows} />
}
