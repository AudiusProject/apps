import { ComponentType, SVGProps } from 'react'

import { route } from '@audius/common/utils'
import { IconCart } from '@audius/harmony'

const { SEARCH_PREMIUM_TRACKS } = route

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
