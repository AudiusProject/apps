import { Flex, makeResponsiveStyles } from '@audius/harmony'

import { AssetInfoSection } from './components/AssetInfoSection'
import { AssetInsights } from './components/AssetInsights'
import { AssetLeaderboardCard } from './components/AssetLeaderboardCard'
import { BalanceSection } from './components/BalanceSection'

const LEFT_SECTION_WIDTH = '704px'
const RIGHT_SECTION_WIDTH = '360px'

const useStyles = makeResponsiveStyles(({ media, theme }) => {
  const hasEnoughSpaceForTwoColumns = media.matchesQuery(`(min-width: 1440px)`)

  return {
    container: {
      base: {
        display: 'flex',
        gap: theme.spacing.l,
        width: '100%',
        maxWidth: hasEnoughSpaceForTwoColumns
          ? `calc(${LEFT_SECTION_WIDTH} + ${RIGHT_SECTION_WIDTH} + ${theme.spacing.l})`
          : '100%',
        margin: '0 auto',
        flexDirection: hasEnoughSpaceForTwoColumns ? 'row' : 'column',
        paddingBottom: hasEnoughSpaceForTwoColumns ? 0 : theme.spacing.m
      }
    },
    leftSection: {
      base: {
        width: hasEnoughSpaceForTwoColumns ? LEFT_SECTION_WIDTH : '100%',
        maxWidth: hasEnoughSpaceForTwoColumns ? LEFT_SECTION_WIDTH : '100%',
        minWidth: 0,
        flex: hasEnoughSpaceForTwoColumns ? '0 0 auto' : '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.m
      }
    },
    rightSection: {
      base: {
        width: hasEnoughSpaceForTwoColumns ? RIGHT_SECTION_WIDTH : '100%',
        maxWidth: hasEnoughSpaceForTwoColumns ? RIGHT_SECTION_WIDTH : '100%',
        minWidth: 0,
        flex: hasEnoughSpaceForTwoColumns ? '0 0 auto' : '1 1 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.m
      }
    }
  }
})

type AssetDetailContentProps = {
  mint: string
  isAnonymousUser: boolean
}

export const AssetDetailContent = ({
  mint,
  isAnonymousUser
}: AssetDetailContentProps) => {
  const styles = useStyles()

  return (
    <Flex css={styles.container}>
      <Flex css={styles.leftSection}>
        {isAnonymousUser ? null : <BalanceSection mint={mint} />}
        <AssetInfoSection mint={mint} />
      </Flex>
      <Flex css={styles.rightSection}>
        <AssetInsights mint={mint} />
        <AssetLeaderboardCard mint={mint} />
      </Flex>
    </Flex>
  )
}
