import { useCallback } from 'react'

import { useAllRemixContests } from '@audius/common/api'
import { route } from '@audius/common/utils'
import {
  Box,
  Button,
  Flex,
  IconTrophy,
  Text,
  LoadingSpinner
} from '@audius/harmony'
import InfiniteScroll from 'react-infinite-scroller'
import { Link } from 'react-router'

import { ContestCard, ContestCardSkeleton } from 'components/contest-card'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'
import { useMainContentRef } from 'pages/MainContentContext'

import styles from './ContestsPage.module.css'
import { RunYourOwnContestBanner } from './RunYourOwnContestBanner'

const { HOST_REMIX_CONTEST_ROOT_PAGE } = route

const messages = {
  title: 'Contests',
  description:
    'Discover remix contests from artists across Audius and submit your remix.',
  empty: 'There are no contests right now. Check back soon!',
  createContest: 'Create Contest'
}

const HERO_SKELETON_COUNT = 1
const GRID_SKELETON_COUNT = 11
const PAGE_SIZE = 12

export const ContestsPage = () => {
  const isMobile = useIsMobile()
  const mainContentRef = useMainContentRef()
  const {
    data,
    isPending,
    isError,
    isSuccess,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage
  } = useAllRemixContests({ pageSize: PAGE_SIZE })

  const getScrollParent = useCallback(
    () => mainContentRef.current ?? null,
    [mainContentRef]
  )

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const contests = data ?? []
  const showSkeletons = isPending || (!isSuccess && !isError)
  const showEmpty = isSuccess && contests.length === 0

  const [heroTrackId, ...gridTrackIds] = contests

  const header = (
    <Header
      icon={IconTrophy}
      primary={messages.title}
      rightDecorator={
        <Button variant='primary' size='small' asChild>
          <Link to={HOST_REMIX_CONTEST_ROOT_PAGE}>
            {messages.createContest}
          </Link>
        </Button>
      }
    />
  )

  return (
    <Page
      title={messages.title}
      description={messages.description}
      size='large'
      header={header}
    >
      <Flex
        direction='column'
        gap='2xl'
        pv='2xl'
        ph={isMobile ? 'l' : undefined}
        alignItems='stretch'
      >
        {showEmpty ? (
          <Box pt='2xl'>
            <Text variant='body' size='l' color='subdued'>
              {messages.empty}
            </Text>
          </Box>
        ) : showSkeletons ? (
          <Flex direction='column' gap='l' className={styles.bodyWrapper}>
            {Array.from({ length: HERO_SKELETON_COUNT }).map((_, i) => (
              <ContestCardSkeleton key={`hero-skeleton-${i}`} variant='hero' />
            ))}
            <div className={styles.cardsContainer}>
              {Array.from({ length: GRID_SKELETON_COUNT }).map((_, i) => (
                <ContestCardSkeleton
                  key={`grid-skeleton-${i}`}
                  variant='grid'
                />
              ))}
            </div>
          </Flex>
        ) : (
          <InfiniteScroll
            hasMore={hasNextPage ?? false}
            loadMore={handleLoadMore}
            getScrollParent={getScrollParent}
            useWindow={false}
            threshold={400}
          >
            <Flex direction='column' gap='l' className={styles.bodyWrapper}>
              {heroTrackId != null ? (
                <ContestCard trackId={heroTrackId} variant='hero' />
              ) : null}
              {gridTrackIds.length > 0 ? (
                <div className={styles.cardsContainer}>
                  {gridTrackIds.map((id) => (
                    <ContestCard key={id} trackId={id} variant='grid' />
                  ))}
                </div>
              ) : null}
              {isFetchingNextPage ? (
                <Flex justifyContent='center' pt='xl'>
                  <LoadingSpinner />
                </Flex>
              ) : null}
            </Flex>
          </InfiniteScroll>
        )}

        {!showEmpty ? <RunYourOwnContestBanner /> : null}
      </Flex>
    </Page>
  )
}

export default ContestsPage
