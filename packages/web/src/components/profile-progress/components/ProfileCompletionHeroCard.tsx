import { useIsAccountLoaded } from '@audius/common/api'
import { useOrderedCompletionStages } from '@audius/common/src/store/challenges'
import { challengesSelectors, profilePageActions } from '@audius/common/store'
import { Box, Flex, Text, TextLink, useTheme } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'

import { SegmentedProgressBar } from 'components/segmented-progress-bar/SegmentedProgressBar'

import { useProfileCompletionDismissal } from '../hooks'

import { TaskCompletionItem } from './TaskCompletionItem'
const animatedAny = animated as any

const { profileMeterDismissed } = profilePageActions
const { getProfilePageMeterDismissed } = challengesSelectors

const messages = {
  complete: 'Profile Complete',
  dismiss: 'Dismiss'
}

const BADGE_COLUMN_WIDTH = 280

// Container-query stacking: when the card is below this width, the layout
// collapses to a single stacked column.
const CARD_CONTAINER_NAME = 'profile-completion-hero-card'
const STACK_BREAKPOINT_PX = 600
const STACK_QUERY = `@container ${CARD_CONTAINER_NAME} (max-width: ${STACK_BREAKPOINT_PX}px)`
// At and above this card width, the task grid switches to two columns. Below
// this (but still in the side-by-side badge layout), the task grid is a
// single column so the longest task titles never need to truncate.
const TWO_COL_BREAKPOINT_PX = 800
const TWO_COL_QUERY = `@container ${CARD_CONTAINER_NAME} (min-width: ${TWO_COL_BREAKPOINT_PX}px)`

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

const sortIncompleteFirst = (list: CompletionStage[]) => {
  const incomplete = list.filter((e) => !e.isCompleted)
  const complete = list.filter((e) => e.isCompleted)
  return [...incomplete, ...complete]
}

type ProfileCompletionHeroCardProps = {
  isDismissed?: boolean
  onDismiss?: () => void
  /**
   * When true, bypasses the dismissal/auto-hide gates and forces the meter
   * visible. Intended for testing/QA.
   */
  forceVisible?: boolean
}

/**
 * ProfileCompletionHeroCard is the larger profile completion meter shown on
 * surfaces with more horizontal space (e.g. /home and the profile page).
 *
 * Layout: badge (percentage + bar) on the left and task grid on the right at
 * wide card widths; stacks vertically below `STACK_BREAKPOINT_PX`. Stacking
 * is driven by container queries on the card itself, not viewport, so the
 * card behaves correctly inside any-width container.
 *
 * The task grid uses CSS `repeat(auto-fit, minmax(...))` so columns reflow
 * continuously as the card narrows — at every intermediate width tasks fit
 * cleanly into however many columns work.
 *
 * Dismiss lives in a footer row (no absolute positioning) so the layout has
 * no hidden overflow risk.
 *
 * Pass `isDismissed`/`onDismiss` to override the default profile-page-scoped
 * dismissal state (e.g. for use on /home).
 */
export const ProfileCompletionHeroCard = (
  props: ProfileCompletionHeroCardProps = {}
) => {
  const dispatch = useDispatch()
  const theme = useTheme()

  const isAccountLoaded = useIsAccountLoaded()
  const completionStages = useOrderedCompletionStages()
  const reduxIsDismissed = useSelector(getProfilePageMeterDismissed)

  const isDismissed = props.isDismissed ?? reduxIsDismissed
  const onDismiss = props.onDismiss ?? (() => dispatch(profileMeterDismissed()))

  const { isHidden, shouldNeverShow } = useProfileCompletionDismissal({
    onDismiss,
    isAccountLoaded,
    completionStages,
    isDismissed
  })

  const effectiveIsHidden = props.forceVisible ? false : isHidden
  const effectiveShouldNeverShow = props.forceVisible ? false : shouldNeverShow

  const stepsCompleted = getStepsCompleted(completionStages)
  const percentageCompleted = getPercentageComplete(completionStages)
  const { animatedPercentage } = useSpring({
    animatedPercentage: percentageCompleted,
    from: { animatedPercentage: 0 }
  })

  if (effectiveShouldNeverShow || effectiveIsHidden) return null

  const sortedStages = sortIncompleteFirst(completionStages)

  return (
    <Flex
      direction='column'
      border='strong'
      borderRadius='l'
      w='100%'
      css={{
        userSelect: 'none',
        overflow: 'hidden',
        containerType: 'inline-size',
        containerName: CARD_CONTAINER_NAME
      }}
    >
      <Flex
        css={{
          flexDirection: 'row',
          alignItems: 'stretch',
          [STACK_QUERY]: {
            flexDirection: 'column'
          }
        }}
      >
        <Flex
          direction='column'
          justifyContent='center'
          alignItems='center'
          backgroundColor='white'
          css={{
            width: BADGE_COLUMN_WIDTH,
            flexShrink: 0,
            padding: theme.spacing.xl,
            gap: theme.spacing.m,
            [STACK_QUERY]: {
              width: '100%',
              padding: theme.spacing.m,
              gap: theme.spacing.xs
            }
          }}
        >
          <Text
            color='accent'
            css={{
              fontSize: 56,
              fontWeight: theme.typography.weight.heavy,
              lineHeight: theme.typography.lineHeight.xl,
              letterSpacing: 1.86,
              [STACK_QUERY]: {
                fontSize: 40,
                lineHeight: theme.typography.lineHeight.l,
                letterSpacing: 1.4
              }
            }}
          >
            <animatedAny.span>
              {animatedPercentage.interpolate((v: unknown) =>
                (v as number).toFixed()
              )}
            </animatedAny.span>
            %
          </Text>
          <Text variant='title' size='m'>
            {messages.complete}
          </Text>
          <SegmentedProgressBar
            numSteps={completionStages.length}
            stepsComplete={stepsCompleted}
          />
        </Flex>
        <Flex
          direction='column'
          backgroundColor='surface2'
          css={{
            flex: '1 1 auto',
            minWidth: 0,
            padding: theme.spacing.xl,
            gap: theme.spacing.m,
            [STACK_QUERY]: {
              padding: theme.spacing.m,
              gap: theme.spacing.xs
            }
          }}
        >
          <Box
            css={{
              width: '100%',
              display: 'grid',
              // Single column by default — fits any task title without any
              // truncation, and looks consistent with the sidebar tooltip
              // pattern. At wide card widths we promote to two columns so
              // the meter doesn't waste vertical space.
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: theme.spacing.s,
              alignContent: 'start',
              [TWO_COL_QUERY]: {
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))'
              },
              [STACK_QUERY]: {
                gap: theme.spacing.xs
              }
            }}
          >
            {sortedStages.map((stage) => (
              <TaskCompletionItem
                key={stage.title}
                title={stage.title}
                isCompleted={stage.isCompleted}
                variant='surface'
              />
            ))}
          </Box>
          <Flex justifyContent='flex-end' css={{ marginTop: 'auto' }}>
            <TextLink onClick={onDismiss} variant='subdued' size='s'>
              {messages.dismiss}
            </TextLink>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  )
}
