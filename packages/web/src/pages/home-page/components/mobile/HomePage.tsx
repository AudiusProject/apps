import {
  Fragment,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo
} from 'react'

import { useCurrentUserId, useIsAccountLoaded } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import type { Mood } from '@audius/sdk'
import { useNavigate } from 'react-router'

import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { CenterPreset } from 'components/nav/mobile/NavContext'

import { ArtistSpotlightSection } from '../../../search-explore-page/components/desktop/ArtistSpotlightSection'
import { FeaturedPlaylistsSection } from '../../../search-explore-page/components/desktop/FeaturedPlaylistsSection'
import { MoodGrid } from '../../../search-explore-page/components/desktop/MoodGrid'
import { RecentlyPlayedSection } from '../../../search-explore-page/components/desktop/RecentlyPlayedSection'
import { RecommendedTracksSection } from '../../../search-explore-page/components/desktop/RecommendedTracksSection'
import { UndergroundTrendingTracksSection } from '../../../search-explore-page/components/desktop/UndergroundTrendingTracksSection'
import { ActiveContestsStrip } from '../ActiveContestsStrip'
import { FromPeopleYouFollowSection } from '../FromPeopleYouFollowSection'
import { StatusZone } from '../StatusZone'
import { UnauthHero } from '../UnauthHero'
import { YourTopArtistsSection } from '../YourTopArtistsSection'

const messages = {
  title: 'Home'
}

export type MobileHomePageProps = {
  title: string
  pageTitle: string
  description: string
}

export const MobileHomePage = (_props: MobileHomePageProps) => {
  const navigate = useNavigate()
  const { data: currentUserId } = useCurrentUserId()
  const isAccountLoaded = useIsAccountLoaded()
  // While the account is still resolving (e.g. during a manager-mode account
  // switch), keep the personalized layout in place rather than flashing the
  // unauthenticated view.
  const showUserContextualContent = !isAccountLoaded || !!currentUserId

  const { setCenter, setRight } = useContext(NavContext)!
  const { setHeader } = useContext(HeaderContext)

  useEffect(() => {
    setRight(null)
    setCenter(CenterPreset.LOGO)
  }, [setCenter, setRight])

  useEffect(() => {
    setHeader(<Header title={messages.title} />)
  }, [setHeader])

  const onMoodClick = useCallback(
    (mood: Mood) => {
      navigate(route.searchPage({ category: 'tracks', mood }))
    },
    [navigate]
  )

  const sectionConfigs = useMemo<
    { key: string; shouldRender: boolean; element: ReactNode }[]
  >(
    () => [
      {
        key: 'unauth-hero',
        shouldRender: !showUserContextualContent,
        element: <UnauthHero />
      },
      {
        key: 'status-zone',
        shouldRender: showUserContextualContent,
        element: <StatusZone variant='mobile' />
      },
      {
        key: 'recommended-tracks',
        shouldRender: showUserContextualContent,
        element: <RecommendedTracksSection />
      },
      {
        key: 'recently-played',
        shouldRender: showUserContextualContent,
        element: <RecentlyPlayedSection />
      },
      {
        key: 'active-contests',
        shouldRender: true,
        element: <ActiveContestsStrip />
      },
      {
        key: 'featured-playlists',
        shouldRender: true,
        element: <FeaturedPlaylistsSection />
      },
      {
        key: 'top-artists',
        shouldRender: showUserContextualContent,
        element: <YourTopArtistsSection />
      },
      {
        key: 'from-follows',
        shouldRender: showUserContextualContent,
        element: <FromPeopleYouFollowSection />
      },
      {
        key: 'underground-trending',
        shouldRender: true,
        element: <UndergroundTrendingTracksSection />
      },
      {
        key: 'artist-spotlight',
        shouldRender: true,
        element: <ArtistSpotlightSection />
      },
      {
        key: 'mood-grid',
        shouldRender: true,
        element: <MoodGrid onMoodClick={onMoodClick} />
      }
    ],
    [showUserContextualContent, onMoodClick]
  )

  return (
    <MobilePageContainer
      title={messages.title}
      containerClassName='home-page'
      hasDefaultHeader
    >
      <Flex direction='column' w='100%' style={{ overflow: 'hidden' }}>
        <Flex direction='column' mt='l' gap='2xl' pb='l'>
          {sectionConfigs.map(({ key, shouldRender, element }) =>
            shouldRender ? <Fragment key={key}>{element}</Fragment> : null
          )}
        </Flex>
      </Flex>
    </MobilePageContainer>
  )
}
