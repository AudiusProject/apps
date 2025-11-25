import { useCallback, useState } from 'react'

import { useCollection, useCurrentAccount, useTrack } from '@audius/common/api'
import {
  FavoriteSource,
  ID,
  Name,
  PlaylistLibraryID,
  PlaylistLibraryKind,
  ShareSource
} from '@audius/common/models'
import {
  cacheCollectionsActions,
  collectionsSocialActions,
  playlistLibraryActions,
  shareModalUIActions
} from '@audius/common/store'
import {
  Flex,
  IconHeart,
  IconPencil,
  IconShare,
  IconSpeaker,
  IconTrash,
  PopupMenuItem,
  Text,
  useTheme
} from '@audius/harmony'
import { pick } from 'lodash'
import { useDispatch } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { useToggle } from 'react-use'

import { make, useRecord } from 'common/store/analytics/actions'
import { Draggable } from 'components/dragndrop'
import { DeleteCollectionConfirmationModal } from 'components/edit-collection/DeleteCollectionConfirmationModal'
import {
  DragDropKind,
  selectDraggingId,
  selectDraggingKind
} from 'store/dragndrop/slice'
import { useSelector } from 'utils/reducer'
import { BASE_URL } from 'utils/route'

import { LeftNavDroppable } from '../LeftNavDroppable'
import { LeftNavLink } from '../LeftNavLink'

import { NavItemKebabButton } from './NavItemKebabButton'
import { PlaylistUpdateDot } from './PlaylistUpdateDot'
import { usePlaylistPlayingStatus } from './usePlaylistPlayingStatus'

const { addTrackToPlaylist } = cacheCollectionsActions
const { reorder } = playlistLibraryActions
const { requestOpen } = shareModalUIActions
const { unsaveCollection } = collectionsSocialActions

const messages = {
  editPlaylistLabel: 'Edit playlist',
  edit: 'Edit',
  share: 'Share',
  delete: 'Delete',
  unfavorite: 'Unfavorite'
}

const acceptedKinds: DragDropKind[] = [
  'track',
  'playlist',
  'library-playlist',
  'playlist-folder'
]

type CollectionNavItemProps = {
  id: PlaylistLibraryID
  name: string
  url: string
  isOwned: boolean
  level: number
  hasUpdate?: boolean
  onClick?: () => void
  isChild?: boolean
  exact?: boolean
}

export const CollectionNavItem = (props: CollectionNavItemProps) => {
  const { id, name, url, isOwned, level, hasUpdate, onClick, isChild, exact } =
    props
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const location = useLocation()
  const isSelected = location.pathname === url
  const dispatch = useDispatch()
  const record = useRecord()
  const navigate = useNavigate()

  const { spacing } = useTheme()

  const { data: partialCollection } = useCollection(id, {
    // ensure read only
    enabled: false,
    select: (collection) =>
      pick(collection, 'is_album', 'playlist_name', 'permalink', 'is_private')
  })

  const { data: accountCollection } = useCurrentAccount({
    select: (account) => account?.collections?.[id]
  })

  const { permalink } = partialCollection ?? accountCollection ?? {}

  const [isDeleteConfirmationOpen, toggleDeleteConfirmationOpen] =
    useToggle(false)

  const handleDragEnter = useCallback(() => {
    setIsDraggingOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
  }, [])

  const handleEdit = useCallback(() => {
    navigate(`${permalink}/edit`)
    record(make(Name.PLAYLIST_OPEN_EDIT_FROM_LIBRARY, {}))
  }, [navigate, permalink, record])

  const handleShare = useCallback(() => {
    dispatch(
      requestOpen({
        type: 'collection',
        collectionId: id,
        source: ShareSource.LEFT_NAV
      })
    )
  }, [dispatch, id])

  const handleDelete = useCallback(() => {
    toggleDeleteConfirmationOpen()
  }, [toggleDeleteConfirmationOpen])

  const handleUnfavorite = useCallback(() => {
    dispatch(unsaveCollection(id, FavoriteSource.NAVIGATOR))
  }, [id, dispatch])

  const kebabItems: PopupMenuItem[] = isOwned
    ? [
        {
          text: messages.edit,
          onClick: handleEdit,
          icon: <IconPencil color='default' />
        },
        {
          text: messages.share,
          onClick: handleShare,
          icon: <IconShare color='default' />
        },
        {
          text: messages.delete,
          onClick: handleDelete,
          icon: <IconTrash color='default' />
        }
      ]
    : [
        {
          text: messages.unfavorite,
          onClick: handleUnfavorite,
          icon: <IconHeart color='active' />
        },
        {
          text: messages.share,
          onClick: handleShare,
          icon: <IconShare color='default' />
        }
      ]

  const handleDrop = useCallback(
    (draggingId: PlaylistLibraryID, kind: DragDropKind) => {
      if (kind === 'track') {
        dispatch(addTrackToPlaylist(draggingId, id))
      } else {
        dispatch(
          reorder({
            draggingId,
            droppingId: id,
            draggingKind: kind as PlaylistLibraryKind
          })
        )
      }
    },
    [dispatch, id]
  )

  const draggingKind = useSelector(selectDraggingKind)
  const draggingId = useSelector(selectDraggingId)
  const { data: isUnlisted } = useTrack(draggingId as ID, {
    enabled: typeof draggingId === 'number',
    select: (track) => {
      return track.is_unlisted
    }
  })
  const hiddenTrackCheck =
    !!isUnlisted &&
    !!partialCollection &&
    isUnlisted &&
    !partialCollection?.is_private

  const isDisabled =
    (draggingKind === 'track' && !isOwned) ||
    draggingId === id ||
    (draggingKind === 'playlist-folder' && level > 0) ||
    hiddenTrackCheck

  const isPlayingFromThisPlaylist = usePlaylistPlayingStatus(id)

  if (!name || !url) return null

  const indentAmount = level * spacing.m

  return (
    <>
      <LeftNavDroppable
        acceptedKinds={acceptedKinds}
        onDrop={handleDrop}
        disabled={isDisabled}
      >
        <Draggable
          id={id}
          text={name}
          // Draggables require full URL
          link={`${BASE_URL}${url}`}
          kind='library-playlist'
        >
          <LeftNavLink
            to={url}
            onClick={onClick}
            disabled={isDisabled}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            textSize='s'
            variant='compact'
            css={{
              '& > div': {
                marginLeft: indentAmount
              }
            }}
            rightIcon={
              isPlayingFromThisPlaylist ? (
                <IconSpeaker size='s' color={isSelected ? 'white' : 'accent'} />
              ) : null
            }
            leftOverride={hasUpdate ? <PlaylistUpdateDot /> : null}
            isChild={isChild}
            exact={exact}
          >
            <Flex
              alignItems='center'
              w='100%'
              h='xl'
              pl={indentAmount}
              gap='xs'
              css={{ position: 'relative' }}
              justifyContent='space-between'
            >
              <Text
                variant='body'
                size='s'
                css={{ maxWidth: '160px' }}
                ellipses
              >
                {name}
              </Text>
              <NavItemKebabButton
                visible={isHovering && !isDraggingOver}
                aria-label={
                  isOwned ? messages.editPlaylistLabel : messages.unfavorite
                }
                items={kebabItems}
                isSelected={isSelected}
              />
            </Flex>
          </LeftNavLink>
        </Draggable>
      </LeftNavDroppable>

      {isOwned && typeof id === 'number' ? (
        <DeleteCollectionConfirmationModal
          collectionId={id}
          visible={isDeleteConfirmationOpen}
          onCancel={toggleDeleteConfirmationOpen}
        />
      ) : null}
    </>
  )
}
