import { MouseEventHandler, useCallback, useMemo } from 'react'

import {
  useGetPlaylistById,
  useGetTrackById,
  useGetUserById
} from '@audius/common/api'
import { Kind, SquareSizes, Status } from '@audius/common/models'
import {
  SearchItem,
  isSearchItem,
  searchActions,
  searchSelectors
} from '@audius/common/store'
import {
  Artwork,
  Button,
  Flex,
  IconButton,
  IconClose,
  Paper,
  Skeleton,
  Text,
  useTheme
} from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { Avatar } from 'components/avatar'
import { UserLink } from 'components/link'
import { useCollectionCoverArt2 } from 'hooks/useCollectionCoverArt'
import { useMedia } from 'hooks/useMedia'
import { useTrackCoverArt2 } from 'hooks/useTrackCoverArt'
import { profilePage } from 'utils/route'

const MAX_RECENT_SEARCHES = 12

const { removeItem, clearHistory } = searchActions
const { getSearchHistory } = searchSelectors

const messages = {
  album: 'Album',
  clear: 'Clear Recent Searches',
  goTo: 'Go to: ',
  playlist: 'Playlist',
  profile: 'Profile',
  remove: 'Remove recent search',
  title: 'Recent searches',
  track: 'Track'
}

const RecentSearchSkeleton = () => (
  <Flex w='100%' pv='s' ph='xl' justifyContent='space-between'>
    <Flex gap='m'>
      <Skeleton w='40px' h='40px' />

      <Flex direction='column' gap='s'>
        <Skeleton w='120px' h='12px' />
        <Skeleton w='100px' h='12px' />
      </Flex>
    </Flex>
  </Flex>
)

type RecentSearchProps = {
  children: React.ReactNode
  linkTo: string
  searchItem: SearchItem
  title: string
}

const RecentSearch = (props: RecentSearchProps) => {
  const { children, linkTo, searchItem, title } = props
  const { color } = useTheme()
  const dispatch = useDispatch()

  const handleClickRemove = useCallback<MouseEventHandler>(
    (e) => {
      e.stopPropagation()
      e.preventDefault()
      dispatch(removeItem({ searchItem }))
    },
    [dispatch, searchItem]
  )

  return (
    <Link to={linkTo}>
      <Flex
        w='100%'
        pv='s'
        ph='xl'
        justifyContent='space-between'
        css={{
          cursor: 'pointer',
          ':hover': {
            backgroundColor: color.background.surface2
          }
        }}
        role='button'
        aria-label={`${messages.goTo} ${title}`}
      >
        <Flex gap='m'>{children}</Flex>
        <IconButton
          aria-label={messages.remove}
          icon={IconClose}
          color='subdued'
          size='s'
          onClick={handleClickRemove}
        />
      </Flex>
    </Link>
  )
}

const RecentSearchTrack = (props: { searchItem: SearchItem }) => {
  const { searchItem } = props
  const { id } = searchItem
  const { data: track, status } = useGetTrackById({ id })

  const image = useTrackCoverArt2(track?.track_id, SquareSizes.SIZE_150_BY_150)

  if (status === Status.LOADING) return <RecentSearchSkeleton />

  if (!track) return null
  const { permalink, title, user } = track

  if (!user) return null

  return (
    <RecentSearch searchItem={searchItem} title={title} linkTo={permalink}>
      <Artwork src={image} w='40px' borderRadius='xs' />
      <Flex direction='column' alignItems='flex-start'>
        <Text variant='body' size='s'>
          {title}
        </Text>
        <Flex alignItems='baseline'>
          <Text variant='body' size='xs' color='subdued'>
            {messages.track}
            {' |'}
            &nbsp;
            <UserLink userId={user.user_id} variant='subdued' badgeSize='2xs' />
          </Text>
        </Flex>
      </Flex>
    </RecentSearch>
  )
}

const RecentSearchCollection = (props: { searchItem: SearchItem }) => {
  const { searchItem } = props
  const { id } = searchItem
  const { data: playlist, status } = useGetPlaylistById({
    playlistId: id
  })

  const image = useCollectionCoverArt2(
    playlist?.playlist_id,
    SquareSizes.SIZE_150_BY_150
  )

  if (status === Status.LOADING) return <RecentSearchSkeleton />

  if (!playlist) return null
  const { is_album, playlist_name, permalink, user } = playlist

  if (!user) return null

  return (
    <RecentSearch
      searchItem={searchItem}
      title={playlist_name}
      linkTo={permalink}
    >
      <Artwork src={image} w={40} borderRadius='xs' />
      <Flex direction='column' alignItems='flex-start'>
        <Text variant='body' size='s'>
          {playlist_name}
        </Text>
        <Flex alignItems='baseline'>
          <Text variant='body' size='xs' color='subdued'>
            {is_album ? messages.album : messages.playlist}
            {' |'}
            &nbsp;
            <UserLink userId={user.user_id} variant='subdued' badgeSize='2xs' />
          </Text>
        </Flex>
      </Flex>
    </RecentSearch>
  )
}

const RecentSearchUser = (props: { searchItem: SearchItem }) => {
  const { searchItem } = props
  const { id } = searchItem
  const { data: user, status } = useGetUserById({ id })

  if (status === Status.LOADING) return <RecentSearchSkeleton />

  if (!user) return null
  const { handle, name } = user

  return (
    <RecentSearch
      searchItem={searchItem}
      title={name}
      linkTo={profilePage(handle)}
    >
      <Avatar userId={id} w={40} borderWidth='thin' />
      <Flex direction='column' alignItems='flex-start'>
        <Text variant='body' size='s'>
          <UserLink userId={user.user_id} size='s' badgeSize='xs' />
        </Text>
        <Text variant='body' size='xs' color='subdued'>
          Profile
        </Text>
      </Flex>
    </RecentSearch>
  )
}

const itemComponentByKind = {
  [Kind.TRACKS]: RecentSearchTrack,
  [Kind.USERS]: RecentSearchUser,
  [Kind.COLLECTIONS]: RecentSearchCollection
}

export const RecentSearches = () => {
  const searchItems = useSelector(getSearchHistory)
  const dispatch = useDispatch()
  const { isMobile } = useMedia()

  const truncatedSearchItems = useMemo(
    () => searchItems.slice(0, MAX_RECENT_SEARCHES),
    [searchItems]
  )

  const handleClickClear = useCallback(() => {
    dispatch(clearHistory())
  }, [dispatch])

  const content = (
    <>
      <Flex mh='xl'>
        <Text variant='heading' size='s' css={{ alignSelf: 'flex-start' }}>
          {messages.title}
        </Text>
      </Flex>
      <Flex direction='column'>
        {(truncatedSearchItems || []).map((searchItem) => {
          if (isSearchItem(searchItem)) {
            const { kind, id } = searchItem
            const ItemComponent = itemComponentByKind[kind]
            return <ItemComponent searchItem={searchItem} key={id} />
          }
          return null
        })}
      </Flex>
      <Button
        variant='secondary'
        size='small'
        fullWidth={false}
        css={{ alignSelf: 'center' }}
        onClick={handleClickClear}
      >
        {messages.clear}
      </Button>
    </>
  )

  if (!truncatedSearchItems.length) return null

  return isMobile ? (
    <Flex w='100%' direction='column' gap='l'>
      {content}
    </Flex>
  ) : (
    <Paper
      pv='xl'
      w='100%'
      css={{ maxWidth: '688px' }}
      direction='column'
      gap='l'
    >
      {content}
    </Paper>
  )
}
