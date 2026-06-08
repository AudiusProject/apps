import { Flex, makeResponsiveStyles } from '@audius/harmony'

import { BalanceSection } from './components/BalanceSection'
import { FanClubFeedSection } from './components/FanClubFeedSection'
import { FanClubInfoSection } from './components/FanClubInfoSection'
import { FanClubInsights } from './components/FanClubInsights'
import { FanClubLeaderboardCard } from './components/FanClubLeaderboardCard'
import { PostUpdateCard } from './components/PostUpdateCard'

const MAIN_SECTION_MAX_WIDTH = 704
const SIDEBAR_SECTION_WIDTH = 360
const DESKTOP_NAV_WIDTH = 240

const useStyles = makeResponsiveStyles(({ theme }) => {
  // Keep sidebar fixed; allow the main column to shrink until both columns
  // are equal width, then collapse to single-column.
  const pageInsetHorizontalPadding = theme.spacing.unit15 * 2
  const twoColumnMinViewportWidth =
    SIDEBAR_SECTION_WIDTH +
    SIDEBAR_SECTION_WIDTH +
    theme.spacing.l +
    pageInsetHorizontalPadding +
    DESKTOP_NAV_WIDTH
  const twoColumnMediaQuery = `@media (min-width: ${twoColumnMinViewportWidth}px)`

  return {
    container: {
      base: {
        display: 'flex',
        gap: theme.spacing.xl,
        width: '100%',
        maxWidth: '100%',
        margin: '0 auto',
        flexDirection: 'column',
        paddingBottom: theme.spacing.m,
        [twoColumnMediaQuery]: {
          gap: theme.spacing.l,
          maxWidth: `calc(${MAIN_SECTION_MAX_WIDTH}px + ${SIDEBAR_SECTION_WIDTH}px + ${theme.spacing.l}px)`,
          flexDirection: 'row',
          paddingBottom: 0
        }
      }
    },
    /** Primary column: fan club story + fan club feed (desktop left). */
    mainColumn: {
      base: {
        display: 'contents' as const,
        [twoColumnMediaQuery]: {
          order: 1,
          width: 'auto',
          maxWidth: `${MAIN_SECTION_MAX_WIDTH}px`,
          minWidth: `${SIDEBAR_SECTION_WIDTH}px`,
          flex: '1 1 auto',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: theme.spacing.xl
        }
      }
    },
    /** Sidebar: balance, leaderboard, insights, on-chain details (desktop right). */
    sidebarColumn: {
      base: {
        display: 'contents' as const,
        [twoColumnMediaQuery]: {
          order: 2,
          width: `${SIDEBAR_SECTION_WIDTH}px`,
          maxWidth: `${SIDEBAR_SECTION_WIDTH}px`,
          minWidth: 0,
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'column' as const,
          gap: theme.spacing.xl
        }
      }
    },
    /** Item wrappers – collapse when the child component renders null. */
    itemWrapper: {
      base: {
        '&:empty': { display: 'none' }
      }
    },
    /** Single-column ordering for interleaved layout */
    heroSection: {
      base: { order: 1 }
    },
    postUpdateCard: {
      base: { order: 2 }
    },
    balanceSection: {
      base: { order: 3 }
    },
    leaderboard: {
      base: { order: 4 }
    },
    feedSection: {
      base: { order: 5 }
    },
    insights: {
      base: { order: 6 }
    },
    onchainDetails: {
      base: { order: 7 }
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
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.heroSection]}
        >
          <FanClubInfoSection mint={mint} variant='hero' />
        </Flex>
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.postUpdateCard]}
        >
          <PostUpdateCard mint={mint} />
        </Flex>
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.feedSection]}
        >
          <FanClubFeedSection mint={mint} />
        </Flex>
      </Flex>
      <Flex css={styles.sidebarColumn}>
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.balanceSection]}
        >
          <BalanceSection mint={mint} />
        </Flex>
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.leaderboard]}
        >
          <FanClubLeaderboardCard mint={mint} />
        </Flex>
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.insights]}
        >
          <FanClubInsights mint={mint} />
        </Flex>
        <Flex
          direction='column'
          w='100%'
          css={[styles.itemWrapper, styles.onchainDetails]}
        >
          <FanClubInfoSection mint={mint} variant='onchainDetails' />
        </Flex>
      </Flex>
    </Flex>
  )
}
