import { useCallback } from 'react'

import { useCollection } from '@audius/common/api'
import {
  IconPencil,
  IconButton,
  IconButtonProps,
  Tooltip
} from '@audius/harmony'
import { pick } from 'lodash'
import { Link } from 'react-router'

import { usePlaylistEditMode } from './edit-mode/PlaylistEditModeContext'

const messages = {
  edit: (isAlbum: boolean) => `Edit ${isAlbum ? 'Album' : 'Playlist'}`,
  exitEdit: 'Done Editing'
}

type EditButtonProps = Partial<IconButtonProps> & {
  collectionId: number
}

export const EditButton = (props: EditButtonProps) => {
  const { collectionId, ...other } = props
  const { data: partialCollection } = useCollection(collectionId, {
    select: (collection) => pick(collection, ['is_album', 'permalink'])
  })
  const editMode = usePlaylistEditMode()

  const handleClick = useCallback(() => {
    if (editMode.isEditMode) {
      editMode.exitEditMode()
    } else {
      editMode.enterEditMode()
    }
  }, [editMode])

  if (!partialCollection) return null

  const { is_album, permalink } = partialCollection

  // If we have a real provider context, switch the button into an inline
  // edit-mode toggle. Otherwise, fall back to the legacy /edit link so other
  // call sites keep working.
  if (editMode.collectionId !== undefined) {
    return (
      <Tooltip
        text={editMode.isEditMode ? messages.exitEdit : messages.edit(is_album)}
      >
        <IconButton
          color={editMode.isEditMode ? 'default' : 'subdued'}
          icon={IconPencil}
          size='2xl'
          aria-label={
            editMode.isEditMode ? messages.exitEdit : messages.edit(is_album)
          }
          onClick={handleClick}
          {...other}
        />
      </Tooltip>
    )
  }

  return (
    <Tooltip text={messages.edit(is_album)}>
      <IconButton
        color='subdued'
        icon={IconPencil}
        size='2xl'
        aria-label={messages.edit(is_album)}
        asChild
        {...other}
      >
        <Link to={`${permalink}/edit`} />
      </IconButton>
    </Tooltip>
  )
}
