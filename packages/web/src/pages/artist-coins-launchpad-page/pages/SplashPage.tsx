import { launchpadMessages } from '@audius/common/messages'
import {
  Button,
  LoadingSpinner,
  Paper,
  Text,
  IconArrowRight,
  Flex,
  makeResponsiveStyles,
  Tooltip
} from '@audius/harmony'

import gift from 'assets/fonts/emojis/gift.png'
import globe from 'assets/fonts/emojis/globe.png'
import moneyWithWingsEmoji from 'assets/fonts/emojis/money-with-wings.png'

import { WalletSetupCard, WhyCreateCard } from '../components/index'

const { splash: messages } = launchpadMessages

const features = [
  {
    title: messages.getPaidTitle,
    description: messages.getPaidDescription,
    imageSrc: moneyWithWingsEmoji
  },
  {
    title: messages.rewardFansTitle,
    description: messages.rewardFansDescription,
    imageSrc: gift
  },
  {
    title: messages.growCommunityTitle,
    description: messages.growCommunityDescription,
    imageSrc: globe
  }
]

const useStyles = makeResponsiveStyles(({ media, theme }) => {
  const hasEnoughSpaceForTwoColumns = media.matchesQuery(`(min-width: 1440px)`)

  return {
    container: {
      base: {
        display: 'flex',
        gap: theme.spacing.l,
        width: '100%',
        maxWidth: hasEnoughSpaceForTwoColumns ? '1080px' : '100%',
        margin: '0 auto',
        flexDirection: hasEnoughSpaceForTwoColumns ? 'row' : 'column',
        paddingBottom: hasEnoughSpaceForTwoColumns ? 0 : theme.spacing.m
      }
    },
    leftSection: {
      base: {
        flex: hasEnoughSpaceForTwoColumns ? 2 : '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.m,
        order: hasEnoughSpaceForTwoColumns ? 1 : 2
      }
    },
    rightSection: {
      base: {
        flex: hasEnoughSpaceForTwoColumns ? 1 : '1 1 auto',
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing.m,
        order: hasEnoughSpaceForTwoColumns ? 2 : 1,
        ...(hasEnoughSpaceForTwoColumns && {
          position: 'sticky',
          top: '161px',
          alignSelf: 'flex-start'
        })
      }
    }
  }
})

type SplashPageProps = {
  onContinue: () => void
  isPending: boolean
  isVerified: boolean
  isLaunchpadVerificationEnabled: boolean
}

export const SplashPage = ({
  onContinue,
  isPending,
  isVerified,
  isLaunchpadVerificationEnabled
}: SplashPageProps) => {
  const styles = useStyles()

  return (
    <Flex css={styles.container}>
      <Flex css={styles.leftSection}>
        <WhyCreateCard
          title={messages.whyTitle}
          description={messages.whyDescription}
          features={features}
        />
        <WalletSetupCard />
      </Flex>
      <Flex css={styles.rightSection}>
        <Paper p='2xl' gap='xl' direction='column' w='100%' h='fit'>
          <Flex direction='column' gap='s'>
            <Text variant='heading' size='m' color='default'>
              {messages.readyTitle}
            </Text>
            <Text variant='body' color='subdued'>
              {messages.readyDescription}
            </Text>
            <Text variant='body' color='subdued'>
              {messages.readyDescription2}
            </Text>
          </Flex>

          <Tooltip
            text={messages.verifiedOnlyTooltip}
            placement='top'
            disabled={!isLaunchpadVerificationEnabled || isVerified}
          >
            <Flex>
              <Button
                variant='primary'
                fullWidth
                iconRight={isPending ? undefined : IconArrowRight}
                onClick={onContinue}
                disabled={
                  isPending || (!isVerified && isLaunchpadVerificationEnabled)
                }
                color='coinGradient'
              >
                {isPending ? <LoadingSpinner /> : messages.getStarted}
              </Button>
            </Flex>
          </Tooltip>
        </Paper>
      </Flex>
    </Flex>
  )
}
