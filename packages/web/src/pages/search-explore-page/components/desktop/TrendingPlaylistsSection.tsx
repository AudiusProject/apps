import { useTrendingPlaylists, UseLineupQueryData } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'
import { ID, Status, UID } from '@audius/common/models'
import { Flex } from '@audius/harmony'
import { full } from '@audius/sdk'
import { ClassNames } from '@emotion/react'

import { CollectionTile as DesktopCollectionTile } from 'components/track/desktop/CollectionTile'
import { CollectionTile as MobileCollectionTile } from 'components/track/mobile/CollectionTile'
import { TrackTileSize } from 'components/track/types'
import { useIsMobile } from 'hooks/useIsMobile'

import { Carousel } from './Carousel'
import {
  COLLECTION_TILE_HEIGHT,
  MOBILE_COLLECTION_TILE_HEIGHT,
  MOBILE_TILE_WIDTH,
  TILE_WIDTH
} from './constants'
import { useDeferredElement } from './useDeferredElement'

type TileType = typeof DesktopCollectionTile | typeof MobileCollectionTile

const CollectionTileSkeleton = ({
  size,
  Tile,
  noShimmer
}: {
  size: TrackTileSize
  Tile: TileType
  noShimmer?: boolean
}) => {
  return (
    <ClassNames>
      {({ css }) => (
        <Flex
          w={size === TrackTileSize.LARGE ? TILE_WIDTH : MOBILE_TILE_WIDTH}
          h={
            size === TrackTileSize.LARGE
              ? COLLECTION_TILE_HEIGHT
              : MOBILE_COLLECTION_TILE_HEIGHT
          }
        >
          <Tile
            hasLoaded={() => {}}
            isTrending={false}
            isFeed={false}
            id={0}
            containerClassName={css({ width: '100%', height: '100%' })}
            numLoadingSkeletonRows={5}
            size={size}
            isLoading={true}
            uid={''}
            ordered={false}
            index={0}
            togglePlay={() => {}}
            playTrack={() => {}}
            pauseTrack={() => {}}
            noShimmer={noShimmer}
          />
        </Flex>
      )}
    </ClassNames>
  )
}

const CollectionLineupCarousel = ({
  lineup,
  play,
  pause,
  togglePlay,
  size,
  Tile
}: {
  lineup: UseLineupQueryData['lineup']
  play: (uid?: UID) => void
  pause: () => void
  togglePlay: (uid: UID, id: ID) => void
  size: TrackTileSize
  Tile: TileType
}) => {
  return (
    <>
      {lineup.entries.map((item, index) => {
        return (
          <Flex
            key={item.id}
            w={size === TrackTileSize.LARGE ? TILE_WIDTH : MOBILE_TILE_WIDTH}
            h={
              size === TrackTileSize.LARGE
                ? COLLECTION_TILE_HEIGHT
                : MOBILE_COLLECTION_TILE_HEIGHT
            }
          >
            <ClassNames>
              {({ css }) => (
                <Tile
                  ordered={true}
                  size={size}
                  togglePlay={togglePlay}
                  playTrack={play}
                  pauseTrack={pause}
                  id={item.id}
                  index={index}
                  isTrending={true}
                  uid={item.uid}
                  isLoading={false}
                  containerClassName={css({ width: '100%', height: '100%' })}
                  hasLoaded={() => {}}
                  isFeed={false}
                />
              )}
            </ClassNames>
          </Flex>
        )
      })}
    </>
  )
}

export const TrendingPlaylistsSection = () => {
  const { ref, inView } = useDeferredElement()
  const isMobile = useIsMobile()
  const size = isMobile ? TrackTileSize.SMALL : TrackTileSize.LARGE
  const { lineup, isError, isSuccess, isLoading, play, pause, togglePlay } =
    useTrendingPlaylists(
      {
        pageSize: 10,
        time: full.GetTrendingPlaylistsTimeEnum.Week
      },
      {
        enabled: inView
      }
    )
  const Tile = isMobile ? MobileCollectionTile : DesktopCollectionTile

  if (
    isError ||
    lineup.status === Status.ERROR ||
    (isSuccess &&
      lineup.status === Status.SUCCESS &&
      lineup.entries.length === 0)
  ) {
    return null
  }

  return (
    <Carousel
      ref={ref}
      title={messages.trendingPlaylists}
      viewAllLink='/explore/playlists'
    >
      {!inView || isLoading || lineup.status === Status.LOADING ? (
        <>
          <CollectionTileSkeleton size={size} Tile={Tile} noShimmer />
          <CollectionTileSkeleton size={size} Tile={Tile} noShimmer />
        </>
      ) : (
        <CollectionLineupCarousel
          lineup={lineup}
          play={play}
          pause={pause}
          togglePlay={togglePlay}
          size={size}
          Tile={Tile}
        />
      )}
    </Carousel>
  )
}
