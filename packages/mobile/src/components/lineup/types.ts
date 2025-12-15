import type { ReactElement } from 'react'

import type { Kind, ID, UID, Lineup as LineupData } from '@audius/common/models'
import type { LineupBaseActions, CommonState } from '@audius/common/store'
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
  /** Object containing lineup actions such as setPage */
  actions: LineupBaseActions

  /** The maximum number of total tracks to fetch */
  count?: number

  /**
   * Whether or not to delineate the lineup by time of the `activityTimestamp`
   */
  delineate?: boolean

  /**
   * Do not scroll to top of lineup when containing tab navigator tab is pressed
   */
  disableTopTabScroll?: boolean

  /**
   * Optional payload to pass to the fetch action
   */
  fetchPayload?: any

  /**
   * Extra fetch payload (merged in with fetch action) used to pass extra information to lineup actions/reducers/sagas
   */
  extraFetchOptions?: Record<string, unknown>

  /**
   * When `true` hide the header when the lineup is empty
   */
  hideHeaderOnEmpty?: boolean

  /**
   * A header to display at the top of the lineup,
   * will scroll with the rest of the content
   */
  header?: SectionListProps<unknown>['ListHeaderComponent']

  /**
   * An optional component to render when the lineup has no contents
   * in it.
   */
  LineupEmptyComponent?: SectionListProps<unknown>['ListEmptyComponent']

  /** Are we in a trending lineup? Allows tiles to specialize their rendering */
  isTrending?: boolean

  /**
   * When `true` lineup waits until visible before fetching.
   * This is especcially needed for lineups inside collapsible-tab-view
   * which do not support tab-navigator lazy mode
   */
  lazy?: boolean

  /**
   * Indicator if a track should be displayed differently (ie. artist pick)
   * The leadingElementId is displayed at the top of the lineup
   */
  leadingElementId?: ID | null

  /**
   * A custom delineator to show after the leading element
   */
  leadingElementDelineator?: ReactElement

  /**
   * Whether to show the artist pick icon on track tiles (only on profile page)
   */
  showArtistPick?: boolean

  /** The number of tracks to fetch in each request */
  limit?: number

  /**
   * The Lineup object containing entries
   */
  lineup?: LineupData<LineupItem>

  /**
   * The Lineup selector, allowing the lineup to select lineup itself
   */
  lineupSelector?: (state: CommonState) => LineupData<LineupItem>

  /**
   * Function called to load more entries
   */
  loadMore?: (offset: number, limit: number, overwrite: boolean) => void

  /**
   * Function called on refresh
   */
  refresh?: () => void

  /**
   * Boolean indicating if currently fetching data for a refresh
   * Must be provided if `refresh` is provided
   */
  refreshing?: boolean

  /**
   * How many icons to show for top ranked entries in the lineup. Defaults to 0, showing none
   */
  rankIconCount?: number

  /**
   * Is the lineup responsible for initially fetching it's own data
   */
  selfLoad?: boolean

  /**
   * Which item to start the lineup at (previous items will not be rendered)
   */
  start?: number

  /**
   * The variant of the Lineup
   */
  variant?: LineupVariant

  /**
   * Uniquely identifies Lineup's SectionList. Needed if rendered inside
   * another VirtualizedList.
   */
  listKey?: string

  /**
   * When `true` don't load more while lineup status is `LOADING`.
   * This helps prevent collisions with any in-flight loading from web-app
   */
  includeLineupStatus?: boolean
  /**
   * When `true`, add pull-to-refresh capability
   */
  pullToRefresh?: boolean

  /**
   * Function called when item is pressed
   */
  onPressItem?: (id: ID) => void

  /**
   * Styles to apply to the items, can be used to override the padding for example
   */
  itemStyles?: ViewStyle
  pageSize?: number
  initialPageSize?: number
  tanQuery?: boolean
  isFetching?: boolean
  // TODO:
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
  /** Object containing lineup actions such as play, setPage, togglePlay */
  actions: LineupBaseActions
}

export type LineupTileViewProps = Omit<LineupItemTileProps, 'item'> & {
  item: LineupItem
}
