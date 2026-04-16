import { useAllRemixContests } from '@audius/common/api'
import { Box, Button, Flex, IconRemix, Text } from '@audius/harmony'

import { ContestCard, ContestCardSkeleton } from 'components/contest-card'
import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'

const CONTEST_HOSTING_HELP_URL =
  'https://help.audius.co/artists/hosting-a-remix-contest'

const messages = {
  title: 'Contests',
  description:
    'Discover remix contests from artists across Audius and submit your remix.',
  empty: 'There are no contests right now. Check back soon!',
  createContest: 'Create Contest'
}

const HERO_SKELETON_COUNT = 1
const GRID_SKELETON_COUNT = 11

export const ContestsPage = () => {
  const isMobile = useIsMobile()
  const { data, isPending, isError, isSuccess } = useAllRemixContests()

  const contests = data ?? []
  const showSkeletons = isPending || (!isSuccess && !isError)
  const showEmpty = isSuccess && contests.length === 0

  const [heroTrackId, ...gridTrackIds] = contests

  const header = (
    <Header
      icon={IconRemix}
      primary={messages.title}
      rightDecorator={
        <Button
          variant='primary'
          size='small'
          asChild
          // TODO: Link to the in-app contest creation flow once it exists
          // outside of the per-track HostRemixContestModal.
        >
          <a
            href={CONTEST_HOSTING_HELP_URL}
            target='_blank'
            rel='noopener noreferrer'
          >
            {messages.createContest}
          </a>
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
          <Flex direction='column' gap='l'>
            {Array.from({ length: HERO_SKELETON_COUNT }).map((_, i) => (
              <ContestCardSkeleton key={`hero-skeleton-${i}`} variant='hero' />
            ))}
            <Box
              css={{
                display: 'grid',
                gap: 16,
                gridTemplateColumns: isMobile
                  ? '1fr'
                  : 'repeat(3, minmax(0, 1fr))'
              }}
            >
              {Array.from({ length: GRID_SKELETON_COUNT }).map((_, i) => (
                <ContestCardSkeleton
                  key={`grid-skeleton-${i}`}
                  variant='grid'
                />
              ))}
            </Box>
          </Flex>
        ) : (
          <Flex direction='column' gap='l'>
            {heroTrackId != null ? (
              <ContestCard trackId={heroTrackId} variant='hero' />
            ) : null}
            {gridTrackIds.length > 0 ? (
              <Box
                css={{
                  display: 'grid',
                  gap: 16,
                  gridTemplateColumns: isMobile
                    ? '1fr'
                    : 'repeat(3, minmax(0, 1fr))'
                }}
              >
                {gridTrackIds.map((id) => (
                  <ContestCard key={id} trackId={id} variant='grid' />
                ))}
              </Box>
            ) : null}
          </Flex>
        )}
      </Flex>
    </Page>
  )
}

export default ContestsPage
