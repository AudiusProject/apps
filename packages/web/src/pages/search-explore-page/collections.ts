import { ComponentType, SVGProps } from 'react'

import { route } from '@audius/common/utils'
import {
  IconPlaylists as IconExploreTopPlaylists,
  IconCart,
  IconRemix
} from '@audius/harmony'

import IconCassette from 'assets/img/iconCassette.svg'

const {
  TRENDING_PLAYLISTS_PAGE,
  TRENDING_UNDERGROUND_PAGE,
  SEARCH_PREMIUM_TRACKS,
  SEARCH_DOWNLOADS_AVAILABLE
} = route

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

export const DOWNLOADS_AVAILABLE: ExploreCollection = {
  title: 'Downloads Available',
  subtitle: 'Popular tracks with downloads you can use in your own tracks.',
  gradient: 'linear-gradient(138deg, #FF00F5 -5.01%, #00D1FF 110.47%)',
  shadow: 'rgba(9, 175, 233, 0.35)',
  icon: IconRemix,
  link: SEARCH_DOWNLOADS_AVAILABLE
}

export const TRENDING_PLAYLISTS: ExploreCollection = {
  title: 'Trending Playlists',
  subtitle: 'The top playlists on Audius right now',
  gradient: 'linear-gradient(315deg, #57ABFF 0%, #CD98FF 100%)',
  shadow: 'rgba(87,170,255,0.35)',
  icon: IconExploreTopPlaylists,
  link: TRENDING_PLAYLISTS_PAGE,
  incentivized: true
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
