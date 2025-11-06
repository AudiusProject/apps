import type { ImageProps } from 'react-native'
import { Image } from 'react-native'

import LogoCircleUSDC from 'app/assets/images/LogoCircleUSDC.jpg'

import { iconSizes, type IconSize } from '../foundations'

import { HexagonalIcon } from './HexagonalIcon'

type Props = Omit<ImageProps, 'source'> & {
  size?: IconSize
}

export const IconTokenUSDC = ({ size = 'm', style, ...props }: Props) => {
  const iconSize = iconSizes[size]

  return (
    <HexagonalIcon size={iconSize}>
      <Image
        source={LogoCircleUSDC}
        style={[
          {
            width: iconSize,
            height: iconSize
          },
          style
        ]}
        {...props}
      />
    </HexagonalIcon>
  )
}
