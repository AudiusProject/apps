import { useEffect } from 'react'

import { useCurrentAccountUser, useProfileUser } from '@audius/common/api'
import { FollowSource, statusIsNotFinalized } from '@audius/common/models'
import {
  profilePageSelectors,
  chatActions,
  chatSelectors,
  reachabilitySelectors
} from '@audius/common/store'
import { useDispatch, useSelector } from 'react-redux'

import { Flex, Text } from '@audius/harmony-native'
import Skeleton from 'app/components/skeleton'
import { FollowButton, FollowsYouBadge } from 'app/components/user'
import { UserLink } from 'app/components/user-link'
import { useRoute } from 'app/hooks/useRoute'

import { EditProfileButton } from './EditProfileButton'
import { MessageButton } from './MessageButton'
import { MessageLockedButton } from './MessageLockedButton'
import { SubscribeButton } from './SubscribeButton'

const { useCanCreateChat, getChatPermissionsStatus } = chatSelectors
const { fetchBlockees, fetchBlockers, fetchPermissions } = chatActions
const { getProfileUserId } = profilePageSelectors

type ProfileInfoProps = {
  onFollow: () => void
}

export const ProfileInfo = (props: ProfileInfoProps) => {
  const { onFollow } = props
  const { params } = useRoute<'Profile'>()
  const { getIsReachable } = reachabilitySelectors
  const isReachable = useSelector(getIsReachable)
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const dispatch = useDispatch()

  const profileUserId = useSelector((state) =>
    getProfileUserId(state, params.handle)
  )
  const { canCreateChat } = useCanCreateChat(profileUserId)
  const chatPermissionStatus = useSelector(getChatPermissionsStatus)

  useEffect(() => {
    dispatch(fetchBlockees())
    dispatch(fetchBlockers())
  }, [dispatch, params, profileUserId])

  useEffect(() => {
    if (profileUserId) {
      dispatch(fetchPermissions({ userIds: [profileUserId] }))
    }
  }, [dispatch, profileUserId])

  const { user_id, handle, does_current_user_follow } =
    useProfileUser({
      select: (user) => ({
        user_id: user.user_id,
        handle: user.handle,
        does_current_user_follow: user.does_current_user_follow
      })
    }).user ?? {}

  if (!user_id) {
    return null
  }

  const profile = { user_id, handle, does_current_user_follow }

  const isOwner =
    params.handle === 'accountUser' ||
    params.handle?.toLowerCase() === accountHandle?.toLowerCase() ||
    handle === accountHandle

  const actionButtons =
    isOwner && handle ? (
      <EditProfileButton />
    ) : (
      <>
        {!isOwner ? (
          statusIsNotFinalized(chatPermissionStatus) ? (
            <Skeleton width={32} height={32} />
          ) : canCreateChat ? (
            <MessageButton userId={user_id} />
          ) : (
            <MessageLockedButton userId={user_id} />
          )
        ) : null}
        {does_current_user_follow ? (
          <SubscribeButton profile={profile} />
        ) : null}
        <FollowButton
          userId={user_id}
          onPress={onFollow}
          followSource={FollowSource.PROFILE_PAGE}
        />
      </>
    )

  return (
    <Flex pointerEvents='box-none' pv='s' gap='s'>
      <Flex
        direction='row'
        justifyContent='flex-end'
        gap='xs'
        pointerEvents='box-none'
      >
        {isReachable ? actionButtons : null}
      </Flex>
      <Flex pointerEvents='none' alignItems='flex-start' gap='2xs'>
        <UserLink userId={user_id} textVariant='title' size='l' badgeSize='m' />
        <Flex direction='row' gap='s'>
          <Text size='l' color='subdued'>
            @{handle}
          </Text>
          <FollowsYouBadge userId={user_id} />
        </Flex>
      </Flex>
    </Flex>
  )
}
