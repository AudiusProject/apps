import Lottie from 'lottie-react'

import loadingSpinner from '~harmony/assets/animations/loadingSpinner.json'

import { IconProps } from '../icon'
import { Flex, FlexProps } from '../layout/Flex'

type LoadingSpinnerProps = FlexProps & Pick<IconProps, 'size' | 'color'>

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
      <Lottie loop autoplay animationData={loadingSpinner} />
    </Flex>
  )
}

export default LoadingSpinner
