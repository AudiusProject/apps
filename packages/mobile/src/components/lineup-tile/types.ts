import type { ReactNode } from 'react'

import type { PlaybackSource, Collection, ID, UID } from '@audius/common/models'
import type {
  EnhancedCollectionTrack,
  LineupBaseActions
} from '@audius/common/store'
import type { StyleProp, ViewStyle } from 'react-native'

import type { ImageProps } from '@audius/harmony-native'

/**
 * Optional variant to modify the lineup item features and styles
 * The 'readonly' variant will remove the action buttons on the tile
 */
export type LineupItemVariant = 'readonly'

export enum LineupTileSource {
  DM_COLLECTION = 'DM - Collection',
  DM_TRACK = 'DM - Track',
  LINEUP_COLLECTION = 'Lineup - Collection',
  LINEUP_TRACK = 'Lineup - Track'
}

export type RenderImage = (props: ImageProps) => ReactNode

export type TrackTileProps = {
  id: ID
  uid: UID
  togglePlay: (args: { uid: UID; id: ID; source: PlaybackSource }) => void
  onPress?: (id: ID) => void
  variant?: LineupItemVariant
  index: number
  isTrending?: boolean
  actions?: LineupBaseActions
  style?: StyleProp<ViewStyle>
  source?: LineupTileSource
  showArtistPick?: boolean
}

export type CollectionTileProps = {
  id: ID
  uid: UID
  togglePlay: (args: { uid: UID; id: ID; source: PlaybackSource }) => void
  variant?: LineupItemVariant
  index: number
  isTrending?: boolean
  actions?: LineupBaseActions
  style?: StyleProp<ViewStyle>
  source?: LineupTileSource
  collection?: Collection
  tracks?: EnhancedCollectionTrack[]
}
