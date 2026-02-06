import type { ComponentType } from 'react'

import type { ImageSourcePropType } from 'react-native'
import type { SvgProps } from 'react-native-svg'

import { IconCart, IconPlaylists } from '@audius/harmony-native'
import IconCassette from 'app/assets/images/iconCassette.svg'

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


export const TRENDING_PLAYLISTS: ExploreCollection = {
  title: 'Trending Playlists',
  description: 'The top playlists on Audius right now',
  gradientColors: ['#57ABFF', '#CD98FF'],
  gradientAngle: 315,
  shadowColor: 'rgb(87,170,255)',
  shadowOpacity: 0.25,
  icon: IconPlaylists,
  incentivized: true
}

export const TRENDING_UNDERGROUND: ExploreCollection = {
  title: 'Underground Trending',
  description:
    'Some of the best up-and-coming music on Audius all in one place',
  gradientColors: ['#BA27FF', '#EF8CD9'],
  gradientAngle: 315,
  shadowColor: 'rgb(242,87,255)',
  shadowOpacity: 0.25,
  icon: IconCassette,
  incentivized: true
}
