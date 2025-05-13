import { ComponentType, SVGProps } from 'react'

import { ExploreCollectionsVariant } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  IconTurntable as IconExploreTopAlbums,
  IconPlaylists as IconExploreTopPlaylists,
  IconCart,
  IconRemix
} from '@audius/harmony'

import IconCassette from 'assets/img/iconCassette.svg'
import IconExploreDJ from 'assets/img/iconExploreDJ.svg'
import { exploreMoodPlaylistsPage } from 'utils/route'

const {
  EXPLORE_LET_THEM_DJ_PAGE,
  EXPLORE_TOP_ALBUMS_PAGE,
  TRENDING_PLAYLISTS_PAGE,
  TRENDING_UNDERGROUND_PAGE,
  SEARCH_DOWNLOADS_AVAILABLE,
  SEARCH_PREMIUM_TRACKS
} = route

export type ExploreCollection = {
  variant: ExploreCollectionsVariant
  title: string
  subtitle?: string
  gradient: string
  shadow: string
  icon?: ComponentType<SVGProps<SVGSVGElement>>
  incentivized?: boolean // Whether we reward winners with Audio
  link: string
  cardSensitivity?: number
}

// How much full width cards move
const WIDE_CARD_SENSITIVTY = 0.04

export type ExploreMoodCollection = ExploreCollection & {
  emoji: string
  moods: string[]
}

export const PREMIUM_TRACKS: ExploreCollection = {
  variant: ExploreCollectionsVariant.DIRECT_LINK,
  title: 'Premium Tracks',
  subtitle: 'Explore premium music available to purchase.',
  gradient: 'linear-gradient(95deg, #13C65A 0%, #16A653 100%)',
  shadow: 'rgba(196,81,193,0.35)',
  icon: IconCart,
  link: SEARCH_PREMIUM_TRACKS,
  cardSensitivity: WIDE_CARD_SENSITIVTY
}

export const DOWNLOADS_AVAILABLE: ExploreCollection = {
  variant: ExploreCollectionsVariant.DIRECT_LINK,
  title: 'Downloads Available',
  subtitle: 'Popular tracks with downloads you can use in your own tracks.',
  gradient: 'linear-gradient(138deg, #FF00F5 -5.01%, #00D1FF 110.47%)',
  shadow: 'rgba(9, 175, 233, 0.35)',
  icon: IconRemix,
  link: SEARCH_DOWNLOADS_AVAILABLE,
  cardSensitivity: WIDE_CARD_SENSITIVTY
}

export const LET_THEM_DJ: ExploreCollection = {
  variant: ExploreCollectionsVariant.LET_THEM_DJ,
  title: 'Let Them DJ',
  subtitle: 'Playlists created by the people you follow',
  gradient: 'linear-gradient(315deg, #08AEEA 0%, #2AF598 100%)',
  shadow: 'rgba(9,175,233,0.35)',
  icon: IconExploreDJ,
  link: EXPLORE_LET_THEM_DJ_PAGE
}

export const TOP_ALBUMS: ExploreCollection = {
  variant: ExploreCollectionsVariant.TOP_ALBUMS,
  title: 'Top Albums',
  subtitle: 'The top albums from all of Audius',
  gradient: 'linear-gradient(135deg, #FF00B6 0%, #B000FF 100%)',
  shadow: 'rgba(177,0,253,0.35)',
  icon: IconExploreTopAlbums,
  link: EXPLORE_TOP_ALBUMS_PAGE
}

export const TRENDING_PLAYLISTS: ExploreCollection = {
  variant: ExploreCollectionsVariant.DIRECT_LINK,
  title: 'Trending Playlists',
  subtitle: 'The top playlists on Audius right now',
  gradient: 'linear-gradient(315deg, #57ABFF 0%, #CD98FF 100%)',
  shadow: 'rgba(87,170,255,0.35)',
  icon: IconExploreTopPlaylists,
  link: TRENDING_PLAYLISTS_PAGE,
  incentivized: true
}

