import { Flex, makeResponsiveStyles } from '@audius/harmony'

import { BalanceSection } from './components/BalanceSection'
import { FanClubFeedSection } from './components/FanClubFeedSection'
import { FanClubInfoSection } from './components/FanClubInfoSection'
import { FanClubInsights } from './components/FanClubInsights'
import { FanClubLeaderboardCard } from './components/FanClubLeaderboardCard'
import { PostUpdateCard } from './components/PostUpdateCard'

const MAIN_SECTION_WIDTH = '704px'
const SIDEBAR_SECTION_WIDTH = '360px'

const useStyles = makeResponsiveStyles(({ media, theme }) => {
  const hasEnoughSpaceForTwoColumns = media.matchesQuery(`(min-width: 1440px)`)
  const isSingleColumn = !hasEnoughSpaceForTwoColumns

  return {
    container: {
      base: {
        display: 'flex',
        gap: isSingleColumn ? theme.spacing.xl : theme.spacing.l,
        width: '100%',
        maxWidth: hasEnoughSpaceForTwoColumns
          ? `calc(${MAIN_SECTION_WIDTH} + ${SIDEBAR_SECTION_WIDTH} + ${theme.spacing.l})`
          : '100%',
        margin: '0 auto',
        flexDirection: hasEnoughSpaceForTwoColumns ? 'row' : 'column',
        paddingBottom: hasEnoughSpaceForTwoColumns ? 0 : theme.spacing.m
      }
    },
    /** Primary column: fan club story + fan club feed (desktop left). */
    mainColumn: {
      base: isSingleColumn
        ? { display: 'contents' as const }
        : {
            order: 1,
            width: MAIN_SECTION_WIDTH,
            maxWidth: MAIN_SECTION_WIDTH,
            minWidth: 0,
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: theme.spacing.xl
          }
    },
    /** Sidebar: balance, leaderboard, insights, on-chain details (desktop right). */
    sidebarColumn: {
      base: isSingleColumn
        ? { display: 'contents' as const }
        : {
            order: 2,
            width: SIDEBAR_SECTION_WIDTH,
            maxWidth: SIDEBAR_SECTION_WIDTH,
            minWidth: 0,
            flex: '0 0 auto',
            display: 'flex',
            flexDirection: 'column' as const,
            gap: theme.spacing.xl
          }
    },
    /** Single-column ordering for interleaved layout */
    heroSection: {
      base: isSingleColumn ? { order: 1 } : {}
    },
    postUpdateCard: {
      base: isSingleColumn ? { order: 2 } : {}
    },
    balanceSection: {
      base: isSingleColumn ? { order: 3 } : {}
    },
    leaderboard: {
      base: isSingleColumn ? { order: 4 } : {}
    },
    feedSection: {
      base: isSingleColumn ? { order: 5 } : {}
    },
    insights: {
      base: isSingleColumn ? { order: 6 } : {}
    },
    onchainDetails: {
      base: isSingleColumn ? { order: 7 } : {}
    }
  }
})

type FanClubDetailContentProps = {
  mint: string
}

export const FanClubDetailContent = ({ mint }: FanClubDetailContentProps) => {
  const styles = useStyles()

  return (
    <Flex css={styles.container}>
      <Flex css={styles.mainColumn}>
        <Flex direction='column' w='100%' css={styles.heroSection}>
          <FanClubInfoSection mint={mint} variant='hero' />
        </Flex>
        <Flex direction='column' w='100%' css={styles.postUpdateCard}>
          <PostUpdateCard mint={mint} />
        </Flex>
        <Flex direction='column' w='100%' css={styles.feedSection}>
          <FanClubFeedSection mint={mint} />
        </Flex>
      </Flex>
      <Flex css={styles.sidebarColumn}>
        <Flex direction='column' w='100%' css={styles.balanceSection}>
          <BalanceSection mint={mint} />
        </Flex>
        <Flex direction='column' w='100%' css={styles.leaderboard}>
          <FanClubLeaderboardCard mint={mint} />
        </Flex>
        <Flex direction='column' w='100%' css={styles.insights}>
          <FanClubInsights mint={mint} />
        </Flex>
        <Flex direction='column' w='100%' css={styles.onchainDetails}>
          <FanClubInfoSection mint={mint} variant='onchainDetails' />
        </Flex>
      </Flex>
    </Flex>
  )
}
