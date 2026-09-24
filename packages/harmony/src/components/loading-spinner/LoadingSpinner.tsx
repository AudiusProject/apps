import { keyframes } from '@emotion/react'

import { IconProps } from '../icon'
import { Flex, FlexProps } from '../layout/Flex'

type LoadingSpinnerProps = FlexProps & Pick<IconProps, 'size' | 'color'>

/** Circumference of the r=16 arc (2πr ≈ 100.53), rounded up. */
const CIRCUMFERENCE = 101

const rotate = keyframes`
  to { transform: rotate(360deg); }
`

/** Arc grows then shrinks while the svg rotates. */
const sweep = keyframes`
  0% { stroke-dasharray: 1 ${CIRCUMFERENCE}; stroke-dashoffset: 0; }
  50% { stroke-dasharray: 75 ${CIRCUMFERENCE}; stroke-dashoffset: -18; }
  100% { stroke-dasharray: 1 ${CIRCUMFERENCE}; stroke-dashoffset: -${CIRCUMFERENCE - 1}; }
`

/**
 * CSS spinner (no lottie, so it can live in the entry chunk). Keep the
 * svg > g > path structure: web stylesheets recolour it via `g path` selectors.
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