export const TRENDING_UNDERGROUND: ExploreCollection = {
  variant: ExploreCollectionsVariant.DIRECT_LINK,
  title: 'Underground Trending',
  subtitle: 'Some of the best up-and-coming music on Audius all in one place',
  gradient: 'linear-gradient(315deg, #BA27FF 0%, #EF8CD9 100%)',
  shadow: 'rgba(242, 87, 255, 0.35)',
  icon: IconCassette,
  link: TRENDING_UNDERGROUND_PAGE,
  incentivized: true
}

export const CHILL_PLAYLISTS: ExploreMoodCollection = {
  variant: ExploreCollectionsVariant.MOOD,
  title: 'Chill',
  emoji: 'dove-of-peace',
  gradient: 'linear-gradient(135deg, #2CD1FF 0%, #FA8BFF 100%)',
  shadow: 'rgba(237,144,255,0.35)',
  link: exploreMoodPlaylistsPage('chill'),
  moods: ['peaceful', 'easygoing', 'melancholy']
}

export const PROVOKING_PLAYLISTS: ExploreMoodCollection = {
  variant: ExploreCollectionsVariant.MOOD,
  title: 'Provoking',
  emoji: 'thinking-face',
  gradient: 'linear-gradient(135deg, #3FECF4 0%, #16A085 100%)',
  shadow: 'rgba(115,225,179,0.35)',
  link: exploreMoodPlaylistsPage('provoking'),
  moods: ['sophisticated', 'brooding', 'serious', 'stirring']
}

export const INTIMATE_PLAYLISTS: ExploreMoodCollection = {
  variant: ExploreCollectionsVariant.MOOD,
  title: 'Intimate',
  emoji: 'heart-with-arrow',
  gradient: 'linear-gradient(315deg, #F24FDF 0%, #C881FF 100%)',
  shadow: 'rgba(241,81,225,0.35)',
  link: exploreMoodPlaylistsPage('intimate'),
  moods: ['sentimental', 'romantic', 'yearning', 'sensual', 'tender']
}

export const UPBEAT_PLAYLISTS: ExploreMoodCollection = {
  variant: ExploreCollectionsVariant.MOOD,
  title: 'Upbeat',
  emoji: 'person-raising-both-hands-in-celebration',
  gradient: 'linear-gradient(135deg, #896BFF 0%, #0060FF 100%)',
  shadow: 'rgba(11,97,255,0.35)',
  link: exploreMoodPlaylistsPage('upbeat'),
  moods: ['upbeat', 'excited', 'energizing', 'empowering', 'cool']
}

export const INTENSE_PLAYLISTS: ExploreMoodCollection = {
  variant: ExploreCollectionsVariant.MOOD,
  title: 'Intense',
  emoji: 'fire',
  gradient: 'linear-gradient(315deg, #FBAB7E 0%, #F7CE68 100%)',
  shadow: 'rgba(250,173,124,0.35)',
  link: exploreMoodPlaylistsPage('intense'),
  moods: ['rowdy', 'fiery', 'defiant', 'aggressive', 'gritty']
}

export const EXPLORE_COLLECTIONS_MAP = {
  [ExploreCollectionsVariant.LET_THEM_DJ]: LET_THEM_DJ,
  [ExploreCollectionsVariant.TOP_ALBUMS]: TOP_ALBUMS
}

type ExploreMoodMap = { [key in string]: ExploreMoodCollection }
export const EXPLORE_MOOD_COLLECTIONS_MAP: ExploreMoodMap = {
  chill: CHILL_PLAYLISTS,
  provoking: PROVOKING_PLAYLISTS,
  intimate: INTIMATE_PLAYLISTS,
  upbeat: UPBEAT_PLAYLISTS,
  intense: INTENSE_PLAYLISTS
}
