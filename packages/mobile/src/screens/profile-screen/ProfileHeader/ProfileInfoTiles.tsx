import type { ComponentType } from 'react'
import { useState, useMemo, useCallback } from 'react'

import {
  useCurrentUserId,
  useMutualFollowers,
  useRelatedArtistsUsers,
  useSupportedUsers,
  useSupporters,
  useUserComments,
  useUsers,
  useProfileUser
} from '@audius/common/api'
import type { UserMetadata } from '@audius/common/models'
import { Name } from '@audius/common/models'
import { View, ScrollView } from 'react-native'
import Animated, {
  FadeIn,
  LayoutAnimationConfig,
  LinearTransition
} from 'react-native-reanimated'

import {
  IconUserFollowing,
  IconUserGroup,
  Text,
  IconTrophy,
  IconTipping,
  IconMessage,
  useTheme,
  Paper
} from '@audius/harmony-native'
import { RecentUserCommentsDrawer } from 'app/components/comments/RecentUserCommentsDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import {
  ProfilePictureList,
  ProfilePictureListSkeleton
} from 'app/screens/notifications-screen/Notification'
import { make, track as trackEvent } from 'app/services/analytics'
import { makeStyles } from 'app/styles'
import type { SvgProps } from 'app/types/svg'
import { useThemePalette } from 'app/utils/theme'

import { ProfileTierTile } from './ProfileTierTile'

const MAX_CARD_PROFILE_PICTURES = 4
const PROFILE_CARD_PICTURE_SIZE = 24
const DEFAULT_RELATED_ARTISTS_COUNT = 100

const useInfoTileStyles = makeStyles(({ spacing }) => ({
  tile: { flexDirection: 'column', height: 64 },
  tileContent: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(6),
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(1)
  },
  title: {
    flexDirection: 'row',
    height: spacing(5),
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1)
  },
  content: {},
  userList: {
    height: spacing(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3)
  }
}))

const messages = {
  comments: 'Comments',
  mutuals: 'Mutuals',
  relatedArtists: 'Related Artists',
  viewAll: 'View All',
  topSupporters: 'Top Supporters',
  supportedUsers: 'Supporting'
}

type ProfileInfoTileProps = {
  icon: ComponentType<SvgProps>
  title: string
  content: React.ReactNode
  showCount?: boolean
} & (
  | {
      screen: string
      onPress?: never
    }
  | {
      screen?: never
      onPress: () => void
    }
)

const ProfileInfoTile = (props: ProfileInfoTileProps) => {
  const { screen, icon: Icon, title, content, onPress } = props
  const styles = useInfoTileStyles()
  const { neutral } = useThemePalette()
  const navigation = useNavigation()
  const { user_id } =
    useProfileUser({
      select: (user) => ({ user_id: user.user_id })
    }).user ?? {}

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress()
    } else {
      navigation.navigate(screen, { userId: user_id })
    }
  }, [navigation, screen, user_id, onPress])

  return (
    <Paper
      h={64}
      style={styles.tileContent}
      border='default'
      shadow='near'
      onPress={handlePress}
    >
      <View style={styles.title}>
        <Icon height={20} width={20} fill={neutral} />
        <Text variant='title' size='s'>
          {title}
        </Text>
      </View>
      <View style={styles.content}>{content}</View>
    </Paper>
  )
}

const UserListWithCount = ({
  users,
  count,
  loading = false,
  showCount = true
}: {
  users: UserMetadata[]
  loading?: boolean
  count: number
  showCount?: boolean
}) => {
  const styles = useInfoTileStyles()
  return (
    <View style={styles.userList}>
      {loading ? (
        <ProfilePictureListSkeleton
          count={count}
          limit={MAX_CARD_PROFILE_PICTURES}
          imageStyles={{
            width: PROFILE_CARD_PICTURE_SIZE,
            height: PROFILE_CARD_PICTURE_SIZE
          }}
        />
      ) : (
        <ProfilePictureList
          users={users}
          limit={MAX_CARD_PROFILE_PICTURES}
          showOverflowCount={false}
          interactive={false}
          imageStyles={{
            width: PROFILE_CARD_PICTURE_SIZE,
            height: PROFILE_CARD_PICTURE_SIZE
          }}
        />
      )}
      {showCount && (
        <Text variant='body' size='s' strength='strong' color='subdued'>
          {count}
        </Text>
      )}
    </View>
  )
}

const MutualsTile = ({
  userId,
  count = 0
}: {
  userId: number
  count: number | undefined
}) => {
  const { data: mutuals = [], isLoading } = useMutualFollowers({
    userId,
    pageSize: MAX_CARD_PROFILE_PICTURES
  })

  const { data: users = [] } = useUsers(mutuals)

  return (
    <ProfileInfoTile
      screen='Mutuals'
      icon={IconUserFollowing}
      title={messages.mutuals}
      content={
        <UserListWithCount users={users} count={count} loading={isLoading} />
      }
    />
  )
}

const SupportersTile = ({
  userId,
  count
}: {
  userId: number
  count: number
}) => {
  const { data: supporterRecords = [], isLoading } = useSupporters({
    userId,
    pageSize: MAX_CARD_PROFILE_PICTURES
  })

  const supporters = useMemo(() => {
    return supporterRecords.map((supporter) => supporter.sender)
  }, [supporterRecords])

  return (
    <ProfileInfoTile
      screen='TopSupporters'
      icon={IconTrophy}
      title={messages.topSupporters}
      content={
        <UserListWithCount
          users={supporters}
          count={count}
          loading={isLoading}
        />
      }
    />
  )
}

