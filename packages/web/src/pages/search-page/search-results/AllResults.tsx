import { useCallback, useRef } from 'react'

import { useSearchAllResults } from '@audius/common/api'
import { SquareSizes, Name, Kind } from '@audius/common/models'
import { searchActions, SearchKind } from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Flex,
  Paper,
  PlainButton,
  Text,
  Avatar,
  Artwork,
  Skeleton
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom-v5-compat'

import { make } from 'common/store/analytics/actions'
import { TrackArtwork } from 'components/track/TrackArtwork'
import { useIsMobile } from 'hooks/useIsMobile'

import { NoResultsTile } from '../NoResultsTile'
import { useSearchParams } from '../hooks'

import { AlbumResults } from './AlbumResults'
import { PlaylistResults } from './PlaylistResults'
import { ProfileResultsTiles } from './ProfileResults'
import { TrackResults } from './TrackResults'

const messages = {
  profiles: 'Profiles',
  profile: 'Profile',
  tracks: 'Tracks',
  track: 'Track',
  albums: 'Albums',
  album: 'Album',
  playlists: 'Playlists',
  playlist: 'Playlist',
  showAll: 'Show All'
}
const { addItem: addRecentSearch } = searchActions
const { profilePage } = route

type SearchResultItemProps = {
  item: any
  imageComponent: React.ReactNode
  entityType: string
  name: string
  kind: Kind
  onClick: (item: any, entityType: string, kind: Kind) => void
}

const SearchResultItem = ({
  item,
  imageComponent,
  entityType,
  name,
  kind,
  onClick
}: SearchResultItemProps) => (
  <Flex
    p='xs'
    gap='m'
    onClick={(e) => {
      e.stopPropagation()
      onClick(item, entityType, kind)
    }}
  >
    {imageComponent}
    <Flex direction='column' flex={1}>
      <Text size='s' ellipses style={{ maxWidth: '90%' }}>
        {name}
      </Text>
      <Text size='xs' color='subdued'>
        {entityType}
      </Text>
    </Flex>
  </Flex>
)

type SearchResultCardProps = {
  title: string
  items: any[]
  renderItem: (item: any) => React.ReactNode
  isLoading?: boolean
}

const SearchResultCard = ({
  title,
  items,
  renderItem,
  isLoading
}: SearchResultCardProps) => {
  if (!isLoading && items.length === 0) return null
  return (
    <Paper border='default' shadow='mid' p='l'>
      <Flex direction='column' gap='s' style={{ minWidth: '100%' }}>
        <Text variant='label' size='s' textTransform='uppercase'>
          {title}
        </Text>
        {isLoading
          ? Array.from({ length: 5 }, (_, index) => (
              <Flex p='xs' key={index} gap='m'>
                <Artwork isLoading={isLoading} w={40} h={40} />
                <Flex direction='column' flex={1} gap='xs'>
                  <Skeleton h={18} w='60%' />
                  <Skeleton h={16} w='40%' />
                </Flex>
              </Flex>
            ))
          : items.slice(0, 5).map(renderItem)}
      </Flex>
    </Paper>
  )
}

type AllResultsProps = {
  handleSearchTab?: (tab: string) => void
}

