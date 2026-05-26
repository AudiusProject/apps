import { useCallback, useEffect, useMemo, useState } from 'react'

import { useCollectionByPermalink } from '@audius/common/api'
import { CreatePlaylistSource, SquareSizes } from '@audius/common/models'
import {
  cacheCollectionsActions,
  useDuplicatePlaylistModal
} from '@audius/common/store'
import { getErrorMessage, getPathFromPlaylistUrl } from '@audius/common/utils'
import {
  Artwork,
  Button,
  Flex,
  IconCopy,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Switch,
  Text,
  TextArea,
  TextInput
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import UploadArtwork from 'components/upload/UploadArtwork'
import { useCollectionCoverArt } from 'hooks/useCollectionCoverArt'
import { resizeImage } from 'utils/imageProcessingUtil'

const { duplicatePlaylist } = cacheCollectionsActions

const messages = {
  title: 'Duplicate Playlist',
  titleAlbum: 'Duplicate Album',
  urlLabel: 'Audius Playlist URL',
  urlPlaceholder: 'https://audius.co/handle/playlist/your-playlist',
  urlHelper: 'Paste a link to any public Audius playlist to copy its details.',
  invalidUrl: 'Enter a valid Audius playlist URL',
  notFound: 'We could not find that playlist. Check the link and try again.',
  customizeTitle: 'Customize title',
  customizeDescription: 'Customize description',
  customizeArtwork: 'Customize artwork',
  source: 'Source',
  sourceTitle: 'Title',
  sourceDescription: 'Description',
  sourceArtwork: 'Artwork',
  newTitleLabel: 'New playlist name',
  newTitleLabelAlbum: 'New album name',
  newTitlePlaceholder: 'Give your playlist a name',
  newTitlePlaceholderAlbum: 'Give your album a name',
  newDescriptionLabel: 'New description',
  newDescriptionPlaceholder: 'Describe what makes this special',
  cancel: 'Cancel',
  duplicate: 'Duplicate',
  trackCopyNote: (count: number) =>
    count === 0
      ? 'No tracks to copy from this playlist.'
      : `All ${count} ${count === 1 ? 'track' : 'tracks'} will be copied to the new playlist.`,
  copySuffix: ' (Copy)'
}

type ArtworkValue = {
  url: string
  file: File
  source?: string
} | null

export const DuplicatePlaylistModal = () => {
  const dispatch = useDispatch()
  const { isOpen, onClose, onClosed, data } = useDuplicatePlaylistModal()
  const { isAlbum = false } = data

  const [url, setUrl] = useState('')
  const [customizeTitle, setCustomizeTitle] = useState(false)
  const [customizeDescription, setCustomizeDescription] = useState(false)
  const [customizeArtwork, setCustomizeArtwork] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customArtwork, setCustomArtwork] = useState<ArtworkValue>(null)
  const [imageProcessingError, setImageProcessingError] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const trimmedUrl = url.trim()
  const permalink = useMemo(
    () => (trimmedUrl ? getPathFromPlaylistUrl(trimmedUrl) : null),
    [trimmedUrl]
  )
  const isInvalidUrl = trimmedUrl.length > 0 && permalink === null

  const { data: sourceCollection, isPending: sourceLoading } =
    useCollectionByPermalink(permalink, { enabled: !!permalink })

  const sourceCollectionId = sourceCollection?.playlist_id
  const { imageUrl: sourceImageUrl } = useCollectionCoverArt({
    collectionId: sourceCollectionId,
    size: SquareSizes.SIZE_480_BY_480
  })

  const reset = useCallback(() => {
    setUrl('')
    setCustomizeTitle(false)
    setCustomizeDescription(false)
    setCustomizeArtwork(false)
    setCustomTitle('')
    setCustomDescription('')
    setCustomArtwork(null)
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
        const fileUrl = URL.createObjectURL(file)
        setCustomArtwork({ url: fileUrl, file, source })
        setImageProcessingError(false)
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(getErrorMessage(err))
        setImageProcessingError(true)
      }
    },
    []
  )

  const handleRemoveCustomArtwork = useCallback(() => {
    setCustomArtwork(null)
  }, [])

  // Seed custom fields when source loads so toggling a switch shows the
  // current source value as a starting point.
  useEffect(() => {
    if (sourceCollection) {
      if (!customTitle) {
        setCustomTitle(
          `${sourceCollection.playlist_name ?? ''}${messages.copySuffix}`
        )
      }
      if (!customDescription) {
        setCustomDescription(sourceCollection.description ?? '')
      }
    }
    // We only want to seed once when the source becomes available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceCollection?.playlist_id])

  const handleSubmit = useCallback(() => {
    if (!sourceCollection) return
    setIsSubmitting(true)
    const playlistName = customizeTitle
      ? customTitle.trim() ||
        `${sourceCollection.playlist_name}${messages.copySuffix}`
      : `${sourceCollection.playlist_name}${messages.copySuffix}`
    const description = customizeDescription
      ? customDescription.trim()
      : (sourceCollection.description ?? '')

    const formFields: Record<string, unknown> = {
      playlist_name: playlistName,
      description
    }
    if (customizeArtwork && customArtwork) {
      formFields.artwork = customArtwork
    } else if (!customizeArtwork && sourceCollection.cover_art_sizes) {
      formFields.cover_art_sizes = sourceCollection.cover_art_sizes
      formFields.is_image_autogenerated =
        sourceCollection.is_image_autogenerated ?? false
    }

    const sourceTrackIds =
      sourceCollection.playlist_contents?.track_ids.map((t) => t.track) ?? []

    dispatch(
      duplicatePlaylist({
        sourcePlaylistId: sourceCollection.playlist_id,
        formFields,
        trackIds: sourceTrackIds,
        source: CreatePlaylistSource.NAV,
        isAlbum
      })
    )
    onClose()
  }, [
    customArtwork,
    customDescription,
    customTitle,
    customizeArtwork,
    customizeDescription,
    customizeTitle,
    dispatch,
    isAlbum,
    onClose,
    sourceCollection
  ])

  const canSubmit = !!sourceCollection && !isSubmitting
  const newTitleLabel = isAlbum
    ? messages.newTitleLabelAlbum
    : messages.newTitleLabel
  const newTitlePlaceholder = isAlbum
    ? messages.newTitlePlaceholderAlbum
    : messages.newTitlePlaceholder

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={handleClosed}
      size='medium'
    >
      <ModalHeader onClose={handleClose}>
        <ModalTitle
          title={isAlbum ? messages.titleAlbum : messages.title}
          icon={<IconCopy />}
        />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='l'>
          <TextInput
            label={messages.urlLabel}
            placeholder={messages.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            error={isInvalidUrl}
            helperText={isInvalidUrl ? messages.invalidUrl : messages.urlHelper}
          />
          {permalink && !sourceLoading && !sourceCollection ? (
            <Text variant='body' size='s' color='danger'>
              {messages.notFound}
            </Text>
          ) : null}
          {sourceCollection ? (
            <Flex
              direction='column'
              gap='l'
              p='l'
              border='default'
              borderRadius='m'
            >
              <Flex gap='l' alignItems='center'>
                <Artwork
                  src={sourceImageUrl}
                  w='unit18'
                  h='unit18'
                  borderRadius='s'
                />
                <Flex direction='column' gap='xs' flex={1}>
                  <Text variant='label' size='s' color='subdued'>
                    {messages.source}
                  </Text>
                  <Text variant='title' size='m'>
                    {sourceCollection.playlist_name}
                  </Text>
                  {sourceCollection.description ? (
                    <Text variant='body' size='s' color='subdued'>
                      {sourceCollection.description}
                    </Text>
                  ) : null}
                </Flex>
              </Flex>

              <Flex direction='column' gap='m'>
                <Flex justifyContent='space-between' alignItems='center'>
                  <Text variant='body'>{messages.customizeTitle}</Text>
                  <Switch
                    checked={customizeTitle}
                    onChange={(e) => setCustomizeTitle(e.target.checked)}
                  />
                </Flex>
                {customizeTitle ? (
                  <TextInput
                    label={newTitleLabel}
                    placeholder={newTitlePlaceholder}
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    maxLength={64}
                  />
                ) : null}

                <Flex justifyContent='space-between' alignItems='center'>
                  <Text variant='body'>{messages.customizeDescription}</Text>
                  <Switch
                    checked={customizeDescription}
                    onChange={(e) => setCustomizeDescription(e.target.checked)}
                  />
                </Flex>
                {customizeDescription ? (
                  <TextArea
                    aria-label={messages.newDescriptionLabel}
                    placeholder={messages.newDescriptionPlaceholder}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    maxLength={1000}
                    showMaxLength
                    grows
                  />
                ) : null}

                <Flex justifyContent='space-between' alignItems='center'>
                  <Text variant='body'>{messages.customizeArtwork}</Text>
                  <Switch
                    checked={customizeArtwork}
                    onChange={(e) => setCustomizeArtwork(e.target.checked)}
                  />
                </Flex>
                {customizeArtwork ? (
                  <Flex justifyContent='center'>
                    <UploadArtwork
                      artworkUrl={customArtwork?.url}
                      onDropArtwork={handleDropArtwork}
                      onRemoveArtwork={
                        customArtwork ? handleRemoveCustomArtwork : undefined
                      }
                      imageProcessingError={imageProcessingError}
                      size='small'
                      isUpload
                    />
                  </Flex>
                ) : null}
              </Flex>
              <Text variant='body' size='s' color='subdued'>
                {messages.trackCopyNote(
                  sourceCollection.playlist_contents?.track_ids.length ?? 0
                )}
              </Text>
            </Flex>
          ) : null}
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
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {messages.duplicate}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  )
}

export default DuplicatePlaylistModal
