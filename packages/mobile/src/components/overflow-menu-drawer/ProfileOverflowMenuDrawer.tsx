import type React from 'react'

import { useUser } from '@audius/common/api'
import type { ID } from '@audius/common/models'
import { ShareSource, FollowSource } from '@audius/common/models'
import type { OverflowActionCallbacks } from '@audius/common/store'
import {
  usersSocialActions,
  mobileOverflowMenuUISelectors,
  shareModalUIActions,
  OverflowAction
} from '@audius/common/store'
import { pick } from 'lodash'
import { useDispatch, useSelector } from 'react-redux'
const { getMobileOverflowModal } = mobileOverflowMenuUISelectors
const { requestOpen: requestOpenShareModal } = shareModalUIActions
const { followUser, unfollowUser } = usersSocialActions

type Props = {
  render: (callbacks: OverflowActionCallbacks) => React.ReactElement
}

const ProfileOverflowMenuDrawer = ({ render }: Props) => {
  const dispatch = useDispatch()
  const { id: modalId } = useSelector(getMobileOverflowModal)
  const id = modalId as ID
  const { data: partialUser } = useUser(id, {
    select: (user) => pick(user, 'handle', 'name')
  })

  const { handle, name } = partialUser ?? {}

  if (!id || !handle || !name) {
    return null
  }

  const callbacks = {
    [OverflowAction.FOLLOW]: () =>
      dispatch(followUser(id, FollowSource.OVERFLOW)),
    [OverflowAction.UNFOLLOW]: () =>
      dispatch(unfollowUser(id, FollowSource.OVERFLOW)),
    [OverflowAction.SHARE]: () => {
      dispatch(
        requestOpenShareModal({
          type: 'profile',
          profileId: id,
          source: ShareSource.OVERFLOW
        })
      )
    }
  }

  return render(callbacks)
}

export default ProfileOverflowMenuDrawer
