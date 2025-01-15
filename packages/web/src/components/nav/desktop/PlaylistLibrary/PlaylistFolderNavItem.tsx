import { useCallback, useState, MouseEvent, useMemo } from 'react'

import {
  Name,
  PlaylistLibraryID,
  PlaylistLibraryKind,
  PlaylistLibraryFolder
} from '@audius/common/models'
import {
  playlistLibraryActions,
  modalsActions,
  playlistUpdatesSelectors
} from '@audius/common/store'
import {
  IconFolder,
  PopupMenuItem,
  ExpandableNavItem,
  Box,
  Flex,
  useTheme
} from '@audius/harmony'
import { ClassNames } from '@emotion/react'
import { useDispatch } from 'react-redux'
import { useToggle } from 'react-use'

import { make, useRecord } from 'common/store/analytics/actions'
import { Draggable, Droppable } from 'components/dragndrop'
import { setFolderId as setEditFolderModalFolderId } from 'store/application/ui/editFolderModal/slice'
import { DragDropKind, selectDraggingKind } from 'store/dragndrop/slice'
import { useSelector } from 'utils/reducer'

import { DeleteFolderConfirmationModal } from './DeleteFolderConfirmationModal'
import { NavItemKebabButton } from './NavItemKebabButton'
import { PlaylistLibraryNavItem, keyExtractor } from './PlaylistLibraryNavItem'

const { setVisibility } = modalsActions
const { addToFolder } = playlistLibraryActions
const { selectPlaylistUpdateById } = playlistUpdatesSelectors

type PlaylistFolderNavItemProps = {
  folder: PlaylistLibraryFolder
  level: number
}

const acceptedKinds: DragDropKind[] = ['playlist', 'library-playlist']

const messages = {
  editFolderLabel: 'More folder actions',
  edit: 'Edit',
  delete: 'Delete'
}

export const PlaylistFolderNavItem = (props: PlaylistFolderNavItemProps) => {
  const { spacing } = useTheme()
  const { folder, level } = props
  const { name, contents, id } = folder
  const folderHasUpdate = useSelector((state) => {
    return folder.contents.some(
      (content) =>
        content.type === 'playlist' &&
        selectPlaylistUpdateById(state, content.playlist_id)
    )
  })
  const draggingKind = useSelector(selectDraggingKind)
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const [isHoveringNested, setIsHoveringNested] = useState(false)
  const dispatch = useDispatch()
  const record = useRecord()
  const [isDeleteConfirmationOpen, toggleDeleteConfirmationOpen] =
    useToggle(false)

  const isDisabled = draggingKind && !acceptedKinds.includes(draggingKind)

  const handleDrop = useCallback(
    (id: PlaylistLibraryID, kind: DragDropKind) => {
      dispatch(
        addToFolder({
          folder,
          draggingId: id,
          draggingKind: kind as PlaylistLibraryKind
        })
      )
    },
    [dispatch, folder]
  )

  const handleDragEnter = useCallback(() => {
    if (!isDisabled) {
      setIsDraggingOver(true)
    }
  }, [isDisabled])

  const handleDragLeave = useCallback(() => {
    setIsDraggingOver(false)
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
  }, [])

  const handleNestedMouseEnter = useCallback(() => {
    setIsHoveringNested(true)
  }, [])

  const handleNestedMouseLeave = useCallback(() => {
    setIsHoveringNested(false)
  }, [])

  const handleClickEdit = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      dispatch(setEditFolderModalFolderId(id))
      dispatch(setVisibility({ modal: 'EditFolder', visible: true }))
      record(make(Name.FOLDER_OPEN_EDIT, {}))
    },
    [dispatch, id, record]
  )

  const kebabItems: PopupMenuItem[] = useMemo(
    () => [
      { text: messages.edit, onClick: handleClickEdit },
      { text: messages.delete, onClick: toggleDeleteConfirmationOpen }
    ],
    [handleClickEdit, toggleDeleteConfirmationOpen]
  )

  const rightIcon = useMemo(() => {
    return isHovering && !isDraggingOver && !isHoveringNested ? (
      <NavItemKebabButton
        visible
        aria-label={messages.editFolderLabel}
        onClick={handleClickEdit}
        items={kebabItems}
        css={{ height: spacing.unit5 }}
      />
    ) : null
  }, [
    isHovering,
    isDraggingOver,
    isHoveringNested,
    handleClickEdit,
    kebabItems,
    spacing.unit5
  ])

  const nestedItems = useMemo(() => {
    return (
      <Flex
        direction='column'
        onMouseEnter={handleNestedMouseEnter}
        onMouseLeave={handleNestedMouseLeave}
      >
        {contents.map((content) => (
          <PlaylistLibraryNavItem
            key={keyExtractor(content)}
            item={content}
            level={level + 1}
          />
        ))}
      </Flex>
    )
  }, [contents, level, handleNestedMouseEnter, handleNestedMouseLeave])

  const FolderIcon = useCallback(
    (props: any) => (
      <IconFolder {...props} color={folderHasUpdate ? 'accent' : 'default'} />
    ),
    [folderHasUpdate]
  )

  return (
    <ClassNames>
      {({ css }) => (
        <Droppable
          acceptedKinds={acceptedKinds}
          onDrop={handleDrop}
          className={css({
            position: 'relative',
            '::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: 'var(--background-accent)',
              transition: 'opacity var(--quick)',
              opacity: 0
            },
            '&.droppableLinkHover::before': {
              opacity: 0.15
            }
          })}
          hoverClassName='droppableLinkHover'
          disabled={isDisabled}
        >
          <Draggable id={id} text={name} kind='playlist-folder'>
            <Box
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              css={[
                { display: 'flex', alignItems: 'center' },
                isDraggingOver && { '& > *': { pointerEvents: 'none' } }
              ]}
            >
              <ExpandableNavItem
                label={name}
                leftIcon={FolderIcon}
                rightIcon={rightIcon}
                nestedItems={nestedItems}
                variant='compact'
                shouldPersistDownArrow
              />
              <DeleteFolderConfirmationModal
                folderId={id}
                visible={isDeleteConfirmationOpen}
                onCancel={toggleDeleteConfirmationOpen}
              />
            </Box>
          </Draggable>
        </Droppable>
      )}
    </ClassNames>
  )
}