const SupportedUsersTile = ({
  userId,
  count
}: {
  userId: number
  count: number
}) => {
  const { data: supportedUserRecords = [], isLoading } = useSupportedUsers({
    userId,
    pageSize: MAX_CARD_PROFILE_PICTURES
  })

  const supportedUsers = useMemo(() => {
    return supportedUserRecords.map((supportedUser) => supportedUser.receiver)
  }, [supportedUserRecords])

  return (
    <ProfileInfoTile
      screen='SupportingUsers'
      icon={IconTipping}
      title={messages.supportedUsers}
      content={
        <UserListWithCount
          loading={isLoading}
          users={supportedUsers}
          count={count}
        />
      }
    />
  )
}

const RelatedArtistsTile = ({ userId }: { userId: number }) => {
  const { data: relatedArtists = [], isLoading } = useRelatedArtistsUsers({
    artistId: userId,
    pageSize: MAX_CARD_PROFILE_PICTURES
  })

  if (relatedArtists.length === 0) {
    return null
  }
  return (
    <ProfileInfoTile
      screen='RelatedArtists'
      icon={IconUserGroup}
      title={messages.relatedArtists}
      content={
        <UserListWithCount
          users={relatedArtists}
          count={
            isLoading
              ? MAX_CARD_PROFILE_PICTURES
              : relatedArtists.length < MAX_CARD_PROFILE_PICTURES
                ? relatedArtists.length
                : DEFAULT_RELATED_ARTISTS_COUNT
          }
          loading={isLoading}
          showCount={false}
        />
      }
    />
  )
}

const useStyles = makeStyles(({ spacing }) => ({
  rootScrollView: {
    marginHorizontal: spacing(-3)
  },
  rootScrollViewContent: {
    gap: spacing(3),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3)
  },
  staticTilesContainer: {
    flexDirection: 'row',
    gap: spacing(3)
  }
}))

export const ProfileInfoTiles = () => {
  const styles = useStyles()
  const {
    user_id,
    current_user_followee_follow_count,
    supporting_count,
    supporter_count
  } =
    useProfileUser({
      select: (user) => ({
        supporting_count: user.supporting_count,
        supporter_count: user.supporter_count,
        current_user_followee_follow_count:
          user.current_user_followee_follow_count,
        user_id: user.user_id
      })
    }).user ?? {}

  const [isRecentCommentsDrawerOpen, setIsRecentCommentsDrawerOpen] =
    useState(false)
  const onCloseRecentCommentsDrawer = useCallback(() => {
    setIsRecentCommentsDrawerOpen(false)
  }, [])
  const onOpenRecentCommentsDrawer = useCallback(() => {
    setIsRecentCommentsDrawerOpen(true)
    trackEvent(
      make({
        eventName: Name.COMMENTS_HISTORY_DRAWER_OPEN,
        userId: user_id
      })
    )
  }, [user_id])

  const { data: accountId } = useCurrentUserId()

  const hasMutuals =
    user_id !== accountId && (current_user_followee_follow_count ?? 0) > 0

  const { data: recentComments = [], isLoading: loadingComments } =
    useUserComments({ userId: user_id, pageSize: 1 })

  // Only animate if comments are not immediately visible
  const [shouldAnimate] = useState(loadingComments)

  const {
    motion: { expressive: animation }
  } = useTheme()

  const layoutAnimation = useMemo(() => {
    return shouldAnimate
      ? LinearTransition.duration(animation.duration).easing(
          animation.easing.factory()
        )
      : undefined
  }, [animation, shouldAnimate])

  const fadeInAnimation = useMemo(() => {
    return shouldAnimate
      ? FadeIn.withInitialValues({ opacity: 0 })
          .duration(animation.duration)
          .delay(animation.duration)
      : undefined
  }, [animation, shouldAnimate])

  if (!user_id) return null

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rootScrollView}
        contentContainerStyle={styles.rootScrollViewContent}
      >
        <ProfileTierTile />
        <LayoutAnimationConfig skipEntering={!shouldAnimate}>
          {recentComments.length > 0 && (
            <Animated.View entering={fadeInAnimation}>
              <ProfileInfoTile
                onPress={onOpenRecentCommentsDrawer}
                icon={IconMessage}
                title={messages.comments}
                content={
                  <Text variant='body' size='s' color='subdued'>
                    {messages.viewAll}
                  </Text>
                }
              />
            </Animated.View>
          )}
          <Animated.View
            style={styles.staticTilesContainer}
            layout={layoutAnimation}
          >
            {supporting_count && supporting_count > 0 ? (
              <SupportedUsersTile userId={user_id} count={supporting_count} />
            ) : null}
            {hasMutuals ? (
              <MutualsTile
                userId={user_id}
                count={current_user_followee_follow_count}
              />
            ) : null}
            {supporter_count && supporter_count > 0 ? (
              <SupportersTile userId={user_id} count={supporter_count} />
            ) : null}

            <RelatedArtistsTile userId={user_id} />
          </Animated.View>
        </LayoutAnimationConfig>
      </ScrollView>
      {isRecentCommentsDrawerOpen && (
        <RecentUserCommentsDrawer
          userId={user_id}
          onClose={onCloseRecentCommentsDrawer}
        />
      )}
    </>
  )
}
