import { ComponentType, SVGProps } from 'react'

import { route } from '@audius/common/utils'
import { IconCart } from '@audius/harmony'

import IconCassette from 'assets/img/iconCassette.svg'

const { TRENDING_UNDERGROUND_PAGE, SEARCH_PREMIUM_TRACKS } = route

export type ExploreCollection = {
  title: string
  subtitle?: string
  gradient: string
  shadow: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  incentivized?: boolean // Whether we reward winners with Audio
  link: string
  cardSensitivity?: number
}

export type ExploreMoodCollection = ExploreCollection & {
  emoji: string
  moods: string[]
}

export const PREMIUM_TRACKS: ExploreCollection = {
  title: 'Premium Tracks',
  subtitle: 'Explore premium music available to purchase.',
  gradient: 'linear-gradient(95deg, #13C65A 0%, #16A653 100%)',
  shadow: 'rgba(196,81,193,0.35)',
  icon: IconCart,
  link: SEARCH_PREMIUM_TRACKS
}

export const TRENDING_UNDERGROUND: ExploreCollection = {
  title: 'Underground Trending',
  subtitle: 'Some of the best up-and-coming music on Audius all in one place',
  gradient: 'linear-gradient(315deg, #BA27FF 0%, #EF8CD9 100%)',
  shadow: 'rgba(242, 87, 255, 0.35)',
  icon: IconCassette,
  link: TRENDING_UNDERGROUND_PAGE,
  incentivized: true
}
