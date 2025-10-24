import { Image } from 'react-native'

import { HexagonalIcon, useTheme } from '@audius/harmony-native'
import type { IconSize } from '@audius/harmony-native'

export type TokenIconProps = {
  logoURI?: string
  size?: IconSize | number
}

export const TokenIcon = ({ logoURI, size = 's' }: TokenIconProps) => {
  const { iconSizes } = useTheme()

  if (!logoURI) return null

  // Handle both IconSize (string) and number types
  const iconSize = typeof size === 'number' ? size : iconSizes[size]

  return (
    <HexagonalIcon size={iconSize}>
      <Image
        source={{ uri: logoURI }}
        style={{
          width: iconSize,
          height: iconSize
        }}
      />
    </HexagonalIcon>
  )
}
