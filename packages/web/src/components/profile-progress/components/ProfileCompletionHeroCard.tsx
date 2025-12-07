import { useIsAccountLoaded } from '@audius/common/api'
import { useOrderedCompletionStages } from '@audius/common/src/store/challenges'
import { challengesSelectors, profilePageActions } from '@audius/common/store'
import { Box, Flex, Text, useTheme } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import { SegmentedProgressBar } from 'components/segmented-progress-bar/SegmentedProgressBar'

import { useProfileCompletionDismissal, useVerticalCollapse } from '../hooks'

import { TaskCompletionList } from './TaskCompletionList'
const animatedAny = animated as any

const { profileMeterDismissed } = profilePageActions
const { getProfilePageMeterDismissed } = challengesSelectors

const messages = {
  complete: 'Profile Complete'
}

const ORIGINAL_HEIGHT_PIXELS = 206
const CARD_HEIGHT_PIXELS = 182

interface CompletionStage {
  isCompleted: boolean
  title: string
}

const getStepsCompleted = (completionStages: CompletionStage[]): number =>
  completionStages.reduce((acc, cur) => (cur.isCompleted ? acc + 1 : acc), 0)

export const getPercentageComplete = (
  completionStages: CompletionStage[]
): number => {
  const stepsCompleted = getStepsCompleted(completionStages)
  return (stepsCompleted / completionStages.length) * 100
}

/**
 * ProfileCompletionHeroCard is the hero card that shows the profile completion percentage,
 * the progress meter, and the list of completed stages. It handles its own state management
 * and animations.
 */
export const ProfileCompletionHeroCard = () => {
  const dispatch = useDispatch()

  const isAccountLoaded = useIsAccountLoaded()
  const completionStages = useOrderedCompletionStages()
  const isDismissed = useSelector(getProfilePageMeterDismissed)
  const { color } = useTheme()

  const onDismiss = () => dispatch(profileMeterDismissed())

  const { isHidden, shouldNeverShow } = useProfileCompletionDismissal({
    onDismiss,
    isAccountLoaded,
    completionStages,
    isDismissed
  })

  const transitions = useVerticalCollapse(!isHidden, ORIGINAL_HEIGHT_PIXELS)

  const stepsCompleted = getStepsCompleted(completionStages)
  const percentageCompleted = getPercentageComplete(completionStages)
  const { animatedPercentage } = useSpring({
    animatedPercentage: percentageCompleted,
    from: { animatedPercentage: 0 }
  })

  if (shouldNeverShow) return null

  return (
    <>
      {transitions.map(({ item, key, props }) =>
        item ? (
          <animatedAny.div style={props} key={key}>
            <Flex
              shadow='emphasis'
              w='100%'
              borderRadius='m'
              css={{ userSelect: 'none', overflow: 'hidden' }}
            >
              <Flex
                column
                justifyContent='flex-start'
                alignItems='center'
                backgroundColor='white'
                ph='l'
                w={289}
                css={{
                  flexShrink: 0,
                  fontSize: 26,
                  fontWeight: 'bold',
                  lineHeight: 32,
                  letterSpacing: 0.93
                }}
              >
                <Box
                  mt={34}
                  css={(theme) => ({
                    color: theme.color.text.accent,
                    fontSize: '52px',
                    fontWeight: theme.typography.weight.heavy,
                    lineHeight: theme.typography.lineHeight.xl,
                    letterSpacing: 1.86
                  })}
                >
                  <animatedAny.span>
                    {animatedPercentage.interpolate((v: unknown) =>
                      (v as number).toFixed()
                    )}
                  </animatedAny.span>
                  %
                </Box>
                <Flex p='m'>
                  <Text variant='title' size='m'>
                    {messages.complete}
                  </Text>
                </Flex>
                <SegmentedProgressBar
                  numSteps={completionStages.length}
                  stepsComplete={stepsCompleted}
                />
              </Flex>
              <Flex
                p='l'
                flex={1}
                h={CARD_HEIGHT_PIXELS}
                css={{ backgroundColor: color.secondary.s300 }}
              >
                <TaskCompletionList completionStages={completionStages} />
              </Flex>
              <button
                css={(theme) => ({
                  position: 'absolute',
                  bottom: theme.spacing.m,
                  right: theme.spacing.m,
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: theme.color.text.white,
                  fontSize: theme.typography.size.xs,
                  opacity: 0.5,
                  textAlign: 'center',
                  fontWeight: theme.typography.weight.medium,
                  letterSpacing: 0.43,
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline'
                  }
                })}
                onClick={onDismiss}
              >
                Dismiss
              </button>
            </Flex>
          </animatedAny.div>
        ) : null
      )}
    </>
  )
}
