import { useRef } from 'react'

import { Status } from '@audius/common/models'

import { CollectionTile as DesktopCollectionTile } from 'components/track/desktop/CollectionTile'
import { TrackTile as DesktopTrackTile } from 'components/track/desktop/TrackTile'
import { CollectionTile as MobileCollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTile as MobileTrackTile } from 'components/track/mobile/TrackTile'
import { useIsContainerNarrow } from 'hooks/useIsContainerNarrow'
import { useIsMobile } from 'hooks/useIsMobile'

import LineupProvider, { LineupProviderProps } from './LineupProvider'
import { LineupVariant } from './types'

const NARROW_CONTAINER_THRESHOLD_PX = 600

export type LineupProps = Omit<
  LineupProviderProps,
  'trackTile' | 'skeletonTile' | 'playlistTile'
>

const defaultLineup = {
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
}

/** A lineup renders a LineupProvider, injecting different tiles
 * depending on the client state.
 */
const Lineup = ({
  lineup = defaultLineup,
  start = 0,
  playing = false,
  variant = LineupVariant.MAIN,
  selfLoad = true,
  delineate = false,
  loadMore = () => {},
  ordered = false,
  setInView,
  ...otherProps
}: LineupProps) => {
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const isNarrow = useIsContainerNarrow(containerRef, NARROW_CONTAINER_THRESHOLD_PX)

  const useCompactTile = isMobile || variant === LineupVariant.SECTION || isNarrow
  const trackTile = useCompactTile ? MobileTrackTile : DesktopTrackTile
  const playlistTile = useCompactTile ? MobileCollectionTile : DesktopCollectionTile

  const providerProps = {
    lineup,
    start,
    playing,
    variant,
    selfLoad,
    delineate,
    loadMore,
    ordered,
    setInView,
    trackTile,
    playlistTile,
    ...otherProps
  }

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <LineupProvider {...providerProps} />
    </div>
  )
}

export default Lineup
