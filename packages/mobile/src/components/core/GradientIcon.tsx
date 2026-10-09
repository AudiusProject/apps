import type { ComponentType } from 'react'

import MaskedView from '@react-native-masked-view/masked-view'
import type { SvgProps } from 'react-native-svg'

import { LinearGradient } from '@audius/harmony-native'
import { useThemeColors } from 'app/utils/theme'

type GradientIconProps = SvgProps & {
  icon: ComponentType<SvgProps>
}

export const GradientIcon = (props: GradientIconProps) => {
  const { icon: Icon, ...other } = props
  const { pageHeaderGradientColor1, pageHeaderGradientColor2 } =
    useThemeColors()

  return (
    <MaskedView maskElement={<Icon {...other} fill='white' />}>
      <LinearGradient
        colors={[pageHeaderGradientColor1, pageHeaderGradientColor2]}
        start={{ x: 1, y: 1 }}
        end={{ x: 0, y: 0 }}
      >
        <Icon {...other} fill='transparent' />
      </LinearGradient>
    </MaskedView>
  )
}
