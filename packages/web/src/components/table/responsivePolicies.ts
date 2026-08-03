import { ResponsiveBreakpoint, ResponsiveColumns } from './responsiveColumns'

const makeHideOrderPolicy = (
  hideOrder: readonly string[],
  alwaysVisibleIds: readonly string[]
): ResponsiveColumns => ({
  hideOrder,
  alwaysVisibleIds
})

const makeBreakpointPolicy = (
  breakpoints: readonly ResponsiveBreakpoint[],
  alwaysVisibleIds: readonly string[]
): ResponsiveColumns => ({
  breakpoints,
  alwaysVisibleIds
})

export const RESPONSIVE_TABLE_POLICIES = {
  libraryTracks: makeHideOrderPolicy(
    ['dateReleased', 'time', 'dateSaved', 'reposts', 'plays'],
    ['trackName', 'trackActions']
  ),
  collectionPlaylistTracks: makeHideOrderPolicy(
    ['dateAdded', 'time', 'reposts', 'plays'],
    ['trackName', 'trackActions']
  ),
  collectionAlbumTracks: makeHideOrderPolicy(
    ['date', 'time', 'reposts', 'plays'],
    ['playButton', 'trackName', 'trackActions']
  ),
  dashboardTracks: makeHideOrderPolicy(
    ['spacer', 'reposts', 'saves', 'comments', 'plays', 'dateReleased'],
    ['trackName', 'overflowMenu']
  ),
  historyTracks: makeHideOrderPolicy(
    ['dateReleased', 'dateListened', 'time', 'reposts', 'plays'],
    ['trackName', 'trackActions']
  ),
  dashboardAlbums: makeHideOrderPolicy(
    ['spacer', 'reposts', 'saves', 'dateReleased'],
    ['name', 'overflowMenu']
  ),
  fanClubsLeaderboard: makeBreakpointPolicy(
    [
      {
        maxWidth: 1199,
        hide: ['holders']
      },
      {
        maxWidth: 1087,
        hide: ['holders', 'createdDate']
      },
      {
        maxWidth: 959,
        hide: ['holders', 'createdDate', 'marketCap']
      },
      {
        maxWidth: 815,
        hide: ['holders', 'createdDate', 'marketCap']
      },
      {
        maxWidth: 671,
        hide: ['holders', 'createdDate', 'marketCap', 'artist']
      },
      {
        maxWidth: 420,
        hide: ['holders', 'createdDate', 'marketCap', 'artist', 'price']
      }
    ],
    ['tokenName', 'buy']
  ),
  audioTransactions: makeHideOrderPolicy(
    ['spacer2', 'balance', 'change', 'date', 'spacer'],
    ['transactionType']
  ),
  sales: makeHideOrderPolicy(
    ['spacerRight', 'buyer', 'date', 'spacerLeft'],
    ['contentName', 'value']
  ),
  purchases: makeHideOrderPolicy([], ['contentName', 'date', 'value']),
  withdrawals: makeHideOrderPolicy([], ['destination', 'date', 'amount'])
} as const satisfies Record<string, ResponsiveColumns>
