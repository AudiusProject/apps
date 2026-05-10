import { Fragment, ReactNode, useCallback, useMemo } from 'react'

import { useCurrentUserId, useIsAccountLoaded } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import type { Mood } from '@audius/sdk'
import { useNavigate } from 'react-router'

import { MIN_DESKTOP_CONTENT_WIDTH_PX } from 'common/utils/layout'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { localStorage } from 'services/local-storage'

import { ArtistSpotlightSection } from '../../../search-explore-page/components/desktop/ArtistSpotlightSection'
import { FeaturedPlaylistsSection } from '../../../search-explore-page/components/desktop/FeaturedPlaylistsSection'
import { MoodGrid } from '../../../search-explore-page/components/desktop/MoodGrid'
import { RecentlyPlayedSection } from '../../../search-explore-page/components/desktop/RecentlyPlayedSection'
import { RecommendedTracksSection } from '../../../search-explore-page/components/desktop/RecommendedTracksSection'
import { UndergroundTrendingTracksSection } from '../../../search-explore-page/components/desktop/UndergroundTrendingTracksSection'
import { HomePageIcon } from '../../icon'
import { ActiveContestsStrip } from '../ActiveContestsStrip'
import { FromPeopleYouFollowSection } from '../FromPeopleYouFollowSection'
import { StatusZone } from '../StatusZone'
import { UnauthHero } from '../UnauthHero'
import { YourTopArtistsSection } from '../YourTopArtistsSection'

const messages = {
  title: 'Home'
}

export type DesktopHomePageProps = {
  title: string
  pageTitle: string
  description: string
}

export const DesktopHomePage = ({
  pageTitle,
  description
}: DesktopHomePageProps) => {
  const navigate = useNavigate()
  const { data: currentUserId } = useCurrentUserId()
  const isAccountLoaded = useIsAccountLoaded()
  // While the account is still resolving, fall back to the synchronous
  // localStorage hint to decide what to render. Without this, unauth visitors
  // flash the personalized layout before the unauth filler swaps in (and
  // authed users flashed the unauth filler before personalized loaded).
  const cachedHasAccount = localStorage.getAudiusAccountSync()?.userId != null
  const showUserContextualContent = isAccountLoaded
    ? !!currentUserId
    : cachedHasAccount

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
        element: <StatusZone variant='desktop' />
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

  const header = <Header icon={HomePageIcon} primary={messages.title} />

  return (
    <Page
      title={pageTitle}
      description={description}
      size='large'
      header={header}
    >
      <Flex
        direction='column'
        gap='3xl'
        alignItems='stretch'
        css={{ minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX, width: '100%' }}
      >
        <Flex
          direction='column'
          gap='3xl'
          css={{
            minWidth: MIN_DESKTOP_CONTENT_WIDTH_PX,
            overflowX: 'clip',
            overflowY: 'visible'
          }}
        >
          {sectionConfigs.map(({ key, shouldRender, element }) =>
            shouldRender ? <Fragment key={key}>{element}</Fragment> : null
          )}
        </Flex>
      </Flex>
    </Page>
  )
}
