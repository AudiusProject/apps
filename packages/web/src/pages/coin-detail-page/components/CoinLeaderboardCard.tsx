import {
  useArtistCoinMembers,
  useArtistCoinMembersCount,
  useUsers
} from '@audius/common/api'
import { coinDetailsMessages } from '@audius/common/messages'
import { LEADERBOARD_USERS_ROUTE } from '@audius/common/src/utils/route'
import { coinLeaderboardUserListActions } from '@audius/common/store'
import {
  Flex,
  Paper,
  Text,
  Divider,
  Skeleton,
  IconCaretRight,
  IconButton,
  useMedia
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { UserProfilePictureList } from 'components/user-profile-picture-list'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  setUsers,
  setVisibility
} from 'store/application/ui/userListModal/slice'
import {
  UserListEntityType,
  UserListType
} from 'store/application/ui/userListModal/types'
import { push } from 'utils/navigation'

const messages = coinDetailsMessages.coinLeaderboard

const AvatarSkeleton = (props: any) => (
  <Skeleton
    h={40}
    w={40}
    borderRadius='circle'
    css={{ marginLeft: '-8px' }}
    {...props}
  />
)

type CoinLeaderboardCardProps = {
  mint: string
}

export const CoinLeaderboardCard = ({ mint }: CoinLeaderboardCardProps) => {
  const { isMedium: isSmallScreen } = useMedia() // <1024px
  const numUsersShowing = isSmallScreen ? 6 : 8
  const { data: leaderboardUsers, isPending: isLeaderboardPending } =
    useArtistCoinMembers({ mint })
  const userListUserIds = leaderboardUsers
    ?.slice(0, numUsersShowing)
    .map((user) => user.userId)
  const { data: users, isPending: isUsersPending } = useUsers(userListUserIds)

  const dispatch = useDispatch()
  const isPending = isLeaderboardPending || isUsersPending
  const isMobile = useIsMobile()

  const { data: membersCount = 0 } = useArtistCoinMembersCount({ mint })

  const handleViewLeaderboard = () => {
    if (isMobile) {
      dispatch(coinLeaderboardUserListActions.setCoinLeaderboard(mint))
      dispatch(push(LEADERBOARD_USERS_ROUTE))
    } else {
      dispatch(
        setUsers({
          userListType: UserListType.COIN_LEADERBOARD,
          entityType: UserListEntityType.USER,
          entity: mint
        })
      )
      dispatch(setVisibility(true))
    }
  }

  if (leaderboardUsers?.length === 0) {
    return null
  }

  return (
    <Paper
      borderRadius='l'
      shadow='far'
      column
      alignItems='flex-start'
      border='default'
    >
      <Flex alignItems='center' gap='xs' pv='l' ph='xl'>
        <Text variant='heading' size='s'>
          {messages.title}
        </Text>
        {membersCount ? (
          <Text variant='heading' size='s' color='subdued'>
            ({membersCount})
          </Text>
        ) : null}
      </Flex>
      <Divider css={{ width: '100%' }} />
      <Flex
        pv='l'
        ph='xl'
        justifyContent='space-between'
        alignItems='center'
        w='100%'
        onClick={handleViewLeaderboard}
        css={{ cursor: 'pointer' }}
        role='button'
      >
        {isPending ? (
          <Flex alignItems='center'>
            <AvatarSkeleton css={{ marginLeft: '0' }} />
            <AvatarSkeleton />
            <AvatarSkeleton />
            <AvatarSkeleton />
            <AvatarSkeleton />
            <AvatarSkeleton />
            <AvatarSkeleton />
            <AvatarSkeleton />
          </Flex>
        ) : (
          <Flex>
            <UserProfilePictureList
              users={users ?? []}
              limit={isSmallScreen ? 6 : 8}
              disableProfileClick={true}
              disablePopover={true}
            />
          </Flex>
        )}
        <IconButton
          color='subdued'
          icon={IconCaretRight}
          aria-label='Open the leaderboard modal'
          onClick={handleViewLeaderboard}
          disabled={isPending}
        />
      </Flex>
    </Paper>
  )
}
