import { memo, useCallback, useContext } from 'react'

import { route } from '@audius/common/utils'
import { useLocation } from 'react-router'

import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import ExploreButton from 'components/bottom-bar/buttons/ExploreButton'
import FeedButton from 'components/bottom-bar/buttons/FeedButton'
import LibraryButton from 'components/bottom-bar/buttons/LibraryButton'
import ProfileButton from 'components/bottom-bar/buttons/ProfileButton'
import TrendingButton from 'components/bottom-bar/buttons/TrendingButton'

import styles from './BottomBar.module.css'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
  }
}

const { FEED_PAGE, TRENDING_PAGE, EXPLORE_PAGE, FAVORITES_PAGE, LIBRARY_PAGE } =
  route

type Props = {
  currentPage: string
  userProfilePageRoute: string | null
  onClickFeed: () => void
  onClickTrending: () => void
  onClickExplore: () => void
  onClickLibrary: () => void
  onClickProfile: () => void
  isDarkMode: boolean
  isMatrixMode: boolean
}

const BottomBar = ({
  currentPage,
  userProfilePageRoute,
  onClickFeed,
  onClickTrending,
  onClickExplore,
  onClickLibrary,
  onClickProfile,
  isDarkMode,
  isMatrixMode
}: Props) => {
  const { setStackReset } = useContext(RouterContext)
  const location = useLocation()
  const { pathname } = location

  const onClick = useCallback(
    (callback: () => void, page: string | null) => () => {
      if (page === pathname) {
        window.scrollTo(0, 0)
      } else {
        setStackReset(true)
        callback()
      }
    },
    [setStackReset, pathname]
  )

  return window.ReactNativeWebView?.postMessage ? null : (
    <div className={styles.bottomBar}>
      <FeedButton
        isActive={currentPage === FEED_PAGE}
        darkMode={isDarkMode}
        onClick={onClick(onClickFeed, FEED_PAGE)}
        href={FEED_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Feed Page'
      />
      <TrendingButton
        isActive={currentPage === TRENDING_PAGE}
        darkMode={isDarkMode}
        onClick={onClick(onClickTrending, TRENDING_PAGE)}
        href={TRENDING_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Trending Page'
      />
      <ExploreButton
        isActive={currentPage === EXPLORE_PAGE}
        darkMode={isDarkMode}
        onClick={onClick(onClickExplore, EXPLORE_PAGE)}
        href={EXPLORE_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Explore Page'
      />
      <LibraryButton
        isActive={
          currentPage === FAVORITES_PAGE || currentPage === LIBRARY_PAGE
        }
        darkMode={isDarkMode}
        onClick={onClick(onClickLibrary, LIBRARY_PAGE)}
        href={LIBRARY_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Library Page'
      />
      <ProfileButton
        isActive={currentPage === userProfilePageRoute}
        darkMode={isDarkMode}
        onClick={onClick(onClickProfile, userProfilePageRoute)}
        href={userProfilePageRoute || undefined}
        isMatrixMode={isMatrixMode}
        aria-label='Profile Page'
      />
    </div>
  )
}

export default memo(BottomBar)
