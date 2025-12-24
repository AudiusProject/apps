import { useCallback, useEffect } from 'react'

import {
  notificationsUserListSelectors,
  coinLeaderboardUserListSelectors,
  TOKEN_LISTING_MAP
} from '@audius/common/store'
import {
  Modal,
  Scrollbar,
  IconTipping as IconTip,
  IconUser,
  IconUserGroup,
  IconTrophy,
  IconUserFollowing as IconFollowing,
  IconCart,
  IconRemix,
  ModalHeader,
  ModalTitle
} from '@audius/harmony'
import { ChatBlastAudience } from '@audius/sdk'
import { useDispatch, useSelector } from 'react-redux'
import { useMatch, useLocation } from 'react-router'

import { CoinLeaderboardUserList } from 'components/user-list/lists/CoinLeaderboardUserList'
import { FavoritesUserList } from 'components/user-list/lists/FavoritesUserList'
import { FollowingUserList } from 'components/user-list/lists/FollowingUserList'
import { MutualsUserList } from 'components/user-list/lists/MutualsUserList'
import { NotificationsUserList } from 'components/user-list/lists/NotificationsUserList'
import { PurchasersUserList } from 'components/user-list/lists/PurchasersUserList'
import { RelatedArtistsUserList } from 'components/user-list/lists/RelatedArtistsUserList'
import { RemixersUserList } from 'components/user-list/lists/RemixersUserList'
import { RepostsUserList } from 'components/user-list/lists/RepostsUserList'
import { SupportingUserList } from 'components/user-list/lists/SupportingUserList'
import { TopSupportersUserList } from 'components/user-list/lists/TopSupportersUserList'
import { ChatBlastWithAudienceCTA } from 'pages/chat-page/components/ChatBlastWithAudienceCTA'
import {
  getUserListType,
  getIsOpen
} from 'store/application/ui/userListModal/selectors'
import { setVisibility } from 'store/application/ui/userListModal/slice'
import { UserListType } from 'store/application/ui/userListModal/types'

import { FollowersUserList } from '../user-list/lists/FollowersUserList'
const { getPageTitle } = notificationsUserListSelectors

const messages = {
  reposts: 'Reposts',
  favorites: 'Favorites',
  followers: 'Followers',
  following: 'Following',
  topSupporters: 'Top Supporters',
  supporting: 'Supporting',
  relatedArtists: 'Related Artists',
  mutuals: 'Mutuals',
  purchasers: 'Purchasers',
  remixers: 'Remixers',
  coinLeaderboard: 'Members'
}

export const UserListModal = () => {
  const dispatch = useDispatch()
  const userListType = useSelector(getUserListType)
  const isOpen = useSelector(getIsOpen)
  const location = useLocation()
  const notificationTitle = useSelector(getPageTitle)
  const mint = useSelector(coinLeaderboardUserListSelectors.getMint)

  const onClose = useCallback(() => dispatch(setVisibility(false)), [dispatch])

  // Close the modal when the user navigates to another page
  useEffect(() => {
    if (isOpen) {
      return () => {
        onClose()
      }
    }
  }, [location.pathname, isOpen, onClose])

  const match = useMatch('/messages/:audience_type')
  const isChatBlastPath =
    match?.params?.audience_type &&
    Object.values(ChatBlastAudience).includes(
      match.params.audience_type as ChatBlastAudience
    )

  const getUserList = () => {
    switch (userListType) {
      case UserListType.FAVORITE:
        return {
          component: <FavoritesUserList />,
          title: messages.favorites
        }
      case UserListType.REPOST:
        return {
          component: <RepostsUserList />,
          title: messages.reposts
        }
      case UserListType.FOLLOWER:
        return {
          Icon: IconUser,
          component: <FollowersUserList />,
          title: messages.followers
        }
      case UserListType.FOLLOWING:
        return {
          Icon: IconFollowing,
          component: <FollowingUserList />,
          title: messages.following
        }
      case UserListType.NOTIFICATION:
        return {
          component: <NotificationsUserList />,
          Icon: IconTrophy,
          title: notificationTitle
        }
      case UserListType.SUPPORTER:
        return {
          component: <TopSupportersUserList />,
          Icon: IconTrophy,
          title: messages.topSupporters
        }
      case UserListType.SUPPORTING:
        return {
          component: <SupportingUserList />,
          Icon: IconTip,
          title: messages.supporting
        }
      case UserListType.MUTUAL_FOLLOWER:
        return {
          component: <MutualsUserList />,
          Icon: IconFollowing,
          title: messages.mutuals
        }
      case UserListType.RELATED_ARTISTS:
        return {
          component: <RelatedArtistsUserList />,
          Icon: IconUserGroup,
          title: messages.relatedArtists
        }
      case UserListType.PURCHASER:
        return {
          component: <PurchasersUserList />,
          Icon: IconCart,
          title: messages.purchasers
        }
      case UserListType.REMIXER:
        return {
          component: <RemixersUserList />,
          Icon: IconRemix,
          title: messages.remixers
        }
      case UserListType.COIN_LEADERBOARD: {
        const ticker =
          TOKEN_LISTING_MAP[
            mint?.toUpperCase() as keyof typeof TOKEN_LISTING_MAP
          ]?.symbol
        return {
          component: <CoinLeaderboardUserList />,
          title: ticker
            ? `$${ticker} ${messages.coinLeaderboard}`
            : messages.coinLeaderboard
        }
      }
      default:
        return {}
    }
  }

  const { component, title, Icon } = getUserList()

  return (
    <Modal isOpen={isOpen} onClose={onClose} css={{ width: 560 }}>
      <ModalHeader>
        <ModalTitle title={title} Icon={Icon} />
      </ModalHeader>
      <Scrollbar>{component}</Scrollbar>
      {!isChatBlastPath &&
      (userListType === UserListType.FOLLOWER ||
        userListType === UserListType.SUPPORTER) ? (
        <ChatBlastWithAudienceCTA
          audience={
            userListType === UserListType.FOLLOWER
              ? ChatBlastAudience.FOLLOWERS
              : ChatBlastAudience.TIPPERS
          }
          onClick={onClose}
        />
      ) : null}
    </Modal>
  )
}
