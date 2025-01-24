import { useEffect, useState } from 'react'

import {
  accountSelectors,
  challengesSelectors,
  musicConfettiActions
} from '@audius/common/store'
import { Flex, Text, TextLink } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import { SegmentedProgressBar } from 'components/segmented-progress-bar/SegmentedProgressBar'

import { ProfileCompletionTooltip } from './components/ProfileCompletionTooltip'
import { useProfileCompletionDismissal, useSlideDown } from './hooks'

const { getOrderedCompletionStages, getIsAccountLoaded } = challengesSelectors
const { getHasAccount } = accountSelectors
const { show: showMusicConfetti } = musicConfettiActions

const ORIGINAL_HEIGHT_PIXELS = 118

const messages = {
  dismissText: 'Dismiss',
  completionText: (percentage: number) => `Profile ${percentage}% Complete`
}

/**
 * ProfileCompletionPanel is a panel that lives in the sidebar, presenting
 * a compact SegmentedProgressBar and profile completion percentage.
 * It handles its own state management and animations.
 */
export const ProfileCompletionPanel = () => {
  const dispatch = useDispatch()
  const completionStages = useSelector(getOrderedCompletionStages)
  const isAccountLoaded = useSelector(getIsAccountLoaded)
  const isLoggedIn = useSelector(getHasAccount)

  const [isDismissed, setIsDismissed] = useState(false)
  const [isTooltipDisabled, setIsTooltipDisabled] = useState(false)

  const onDismiss = () => {
    // disable the tooltip before we dismiss,
    // otherwise it gets scaled in the dismiss animation
    // and looks super jenk
    setIsTooltipDisabled(true)
    setTimeout(() => {
      setIsDismissed(true)
    }, 200)
  }

  const { isHidden, didCompleteThisSession, shouldNeverShow } =
    useProfileCompletionDismissal({
      onDismiss,
      isAccountLoaded,
      completionStages,
      isDismissed
    })

  useEffect(() => {
    if (didCompleteThisSession) {
      dispatch(showMusicConfetti())
    }
  }, [didCompleteThisSession, dispatch])

  const transitions = useSlideDown(!isHidden, ORIGINAL_HEIGHT_PIXELS)

  const stepsComplete = completionStages.reduce(
    (acc, cur) => acc + (cur.isCompleted ? 1 : 0),
    0
  )
  const numSteps = completionStages.length
  const completionPercentage = (stepsComplete / numSteps) * 100

  const { animatedCompletion } = useSpring({
    animatedCompletion: completionPercentage,
    from: { animatedCompletion: 0 }
  })

  if (!isLoggedIn || shouldNeverShow) return null

  return (
    <Flex justifyContent='center'>
      {transitions.map(({ item, key, props }) =>
        item ? (
          <animated.div style={props} key={key}>
            <ProfileCompletionTooltip
              completionStages={completionStages}
              isDisabled={isTooltipDisabled}
              shouldDismissOnClick={false}
            >
              <Flex
                backgroundColor='surface2'
                border='strong'
                borderRadius='l'
                gap='l'
                pv='l'
                ph='2xl'
                direction='column'
                alignItems='center'
              >
                <Text variant='title' size='s'>
                  <animated.div>
                    {(animatedCompletion as any).interpolate((v: number) =>
                      messages.completionText(Math.round(v))
                    )}
                  </animated.div>
                </Text>
                <SegmentedProgressBar
                  numSteps={numSteps}
                  stepsComplete={stepsComplete}
                  isCompact
                />
                <TextLink onClick={onDismiss} variant='visible' size='s'>
                  {messages.dismissText}
                </TextLink>
              </Flex>
            </ProfileCompletionTooltip>
          </animated.div>
        ) : null
      )}
    </Flex>
  )
}
