import type { ComponentType } from 'react'

import type { ImageSourcePropType } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { IconCart } from '@audius/harmony-native'

export type ExploreCollection = {
  title: string
  description?: string
  gradientColors: string[]
  gradientAngle: number
  shadowColor: string
  shadowOpacity: number
  icon?: ComponentType<SvgProps>
  incentivized?: boolean // Whether we reward winners with $AUDIO
}

export type ExploreMoodCollection = ExploreCollection & {
  emoji: ImageSourcePropType
  moods: string[]
}

// Just For You Collections
export const PREMIUM_TRACKS: ExploreCollection = {
  title: 'Premium Tracks',
  description: 'Explore premium music available to purchase.',
  gradientColors: ['#13C65A', '#16A653'],
  gradientAngle: 135,
  shadowColor: 'rgba(196,81,193)',
  shadowOpacity: 0.25,
  icon: IconCart
}