export const AllResults = ({ handleSearchTab }: AllResultsProps) => {
  const isMobile = useIsMobile()
  const containerRef = useRef<HTMLDivElement>(null)
  const { query, ...filters } = useSearchParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const queryData = useSearchAllResults({
    query,
    ...filters
  })

  const handleClickSearchResult = useCallback(
    (item: any, entityType: string, kind: Kind) => {
      let navigationPath = ''

      // Determine navigation path based on entity type
      switch (kind) {
        case Kind.USERS:
          navigationPath = profilePage(item.handle)
          break
        case Kind.TRACKS:
          navigationPath = item.permalink
          break
        case Kind.COLLECTIONS:
          navigationPath = route.collectionPage(
            item.user?.handle,
            item.playlist_name,
            item.playlist_id,
            item.permalink,
            item.is_album
          )
          break
        default:
          return
      }

      // Dispatch analytics
      dispatch(
        addRecentSearch({
          searchItem: {
            kind,
            id: item.user_id || item.track_id || item.playlist_id
          }
        })
      )
      dispatch(
        make(Name.SEARCH_RESULT_SELECT, {
          searchText: query,
          kind: entityType,
          id: item.user_id || item.track_id || item.playlist_id,
          source: 'search results page'
        })
      )

      // Navigate to the page
      navigate(navigationPath)
    },
    [dispatch, query, navigate]
  )

  const { data, isLoading, isPending, isError } = queryData

  const isResultsEmpty =
    data &&
    data.albums?.length === 0 &&
    data.users?.length === 0 &&
    data.playlists?.length === 0 &&
    data.tracks?.length === 0

  const showNoResultsTile = !isLoading && isResultsEmpty

  if (showNoResultsTile) return <NoResultsTile />

  if (isMobile) {
    return (
      <Flex direction='column' ph='l' pb='xl' pt='s' gap='m'>
        <SearchResultCard
          title={messages.profiles}
          items={data?.users ?? []}
          isLoading={isLoading}
          renderItem={(user) => (
            <SearchResultItem
              key={user.user_id}
              item={user}
              kind={Kind.USERS}
              onClick={handleClickSearchResult}
              imageComponent={
                <Avatar
                  size='medium'
                  src={user.profile_picture?.['480x480']}
                  isLoading={isLoading}
                />
              }
              name={user.name}
              entityType={messages.profile}
            />
          )}
        />
        <SearchResultCard
          title={messages.tracks}
          items={data?.tracks ?? []}
          isLoading={isLoading}
          renderItem={(track) => (
            <SearchResultItem
              key={track.track_id}
              item={track}
              kind={Kind.TRACKS}
              onClick={handleClickSearchResult}
              imageComponent={
                <TrackArtwork
                  size={SquareSizes.SIZE_150_BY_150}
                  trackId={track.track_id}
                  isLoading={isLoading}
                  h={40}
                  w={40}
                />
              }
              name={track.title}
              entityType={messages.track}
            />
          )}
        />
        <SearchResultCard
          title={messages.playlists}
          items={data?.playlists ?? []}
          isLoading={isLoading}
          renderItem={(playlist) => (
            <SearchResultItem
              key={playlist.playlist_id}
              item={playlist}
              kind={Kind.COLLECTIONS}
              onClick={handleClickSearchResult}
              imageComponent={
                <Artwork
                  src={playlist.artwork?.['150x150']}
                  isLoading={isLoading}
                  w={40}
                  h={40}
                />
              }
              name={playlist.playlist_name}
              entityType={messages.playlist}
            />
          )}
        />
        <SearchResultCard
          title={messages.albums}
          items={data?.albums ?? []}
          isLoading={isLoading}
          renderItem={(album) => (
            <SearchResultItem
              key={album.playlist_id}
              item={album}
              kind={Kind.COLLECTIONS}
              onClick={handleClickSearchResult}
              imageComponent={
                <Artwork
                  src={album.artwork?.['150x150']}
                  isLoading={isLoading}
                  w={40}
                  h={40}
                />
              }
              name={album.playlist_name}
              entityType={messages.album}
            />
          )}
        />
      </Flex>
    )
  }

  return (
    <Flex direction='column' gap='unit10' ref={containerRef}>
      {isLoading || data?.users?.length ? (
        <Flex gap='xl' direction='column'>
          <Flex justifyContent='space-between' alignItems='center'>
            <Text variant='heading' textAlign='left'>
              {messages.profiles}
            </Text>
            <PlainButton size='large' asChild>
              <Link to={`/search/profiles?query=${query}`}>
                {messages.showAll}
              </Link>
            </PlainButton>
          </Flex>
          <ProfileResultsTiles
            skeletonCount={5}
            limit={5}
            data={data?.users ?? []}
            isFetching={isLoading}
            isPending={isPending}
          />
        </Flex>
      ) : null}

      {isLoading || data?.tracks?.length ? (
        <Flex gap='xl' direction='column'>
          <Flex justifyContent='space-between' alignItems='center'>
            <Text variant='heading' textAlign='left'>
              {messages.tracks}
            </Text>
            <PlainButton size='large' asChild>
              <Link to={`/search/tracks?query=${query}`}>
                {messages.showAll}
              </Link>
            </PlainButton>
          </Flex>
          <TrackResults
            count={10}
            viewLayout='grid'
            category={SearchKind.ALL}
            isFetching={isLoading}
            isPending={isPending}
            isError={isError}
          />
        </Flex>
      ) : null}

      {isLoading || data?.albums?.length ? (
        <Flex gap='xl' direction='column'>
          <Flex justifyContent='space-between' alignItems='center'>
            <Text variant='heading' textAlign='left'>
              {messages.albums}
            </Text>
            <PlainButton size='large' asChild>
              <Link to={`/search/albums?query=${query}`}>
                {messages.showAll}
              </Link>
            </PlainButton>
          </Flex>
          <AlbumResults
            limit={5}
            data={data?.albums ?? []}
            isFetching={isLoading}
            isPending={isPending}
            skeletonCount={5}
          />
        </Flex>
      ) : null}

      {isLoading || data?.playlists?.length ? (
        <Flex gap='xl' direction='column'>
          <Flex justifyContent='space-between' alignItems='center'>
            <Text variant='heading' textAlign='left'>
              {messages.playlists}
            </Text>
            <PlainButton size='large' asChild>
              <Link to={`/search/playlists?query=${query}`}>
                {messages.showAll}
              </Link>
            </PlainButton>
          </Flex>
          <PlaylistResults
            skeletonCount={5}
            limit={5}
            data={data?.playlists ?? []}
            isFetching={isLoading}
            isPending={isPending}
          />
        </Flex>
      ) : null}
    </Flex>
  )
}
