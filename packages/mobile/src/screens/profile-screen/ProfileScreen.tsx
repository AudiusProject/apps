import { useCallback } from 'react'

import { useUserByParams } from '@audius/common/api'
import {
  profilePageActions,
  reachabilitySelectors,
  ProfilePageTabs
} from '@audius/common/store'
import { encodeUrlName } from '@audius/common/utils'
import { PortalHost } from '@gorhom/portal'
import { useFocusEffect, useNavigationState } from '@react-navigation/native'
import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { Screen, ScreenContent } from 'app/components/core'
import { ScreenPrimaryContent } from 'app/components/core/Screen/ScreenPrimaryContent'
import { ScreenSecondaryContent } from 'app/components/core/Screen/ScreenSecondaryContent'
import { OfflinePlaceholder } from 'app/components/offline-placeholder'
import { useRoute } from 'app/hooks/useRoute'
import { useStatusBarStyle } from 'app/hooks/useStatusBarStyle'
import { makeStyles } from 'app/styles'

import { DeactivatedProfileTombstone } from './DeactivatedProfileTombstone'
import { ProfileHeader } from './ProfileHeader'
import { ProfileScreenSkeleton } from './ProfileScreenSkeleton'
import { ProfileTabNavigator } from './ProfileTabs/ProfileTabNavigator'
import { useRefreshProfile } from './useRefreshProfile'
const { setCurrentUser: setCurrentUserAction } = profilePageActions
const { getIsReachable } = reachabilitySelectors

const useStyles = makeStyles(() => ({
  navigator: {
    height: '100%'
  }
}))

export const ProfileScreen = () => {
  const styles = useStyles()
  const { params } = useRoute<'Profile'>()
  const { handle: userHandle } = params
  const { data: profile } = useUserByParams(params, {
    select: (user) => ({
      user_id: user.user_id,
      handle: user.handle,
      track_count: user.track_count,
      does_current_user_follow: user.does_current_user_follow,
      is_deactivated: user.is_deactivated
    })
  })
  const handle =
    userHandle && userHandle !== 'accountUser' ? userHandle : profile?.handle
  const handleLower = handle?.toLowerCase() ?? ''
  const dispatch = useDispatch()
  const isNotReachable = useSelector(getIsReachable) === false

  const setCurrentUser = useCallback(() => {
    dispatch(setCurrentUserAction(handleLower))
  }, [dispatch, handleLower])

  const currentTab = useNavigationState((state) => {
    const tabIndex = state.routes[state.index]?.state?.index
    if (tabIndex === undefined) {
      return ProfilePageTabs.TRACKS
    }
    if (profile?.track_count && profile?.track_count > 0) {
      switch (tabIndex) {
        case 0:
          return ProfilePageTabs.TRACKS
        case 1:
          return ProfilePageTabs.ALBUMS
        case 2:
          return ProfilePageTabs.PLAYLISTS
        case 3:
          return ProfilePageTabs.REPOSTS
        default:
          return ProfilePageTabs.TRACKS
      }
    }
    switch (tabIndex) {
      case 0:
        return ProfilePageTabs.REPOSTS
      case 1:
        return ProfilePageTabs.PLAYLISTS
      default:
        return ProfilePageTabs.REPOSTS
    }
  }) as ProfilePageTabs

  const { handleRefresh, isRefreshing } = useRefreshProfile(
    profile,
    handleLower,
    currentTab
  )

  useFocusEffect(setCurrentUser)
  useStatusBarStyle('light-content')

  const renderHeader = useCallback(() => <ProfileHeader />, [])

  return (
    <Screen url={handle && `/${encodeUrlName(handle)}`}>
      <ScreenContent isOfflineCapable>
        {!profile ? (
          <ProfileScreenSkeleton />
        ) : profile.is_deactivated ? (
          <DeactivatedProfileTombstone />
        ) : (
          <>
            <View style={styles.navigator}>
              {isNotReachable ? (
                <>
                  <OfflinePlaceholder />
                </>
              ) : (
                <>
                  <ScreenPrimaryContent skeleton={<ProfileScreenSkeleton />}>
                    <PortalHost name='PullToRefreshPortalHost' />
                  </ScreenPrimaryContent>
                  <ScreenSecondaryContent skeleton={<ProfileScreenSkeleton />}>
                    <ProfileTabNavigator
                      renderHeader={renderHeader}
                      refreshing={isRefreshing}
                      onRefresh={handleRefresh}
                    />
                  </ScreenSecondaryContent>
                </>
              )}
            </View>
          </>
        )}
      </ScreenContent>
    </Screen>
  )
}
