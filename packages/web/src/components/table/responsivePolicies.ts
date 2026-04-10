import { ResponsiveColumns } from './responsiveColumns'

const makeBreakpointPolicy = (
  hideOrder: readonly string[],
  alwaysVisibleIds: readonly string[],
  maxWidths: readonly number[]
): ResponsiveColumns => ({
  hideOrder,
  alwaysVisibleIds,
  breakpoints: maxWidths.map((maxWidth, index) => ({
    maxWidth,
    hide: hideOrder.slice(0, index + 1)
  }))
})

export const RESPONSIVE_TABLE_POLICIES = {
  libraryTracks: makeBreakpointPolicy(
    ['dateReleased', 'time', 'dateSaved', 'reposts', 'plays'],
    ['trackName', 'trackActions'],
    [1120, 1000, 900, 820, 740]
  ),
  collectionPlaylistTracks: makeBreakpointPolicy(
    ['dateAdded', 'time', 'reposts', 'plays'],
    ['trackName', 'trackActions'],
    [1080, 960, 860, 760]
  ),
  collectionAlbumTracks: makeBreakpointPolicy(
    ['date', 'time', 'reposts', 'plays'],
    ['playButton', 'trackName', 'trackActions'],
    [1080, 960, 860, 760]
  ),
  dashboardTracks: makeBreakpointPolicy(
    ['spacer', 'reposts', 'saves', 'comments', 'plays', 'dateReleased'],
    ['trackName', 'overflowMenu'],
    [1280, 1160, 1040, 920, 820, 740]
  ),
  historyTracks: makeBreakpointPolicy(
    ['dateReleased', 'dateListened', 'time', 'reposts', 'plays'],
    ['trackName', 'trackActions'],
    [1140, 1020, 920, 840, 760]
  ),
  dashboardAlbums: makeBreakpointPolicy(
    ['spacer', 'reposts', 'saves', 'dateReleased'],
    ['name', 'overflowMenu'],
    [1200, 1080, 960, 840]
  ),
  artistCoinsLeaderboard: makeBreakpointPolicy(
    ['holders', 'createdDate', 'marketCap', 'totalVolumeUSD'],
    ['tokenName', 'buy'],
    [1320, 1180, 1040, 920]
  ),
  audioTransactions: makeBreakpointPolicy(
    ['spacer2', 'balance', 'change', 'date', 'spacer'],
    ['transactionType'],
    [1180, 1060, 940, 820, 720]
  ),
  sales: makeBreakpointPolicy(
    ['spacerRight', 'buyer', 'date', 'spacerLeft'],
    ['contentName', 'value'],
    [1120, 1000, 880, 760]
  ),
  purchases: makeBreakpointPolicy(
    ['spacerRight', 'date', 'spacerLeft'],
    ['contentName', 'value'],
    [1120, 1000, 880, 760]
  ),
  withdrawals: makeBreakpointPolicy(
    ['spacerRight', 'destination', 'date', 'spacerLeft'],
    ['amount'],
    [1120, 1000, 880, 760]
  )
} as const satisfies Record<string, ResponsiveColumns>
