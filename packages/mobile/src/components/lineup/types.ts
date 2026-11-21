import type { ReactElement } from 'react'

import type { Kind, ID, UID, Lineup as LineupData } from '@audius/common/models'
import type { CommonState } from '@audius/common/store'
import type { Maybe } from '@audius/common/utils'
import type { SectionListProps, ViewStyle } from 'react-native'

import type { PlaybackSource } from 'app/types/analytics'

export enum LineupVariant {
  MAIN = 'main',
  PLAYLIST = 'playlist'
}

export type LineupItem = {
  id: ID
  kind: Kind
  track_id?: ID
  playlist_id?: ID
  uid: UID
  _marked_deleted?: boolean
  activityTimestamp?: Maybe<number | string>
}

export type LoadingLineupItem = {
  _loading: true
}

export type LineupProps = {
  count?: number

  delineate?: boolean

  disableTopTabScroll?: boolean

  fetchPayload?: any

  extraFetchOptions?: Record<string, unknown>

  hideHeaderOnEmpty?: boolean

  header?: SectionListProps<unknown>['ListHeaderComponent']

  LineupEmptyComponent?: SectionListProps<unknown>['ListEmptyComponent']

  isTrending?: boolean

  lazy?: boolean

  leadingElementId?: ID | null

  leadingElementDelineator?: ReactElement

  showArtistPick?: boolean

  limit?: number

  lineup?: LineupData<LineupItem>

  lineupSelector?: (state: CommonState) => LineupData<LineupItem>

  loadMore?: (offset: number, limit: number, overwrite: boolean) => void

  refresh?: () => void

  refreshing?: boolean

  rankIconCount?: number

  selfLoad?: boolean

  start?: number

  variant?: LineupVariant

  listKey?: string

  includeLineupStatus?: boolean
  pullToRefresh?: boolean

  onPressItem?: (id: ID) => void

  itemStyles?: ViewStyle
  pageSize?: number
  initialPageSize?: number
  tanQuery?: boolean
  isFetching?: boolean
  queryData?: any
  isCollapsible?: boolean
} & Pick<
  SectionListProps<unknown>,
  | 'showsVerticalScrollIndicator'
  | 'ListEmptyComponent'
  | 'ListFooterComponent'
  | 'keyboardShouldPersistTaps'
>

export type TogglePlayConfig = {
  uid: UID
  id: ID
  source: PlaybackSource
}

export type LineupItemTileProps = Pick<
  LineupProps,
  'isTrending' | 'leadingElementId' | 'itemStyles' | 'showArtistPick'
> & {
  rankIconCount: number
  item: LineupItem | LoadingLineupItem
  index: number
  togglePlay: ({ uid, id, source }: TogglePlayConfig) => void
  onPress?: (id: ID) => void
}

export type LineupTileViewProps = Omit<LineupItemTileProps, 'item'> & {
  item: LineupItem
}
