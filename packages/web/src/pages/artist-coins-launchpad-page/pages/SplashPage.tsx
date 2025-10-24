import { useCurrentAccountUser } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import {
  Button,
  LoadingSpinner,
  Paper,
  Text,
  IconArrowRight,
  Flex,
  makeResponsiveStyles
} from '@audius/harmony'

import gift from 'assets/fonts/emojis/gift.png'
import globe from 'assets/fonts/emojis/globe.png'
import moneyWithWingsEmoji from 'assets/fonts/emojis/money-with-wings.png'
import { Tooltip } from 'components/tooltip'

import { WalletSetupCard, WhyCreateCard } from '../components/index'

const messages = {
  whyCreateTitle: 'Why Create a Coin?',
  whyCreateDescription:
    'Create new ways to earn, reward your fans, and grow your community — all powered by your Artist Coin.',
  getPaidTitle: 'Get Paid',
  getPaidDescription: 'Earn fees whenever fans buy or sell your Coin.',
  rewardFansTitle: 'Reward Fans',
  rewardFansDescription: 'Give holders exclusive content, music, or perks.',
  growCommunityTitle: 'Grow Community',
  growCommunityDescription: 'Strengthen bonds with your biggest supporters.',
  leftColumnPlaceholder: 'Left Column Content (716px)',
  launchPanelTitle: 'Ready to launch?',
  launchPanelDescription:
    'Connect your wallet to start creating your Artist Coin.',
  launchPanelDescription2:
    'It only takes a few steps to set things up and share it with your fans.',
  launchPanelButtonText: 'Get Started!',
  verifiedOnlyTooltip: 'Verified users only'
}

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

// Using flex ratios: 2 for left section, 1 for right section (2:1 ratio)
// Based on Figma design with 1080px total width constraint

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
        // Make sticky on desktop with proper header offset
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
}

export const SplashPage = ({ onContinue, isPending }: SplashPageProps) => {
  const styles = useStyles()
  const { data: currentUser } = useCurrentAccountUser()
  const { isEnabled: isLaunchpadVerificationEnabled } = useFeatureFlag(
    FeatureFlags.LAUNCHPAD_VERIFICATION
  )
  const isVerified = currentUser?.is_verified ?? false

  return (
    <Flex css={styles.container}>
      <Flex css={styles.leftSection}>
        <WhyCreateCard
          title={messages.whyCreateTitle}
          description={messages.whyCreateDescription}
          features={features}
        />
        <WalletSetupCard />
      </Flex>
      <Flex css={styles.rightSection}>
        <Flex css={styles.rightSection}>
          <Paper p='2xl' gap='xl' direction='column' w='100%' h='fit'>
            <Flex direction='column' gap='s'>
              <Text variant='heading' size='m' color='default'>
                {messages.launchPanelTitle}
              </Text>
              <Text variant='body' color='subdued'>
                {messages.launchPanelDescription}
              </Text>
              <Text variant='body' color='subdued'>
                {messages.launchPanelDescription2}
              </Text>
            </Flex>

            <Tooltip
              text={messages.verifiedOnlyTooltip}
              placement='top'
              disabled={isVerified && isLaunchpadVerificationEnabled}
            >
              {/* Need to wrap with Flex because disabled button doesn't capture mouse events */}
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
                  {isPending ? (
                    <LoadingSpinner />
                  ) : (
                    messages.launchPanelButtonText
                  )}
                </Button>
              </Flex>
            </Tooltip>
          </Paper>
        </Flex>
      </Flex>
    </Flex>
  )
}
