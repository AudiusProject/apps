import { useCallback, useMemo, useState } from 'react'

import { userTrackMetadataFromSDK } from '@audius/common/adapters'
import {
  useCollection,
  useQueryContext,
  useCurrentUserId
} from '@audius/common/api'
import {
  cacheCollectionsActions,
  toastActions,
  useAddTracksByUrlModal
} from '@audius/common/store'
import { getErrorMessage, getPathFromTrackUrl } from '@audius/common/utils'
import {
  Button,
  Flex,
  IconLink,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Text,
  TextArea
} from '@audius/harmony'
import { OptionalId } from '@audius/sdk'
import { useDispatch } from 'react-redux'

const { addTrackToPlaylist } = cacheCollectionsActions
const { toast } = toastActions

const PLAYLIST_TRACK_LIMIT = 100
const INTER_DISPATCH_DELAY_MS = 30

const messages = {
  title: 'Add Tracks by URL',
  helper:
    'Paste Audius track links — one per line, or separated by commas or tabs. Up to 100 tracks per playlist.',
  textareaLabel: 'Track URLs',
  textareaPlaceholder:
    'https://audius.co/artist/track-one\nhttps://audius.co/artist/track-two',
  cancel: 'Cancel',
  addTracks: 'Add Tracks',
  noValidLinks: 'No valid Audius track links found.',
  playlistFull: (limit: number) =>
    `This playlist already has ${limit} tracks — can't add more.`,
  resolveFailed: 'Could not load tracks. Check your connection and try again.',
  summary: ({
    added,
    duplicates,
    invalid,
    unresolved,
    overLimit
  }: {
    added: number
    duplicates: number
    invalid: number
    unresolved: number
    overLimit: number
  }) => {
    const parts: string[] = []
    if (added > 0) {
      parts.push(`Added ${added} ${added === 1 ? 'track' : 'tracks'}`)
    }
    if (duplicates > 0) {
      parts.push(`${duplicates} already in playlist`)
    }
    if (unresolved > 0) {
      parts.push(`${unresolved} not found`)
    }
    if (invalid > 0) {
      parts.push(`${invalid} invalid ${invalid === 1 ? 'link' : 'links'}`)
    }
    if (overLimit > 0) {
      parts.push(`${overLimit} skipped (playlist limit reached)`)
    }
    return parts.length > 0 ? parts.join(' • ') : 'No tracks were added.'
  }
}

type ParseResult = {
  permalinks: string[]
  invalidCount: number
}

const parseTrackUrls = (raw: string): ParseResult => {
  const lines = raw
    .split(/[\n\r,\t]+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const permalinks: string[] = []
  const seen = new Set<string>()
  let invalidCount = 0
  for (const line of lines) {
    const permalink = getPathFromTrackUrl(line)
    if (permalink) {
      if (!seen.has(permalink)) {
        seen.add(permalink)
        permalinks.push(permalink)
      }
    } else {
      invalidCount += 1
    }
  }
  return { permalinks, invalidCount }
}

export const AddTracksByUrlModal = () => {
  const dispatch = useDispatch()
  const { isOpen, onClose, onClosed, data } = useAddTracksByUrlModal()
  const { collectionId } = data
  const { audiusSdk } = useQueryContext()
  const { data: currentUserId } = useCurrentUserId()

  const { data: existingTrackIdSet } = useCollection(collectionId, {
    select: (c) =>
      new Set<number>(c?.playlist_contents.track_ids.map((t) => t.track) ?? [])
  })
  const currentTrackCount = existingTrackIdSet?.size ?? 0
  const remainingCapacity = Math.max(
    0,
    PLAYLIST_TRACK_LIMIT - currentTrackCount
  )

  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const parsed = useMemo(() => parseTrackUrls(input), [input])
  const livePreview = useMemo(() => {
    if (!input.trim()) return null
    return `${parsed.permalinks.length} valid${
      parsed.invalidCount > 0 ? ` • ${parsed.invalidCount} invalid` : ''
    }`
  }, [input, parsed])

  const reset = useCallback(() => {
    setInput('')
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleClosed = useCallback(() => {
    reset()
    onClosed()
  }, [onClosed, reset])

  const handleSubmit = useCallback(async () => {
    if (!collectionId) return
    if (remainingCapacity === 0) {
      dispatch(toast({ content: messages.playlistFull(PLAYLIST_TRACK_LIMIT) }))
      return
    }
    const { permalinks, invalidCount } = parsed
    if (permalinks.length === 0) {
      dispatch(toast({ content: messages.noValidLinks }))
      return
    }
    setIsSubmitting(true)
    try {
      const sdk = await audiusSdk()
      const { data: sdkData = [] } = await sdk.tracks.getBulkTracks({
        permalink: permalinks,
        userId: OptionalId.parse(currentUserId)
      })
      const resolvedTracks = sdkData
        .map((t) => userTrackMetadataFromSDK(t))
        .filter((t): t is NonNullable<typeof t> => t != null)

      const unresolved = permalinks.length - resolvedTracks.length
      const seenIds = new Set<number>()
      const newTracks: typeof resolvedTracks = []
      let duplicates = 0
      for (const track of resolvedTracks) {
        if (seenIds.has(track.track_id)) continue
        seenIds.add(track.track_id)
        if (existingTrackIdSet?.has(track.track_id)) {
          duplicates += 1
        } else {
          newTracks.push(track)
        }
      }

      const tracksToAdd = newTracks.slice(0, remainingCapacity)
      const overLimit = newTracks.length - tracksToAdd.length

      for (const track of tracksToAdd) {
        dispatch(
          addTrackToPlaylist(track.track_id, collectionId, { silent: true })
        )
        // Space out dispatches so each saga's optimistic update lands
        // before the next one reads the playlist state.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) =>
          setTimeout(resolve, INTER_DISPATCH_DELAY_MS)
        )
      }

      dispatch(
        toast({
          content: messages.summary({
            added: tracksToAdd.length,
            duplicates,
            invalid: invalidCount,
            unresolved,
            overLimit
          })
        })
      )
      setInput('')
      onClose()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(getErrorMessage(err))
      dispatch(toast({ content: messages.resolveFailed }))
    } finally {
      setIsSubmitting(false)
    }
  }, [
    audiusSdk,
    collectionId,
    currentUserId,
    dispatch,
    existingTrackIdSet,
    onClose,
    parsed,
    remainingCapacity
  ])

  const canSubmit =
    !isSubmitting && parsed.permalinks.length > 0 && remainingCapacity > 0

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={handleClosed}
      size='medium'
    >
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={messages.title} icon={<IconLink />} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='m'>
          <Text variant='body' color='subdued'>
            {messages.helper}
          </Text>
          <TextArea
            aria-label={messages.textareaLabel}
            placeholder={messages.textareaPlaceholder}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            grows
            maxVisibleRows={8}
          />
          <Flex justifyContent='space-between'>
            <Text variant='body' size='s' color='subdued'>
              {livePreview ?? ' '}
            </Text>
            <Text variant='body' size='s' color='subdued'>
              {`${currentTrackCount} / ${PLAYLIST_TRACK_LIMIT}`}
            </Text>
          </Flex>
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
            {messages.addTracks}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  )
}

export default AddTracksByUrlModal
