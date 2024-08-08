import { Status } from '@audius/common/models'

import DesktopPlaylistTile from 'components/track/desktop/ConnectedPlaylistTile'
import DesktopTrackTile from 'components/track/desktop/ConnectedTrackTile'
import MobilePlaylistTile from 'components/track/mobile/ConnectedPlaylistTile'
import MobileTrackTile from 'components/track/mobile/ConnectedTrackTile'
import { useIsMobile } from 'hooks/useIsMobile'

import LineupProvider, { LineupProviderProps } from './LineupProvider'
import { LineupVariant } from './types'

export type LineupWithoutTile = Omit<
  LineupProviderProps,
  'trackTile' | 'skeletonTile' | 'playlistTile'
>
type LineupProps = LineupWithoutTile & { useSmallTiles?: boolean }

/** A lineup renders a LineupProvider, injecting different tiles
 * depending on the client state.
 */
const Lineup = (props: LineupProps) => {
  const { useSmallTiles } = props
  const isMobile = useIsMobile()
  const trackTile =
    isMobile || useSmallTiles ? MobileTrackTile : DesktopTrackTile
  const playlistTile =
    isMobile || useSmallTiles ? MobilePlaylistTile : DesktopPlaylistTile

  return (
    <LineupProvider
      {...props}
      trackTile={trackTile}
      playlistTile={playlistTile}
    />
  )
}

Lineup.defaultProps = {
  lineup: {
    entries: [] as any[],
    order: {},
    total: 0,
    deleted: 0,
    nullCount: 0,
    status: Status.LOADING,
    hasMore: true,
    inView: true,
    prefix: '',
    page: 0,
    isMetadataLoading: false
  },
  start: 0,
  playingUid: '',
  playing: false,
  variant: LineupVariant.MAIN,
  selfLoad: true,
  delineate: false,
  loadMore: () => {},
  ordered: false,
  setInView: undefined
}

export default Lineup
