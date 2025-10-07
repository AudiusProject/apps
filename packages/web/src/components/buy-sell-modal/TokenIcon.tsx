import { ComponentType } from 'react'

import { Artwork, ArtworkProps, IconProps, useTheme } from '@audius/harmony'

export type TokenIconProps = {
  logoURI?: string
  icon?: ComponentType<any>
} & ArtworkProps &
  IconProps

// Component to render token icon - handles both icon component and logoURI
export const TokenIcon = ({
  icon: IconComponent,
  logoURI,
  size = 'l',
  hex,
  w,
  h,
  ...props
}: TokenIconProps) => {
  const { spacing } = useTheme()

  if (IconComponent) {
    return <IconComponent size={size} {...props} />
  }

  if (logoURI) {
    // Handle different size props for Artwork component
    const sizeMap: Record<string, { w: number; h: number }> = {
      xs: { w: 14, h: 14 }, // Used for ChatBlastHeader, non-standard size
      s: { w: spacing.unit4, h: spacing.unit4 },
      m: { w: spacing.unit5, h: spacing.unit5 },
      l: { w: spacing.unit6, h: spacing.unit6 },
      xl: { w: spacing.unit10, h: spacing.unit10 },
      '2xl': { w: spacing.unit12, h: spacing.unit12 },
      '4xl': { w: spacing.unit16, h: spacing.unit16 }
    }

    // Use explicit w/h if provided, otherwise use size mapping
    const dimensions = w && h ? { w, h } : sizeMap[size]

    return (
      <Artwork
        src={logoURI}
        {...dimensions}
        borderWidth={0}
        hex={hex}
        {...props}
      />
    )
  }

  return null
}
