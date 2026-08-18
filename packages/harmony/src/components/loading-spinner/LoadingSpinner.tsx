import { keyframes } from '@emotion/react'

import { IconProps } from '../icon'
import { Flex, FlexProps } from '../layout/Flex'

type LoadingSpinnerProps = FlexProps & Pick<IconProps, 'size' | 'color'>

/**
 * Circumference of the r=16 arc (2πr ≈ 100.53), rounded up. Used as the dash
 * gap so a single dash segment can sweep the whole circle.
 */
const CIRCUMFERENCE = 101

const rotate = keyframes`
  to { transform: rotate(360deg); }
`

/**
 * Grow-then-shrink sweep, matching the Lottie animation this replaced: the arc
 * grew from empty to full over ~1s, then shrank back to empty over ~2s, while
 * rotating throughout.
 */
const sweep = keyframes`
  0% { stroke-dasharray: 1 ${CIRCUMFERENCE}; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 75 ${CIRCUMFERENCE}; stroke-dashoffset: -18; }
  100% { stroke-dasharray: 1 ${CIRCUMFERENCE}; stroke-dashoffset: -${CIRCUMFERENCE - 1}; }
`

/**
 * Previously rendered a Lottie animation. `lottie-web` is a ~613 KB animation
 * runtime, and a loading spinner is the one component that cannot be lazily
 * loaded — it is what renders *while* things load — so it pinned the whole
 * runtime into the entry chunk for every visitor.
 *
 * The `svg > g > path` structure is deliberate: ~10 stylesheets across the web
 * app recolour the spinner with `.someClass g path { stroke: ... }` selectors
 * written against the Lottie output. Keeping the shape keeps those working.
 */
const LoadingSpinner = (props: LoadingSpinnerProps) => {
  const { size = 'l', color, ...rest } = props
  return (
    <Flex
      role='progressbar'
      css={(theme) => ({
        height: size ? theme.iconSizes[size] : undefined,
        width: size ? theme.iconSizes[size] : undefined,
        g: {
          path: { stroke: color ? theme.color.icon[color] : 'currentColor' }
        }
      })}
      {...rest}
    >
      <svg
        viewBox='0 0 48 48'
        css={{
          width: '100%',
          height: '100%',
          animation: `${rotate} 1.4s linear infinite`,
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
        }}
      >
        <g>
          <path
            d='M24 8a16 16 0 1 0 0 32a16 16 0 1 0 0-32'
            fill='none'
            strokeWidth={6}
            strokeLinecap='round'
            css={{
              animation: `${sweep} 2.1s ease-in-out infinite`,
              '@media (prefers-reduced-motion: reduce)': {
                animation: 'none',
                strokeDasharray: `75 ${CIRCUMFERENCE}`
              }
            }}
          />
        </g>
      </svg>
    </Flex>
  )
}

export default LoadingSpinner
