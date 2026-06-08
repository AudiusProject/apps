import { useCallback, useState } from 'react'

import { CreatePlaylistSource } from '@audius/common/models'
import {
  cacheCollectionsActions,
  useCreatePlaylistModal
} from '@audius/common/store'
import { getErrorMessage } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconImage,
  IconPlaylists,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  TextArea,
  TextInput
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import UploadArtwork from 'components/upload/UploadArtwork'
import { resizeImage } from 'utils/imageProcessingUtil'

const { createPlaylist, createAlbum } = cacheCollectionsActions

const messages = {
  createPlaylistTitle: 'Create New Playlist',
  createAlbumTitle: 'Create New Album',
  nameLabel: 'Playlist Name',
  nameLabelAlbum: 'Album Name',
  namePlaceholder: 'Give your playlist a name',
  namePlaceholderAlbum: 'Give your album a name',
  descriptionLabel: 'Description',
  descriptionPlaceholder: 'Describe what makes this special (optional)',
  cancel: 'Cancel',
  create: 'Create',
  defaultName: 'New Playlist',
  defaultAlbumName: 'New Album'
}

type ArtworkValue = {
  url: string
  file: File
  source?: string
} | null

export const CreatePlaylistModal = () => {
  const dispatch = useDispatch()
  const { isOpen, onClose, onClosed, data } = useCreatePlaylistModal()
  const { isAlbum = false, initTrackId } = data

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [artwork, setArtwork] = useState<ArtworkValue>(null)
  const [imageProcessingError, setImageProcessingError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reset = useCallback(() => {
    setName('')
    setDescription('')
    setArtwork(null)
    setImageProcessingError(false)
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleClosed = useCallback(() => {
    reset()
    onClosed()
  }, [onClosed, reset])

  const handleDropArtwork = useCallback(
    async (selectedFiles: File[], source: string) => {
      try {
        let file = selectedFiles[0]
        file = await resizeImage(file)
        // @ts-ignore writing to read-only property; matches ArtworkField pattern
        file.name = selectedFiles[0].name
        const url = URL.createObjectURL(file)
        setArtwork({ url, file, source })
        setImageProcessingError(false)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(getErrorMessage(err))
        setImageProcessingError(true)
      }
    },
    []
  )

  const handleRemoveArtwork = useCallback(() => {
    setArtwork(null)
  }, [])

  const handleSubmit = useCallback(() => {
    setIsSubmitting(true)
    const trimmedName = name.trim()
    const trimmedDescription = description.trim()
    const playlistName =
      trimmedName ||
      (isAlbum ? messages.defaultAlbumName : messages.defaultName)
    const action = isAlbum ? createAlbum : createPlaylist
    dispatch(
      action(
        {
          playlist_name: playlistName,
          description: trimmedDescription || undefined,
          // Cast: optimisticallySavePlaylist accepts the form-shape artwork.
          ...(artwork ? { artwork: artwork as any } : {})
        },
        CreatePlaylistSource.NAV,
        initTrackId,
        'route'
      )
    )
    onClose()
  }, [name, description, artwork, isAlbum, initTrackId, dispatch, onClose])

  const title = isAlbum
    ? messages.createAlbumTitle
    : messages.createPlaylistTitle
  const nameLabel = isAlbum ? messages.nameLabelAlbum : messages.nameLabel
  const namePlaceholder = isAlbum
    ? messages.namePlaceholderAlbum
    : messages.namePlaceholder

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={handleClosed}
      size='small'
    >
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={title} icon={<IconPlaylists />} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='l'>
          <Flex justifyContent='center'>
            <UploadArtwork
              artworkUrl={artwork?.url}
              onDropArtwork={handleDropArtwork}
              onRemoveArtwork={artwork ? handleRemoveArtwork : undefined}
              imageProcessingError={imageProcessingError}
              size='small'
              isUpload
              iconPlaceholder={<IconImage size='4xl' color='subdued' />}
            />
          </Flex>
          <TextInput
            label={nameLabel}
            placeholder={namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
          />
          <TextArea
            aria-label={messages.descriptionLabel}
            placeholder={messages.descriptionPlaceholder}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={1000}
            showMaxLength
            grows
          />
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Flex gap='xl' flex={1}>
          <Button variant='secondary' fullWidth onClick={handleClose}>
            {messages.cancel}
          </Button>
          <Button
            variant='primary'
            fullWidth
            isLoading={isSubmitting}
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {messages.create}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  )
}

export default CreatePlaylistModal
