import IconLogoWhiteBackgroundPng from '@audius/harmony/src/assets/icons/AudiusLogoWhiteBg.png'
import type { ImageProps } from 'react-native'
import { Image } from 'react-native'

import { iconSizes, type IconSize } from '../foundations'

type Props = Omit<ImageProps, 'source'> & {
  size?: IconSize
}

export const IconLogoWhiteBackground = ({
  size = 'm',
  style,
  ...props
}: Props) => {
  const iconSize = iconSizes[size]

  return (
    <Image
      source={IconLogoWhiteBackgroundPng}
      style={[
        {
          width: iconSize,
          height: iconSize
        },
        style
      ]}
      {...props}
    />
  )
}
