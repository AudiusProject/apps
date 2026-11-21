import { Box, Flex, useTheme } from '@audius/harmony'
import { range } from 'lodash'

interface SegmentedProgressBarProps {
  numSteps: number
  stepsComplete: number
  isCompact?: boolean
}

const COMPACT_SEGMENT_WIDTH = 144
const SEGMENT_WIDTH = 206

export const SegmentedProgressBar = ({
  numSteps,
  stepsComplete,
  isCompact = false
}: SegmentedProgressBarProps) => {
  const { color, spacing } = useTheme()
  return (
    <Flex
      borderRadius={isCompact ? 'm' : 'l'}
      border='strong'
      backgroundColor='white'
      css={{
        borderWidth: spacing.unitHalf,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Flex
        w={isCompact ? COMPACT_SEGMENT_WIDTH : SEGMENT_WIDTH}
        h={isCompact ? spacing.unit6 : spacing.unit9}
        borderRadius={isCompact ? 'm' : 'l'}
        css={{
          background: color.special.gradient,
          marginLeft: -1
        }}
      >
        <Flex
          w={
            isCompact
              ? COMPACT_SEGMENT_WIDTH + spacing.unit4
              : SEGMENT_WIDTH + spacing.unit6
          }
          h={isCompact ? spacing.unit6 : spacing.unit9}
          css={{
            position: 'absolute',
            left: -1 * spacing.unit1
          }}
        >
          {range(numSteps).map((_, i) => {
            const isComplete = i <= stepsComplete - 1
            const isLast = i === numSteps - 1
            return (
              <Box
                key={i}
                css={{
                  transform: 'skew(-15deg)',
                  flexGrow: 1,
                  backgroundColor: isComplete ? 'transparent' : 'white',
                  borderRight: isLast ? 'none' : '3px solid white',
                  transition: 'background-color 0.25s ease-out',
                  marginLeft: -1,
                  marginRight: -1
                }}
              />
            )
          })}
        </Flex>
      </Flex>
    </Flex>
  )
}
