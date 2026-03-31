import { Flex, makeResponsiveStyles } from '@audius/harmony'

import { BalanceSection } from './components/BalanceSection'
import { ExclusiveTracksSection } from './components/ExclusiveTracksSection'
import { FanClubInfoSection } from './components/FanClubInfoSection'
import { FanClubInsights } from './components/FanClubInsights'
import { FanClubLeaderboardCard } from './components/FanClubLeaderboardCard'

const MAIN_SECTION_WIDTH = '704px'
const SIDEBAR_SECTION_WIDTH = '360px'

const useStyles = makeResponsiveStyles(({ media, theme }) => {
  const hasEnoughSpaceForTwoColumns = media.matchesQuery(`(min-width: 1440px)`)

  return {
    container: {
      base: {
        display: 'flex',
        gap: theme.spacing.l,
        width: '100%',
        maxWidth: hasEnoughSpaceForTwoColumns
          ? `calc(${MAIN_SECTION_WIDTH} + ${SIDEBAR_SECTION_WIDTH} + ${theme.spacing.l})`
          : '100%',
        margin: '0 auto',
        flexDirection: hasEnoughSpaceForTwoColumns ? 'row' : 'column',
        paddingBottom: hasEnoughSpaceForTwoColumns ? 0 : theme.spacing.m
      }
    },
    /** Primary column: fan club story + exclusive tracks (desktop left). */
    mainColumn: {
      base: {
        order: 1,
        width: hasEnoughSpaceForTwoColumns ? MAIN_SECTION_WIDTH : '100%',
        maxWidth: hasEnoughSpaceForTwoColumns ? MAIN_SECTION_WIDTH : '100%',
        minWidth: 0,
        flex: hasEnoughSpaceForTwoColumns ? '0 0 auto' : '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xl
      }
    },
    /** Sidebar: balance, leaderboard, insights, on-chain details (desktop right). */
    sidebarColumn: {
      base: {
        order: 2,
        width: hasEnoughSpaceForTwoColumns ? SIDEBAR_SECTION_WIDTH : '100%',
        maxWidth: hasEnoughSpaceForTwoColumns ? SIDEBAR_SECTION_WIDTH : '100%',
        minWidth: 0,
        flex: hasEnoughSpaceForTwoColumns ? '0 0 auto' : '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.xl
      }
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
        <FanClubInfoSection mint={mint} variant='hero' />
        <ExclusiveTracksSection mint={mint} />
      </Flex>
      <Flex css={styles.sidebarColumn}>
        <BalanceSection mint={mint} />
        <FanClubLeaderboardCard mint={mint} />
        <FanClubInsights mint={mint} />
        <FanClubInfoSection mint={mint} variant='onchainDetails' />
      </Flex>
    </Flex>
  )
}
