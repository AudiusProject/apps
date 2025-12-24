import { memo, useCallback, useContext, useState, useEffect } from 'react'

import { route } from '@audius/common/utils'
import { useLocation } from 'react-router'

import { RouterContext } from 'components/animated-switch/RouterContextProvider'
import ExploreButton from 'components/bottom-bar/buttons/ExploreButton'
import FeedButton from 'components/bottom-bar/buttons/FeedButton'
import LibraryButton from 'components/bottom-bar/buttons/LibraryButton'
import ProfileButton from 'components/bottom-bar/buttons/ProfileButton'
import TrendingButton from 'components/bottom-bar/buttons/TrendingButton'

import styles from './BottomBar.module.css'

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
  const [tempCurrentPage, setTempCurrentPage] = useState<string | null>(
    currentPage
  )

  useEffect(() => {
    setTempCurrentPage(currentPage)
  }, [currentPage, setTempCurrentPage])

  const location = useLocation()
  const { pathname } = location

  const onClick = useCallback(
    (callback: () => void, page: string | null) => () => {
      if (page === pathname) {
        window.scrollTo(0, 0)
      } else {
        setTempCurrentPage(page)
        setStackReset(true)
        setImmediate(callback)
      }
    },
    [setStackReset, pathname]
  )

  return (
    <div className={styles.bottomBar}>
      <FeedButton
        isActive={tempCurrentPage === FEED_PAGE}
        darkMode={isDarkMode}
        onClick={onClick(onClickFeed, FEED_PAGE)}
        href={FEED_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Feed Page'
      />
      <TrendingButton
        isActive={tempCurrentPage === TRENDING_PAGE}
        darkMode={isDarkMode}
        onClick={onClick(onClickTrending, TRENDING_PAGE)}
        href={TRENDING_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Trending Page'
      />
      <ExploreButton
        isActive={tempCurrentPage === EXPLORE_PAGE}
        darkMode={isDarkMode}
        onClick={onClick(onClickExplore, EXPLORE_PAGE)}
        href={EXPLORE_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Explore Page'
      />
      <LibraryButton
        isActive={
          tempCurrentPage === FAVORITES_PAGE || tempCurrentPage === LIBRARY_PAGE
        }
        darkMode={isDarkMode}
        onClick={onClick(onClickLibrary, LIBRARY_PAGE)}
        href={LIBRARY_PAGE}
        isMatrixMode={isMatrixMode}
        aria-label='Library Page'
      />
      <ProfileButton
        isActive={tempCurrentPage === userProfilePageRoute}
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
