import type { ViewStyle } from 'react-native'
import Svg, {
  Path,
  G,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop
} from 'react-native-svg'

import { useTheme } from '@audius/harmony-native'

export const CoinGradientDogEarSvg = ({ style }: { style: ViewStyle }) => {
  const { color } = useTheme()
  const gradientColors = color.special.coinGradient.colors

  return (
    <Svg style={style} width='48' height='48' viewBox='0 0 48 48' fill='none'>
      <G filter='url(#filter0_d_2088_1481)'>
        <Path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M0 8C0 3.58172 3.58172 0 8 0H40L0 40V8Z'
          fill='url(#coinGradient)'
        />
        <Path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M0 8C0 3.58172 3.58172 0 8 0H40L0 40V8Z'
          fill='url(#paint0_radial_2088_1481)'
          fillOpacity='0.2'
        />
        <Path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M0 8C0 3.58172 3.58172 0 8 0H40L0 40V8Z'
          fill='url(#paint1_radial_2088_1481)'
          fillOpacity='0.2'
        />
      </G>

      <Defs>
        <RadialGradient
          id='paint0_radial_2088_1481'
          cx='0'
          cy='0'
          r='1'
          gradientUnits='userSpaceOnUse'
          gradientTransform='scale(33 11.7534)'
        >
          <Stop stopColor='white' />
          <Stop offset='1' stopColor='white' stopOpacity='0' />
        </RadialGradient>

        <RadialGradient
          id='paint1_radial_2088_1481'
          cx='0'
          cy='0'
          r='1'
          gradientUnits='userSpaceOnUse'
          gradientTransform='rotate(90) scale(36.5 13)'
        >
          <Stop stopColor='white' />
          <Stop offset='1' stopColor='white' stopOpacity='0' />
        </RadialGradient>

        <LinearGradient id='coinGradient' gradientTransform='rotate(-5)'>
          <Stop stopColor={gradientColors[0]} offset='-4.82%' />
          <Stop stopColor={gradientColors[1]} offset='49.8%' />
          <Stop stopColor={gradientColors[2]} offset='104.43%' />
        </LinearGradient>
      </Defs>
    </Svg>
  )
}
