import { useCallback, useMemo, useRef } from 'react'

import { selectIsGuestAccount, useCurrentAccountUser } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router'

import {
  openSignOn,
  showRequiresAccountToast
} from 'common/store/pages/signon/actions'
import BottomBar from 'components/bottom-bar/BottomBar'
import { getPathname } from 'utils/route'
import { isDarkMode, isMatrix } from 'utils/theme/theme'
const { FEED_PAGE, TRENDING_PAGE, EXPLORE_PAGE, profilePage, LIBRARY_PAGE } =
  route

const ConnectedBottomBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      handle: user?.handle,
      isGuestAccount: selectIsGuestAccount(user)
    })
  })
  const { handle, isGuestAccount } = accountData ?? {}
  const userProfilePage = handle ? profilePage(handle) : null

  // Memoize navRoutes to avoid recreating Set on every render
  // Filter out null values to ensure Set stability
  const navRoutes = useMemo(() => {
    const routes = [FEED_PAGE, TRENDING_PAGE, EXPLORE_PAGE, LIBRARY_PAGE]
    if (userProfilePage) {
      routes.push(userProfilePage)
    }
    return new Set(routes)
  }, [userProfilePage])

  // Use ref to track last nav route synchronously (avoids render loops)
  // This is critical for React Router v7 compatibility where location updates
  // can happen before component re-renders
  const lastNavRouteRef = useRef(FEED_PAGE)
  const currentRoute = getPathname(location)

  // Compute current page synchronously: use current route if it's a nav route,
  // otherwise keep the last nav route. Update ref during computation to avoid useEffect.
  const currentPage = useMemo(() => {
    if (navRoutes.has(currentRoute)) {
      lastNavRouteRef.current = currentRoute
      return currentRoute
    }
    return lastNavRouteRef.current
  }, [currentRoute, navRoutes])

  const goToRoute = useCallback(
    (route: string) => {
      const currentPath = getPathname(location)
      // Prevent navigating to the same route
      if (currentPath === route) {
        return
      }
      navigate(route)
    },
    [navigate, location]
  )

  const handleOpenSignOn = useCallback(() => {
    dispatch(openSignOn(false))
    dispatch(showRequiresAccountToast())
  }, [dispatch])

  const goToFeed = useCallback(() => {
    if (!handle) {
      handleOpenSignOn()
    } else {
      goToRoute(FEED_PAGE)
    }
  }, [goToRoute, handle, handleOpenSignOn])

  const goToTrending = useCallback(() => {
    goToRoute(TRENDING_PAGE)
  }, [goToRoute])

  const goToExplore = useCallback(() => {
    goToRoute(EXPLORE_PAGE)
  }, [goToRoute])

  const goToLibrary = useCallback(() => {
    if (!handle && !isGuestAccount) {
      handleOpenSignOn()
    } else {
      goToRoute(LIBRARY_PAGE)
    }
  }, [goToRoute, handle, isGuestAccount, handleOpenSignOn])

  const goToProfile = useCallback(() => {
    if (!handle) {
      handleOpenSignOn()
    } else {
      goToRoute(profilePage(handle))
    }
  }, [goToRoute, handle, handleOpenSignOn])

  return (
    <BottomBar
      currentPage={currentPage}
      userProfilePageRoute={userProfilePage}
      onClickFeed={goToFeed}
      onClickTrending={goToTrending}
      onClickExplore={goToExplore}
      onClickLibrary={goToLibrary}
      onClickProfile={goToProfile}
      isDarkMode={isDarkMode()}
      isMatrixMode={isMatrix()}
    />
  )
}

export default ConnectedBottomBar
