import { useCallback, useMemo, useState } from 'react'

import {
  useCurrentUserId,
  useUser,
  useUserTracksByHandle
} from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import {
  Box,
  Button,
  Checkbox,
  Flex,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  TextInput,
  Text,
  IconSearch,
  TextLink
} from '@audius/harmony'

import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

const messages = {
  title: 'Add Source Track',
  search: 'Search for Tracks',
  done: 'Done',
  cancel: 'Cancel',
  viewSelection: 'View Selection',
  selectedCount: (n: number) => `${n} Track${n === 1 ? '' : 's'} Selected`,
  empty: 'No tracks found.',
  loading: 'Loading tracks…'
}

type AddSourceTrackModalProps = {
  isOpen: boolean
  onClose: () => void
  /** Tracks already selected on the parent form, pre-checked in the picker. */
  initialSelectedIds: number[]
  /** Called with the final set of selected track IDs when "Done" is clicked. */
  onDone: (selectedIds: number[]) => void
}

/**
 * Multi-select track picker modal used by the Host Remix Contest page's
 * Source Tracks section. Searches over the signed-in user's own tracks
 * (client-side filter for now; falls back to fetch-all).
 */
export const AddSourceTrackModal = ({
  isOpen,
  onClose,
  initialSelectedIds,
  onDone
}: AddSourceTrackModalProps) => {
  const { data: currentUserId } = useCurrentUserId()
  const { data: currentUser } = useUser(currentUserId)
  const handle = currentUser?.handle

  // Fetch the host's public + unlisted tracks. Page size is generous — we
  // filter client-side and assume the host's own catalog fits. If we see
  // real perf issues we'll swap this for a server-side search hook.
  const { data: tracks, isPending } = useUserTracksByHandle(
    { handle, filterTracks: 'all', limit: 200 },
    { enabled: !!handle }
  )

  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] =
    useState<number[]>(initialSelectedIds)
  const [viewOnlySelected, setViewOnlySelected] = useState(false)

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (tracks ?? []).filter((t) => {
      if (viewOnlySelected && !selectedSet.has(t.track_id)) return false
      if (!term) return true
      return t.title.toLowerCase().includes(term)
    })
  }, [tracks, search, viewOnlySelected, selectedSet])

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const handleDone = useCallback(() => {
    onDone(selectedIds)
    onClose()
  }, [selectedIds, onDone, onClose])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='medium'>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='m'>
          <TextInput
            label={messages.search}
            hideLabel
            placeholder={messages.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            startIcon={IconSearch}
          />
          <Box
            css={{
              maxHeight: 360,
              overflowY: 'auto',
              borderTop: '1px solid var(--harmony-border-default)'
            }}
          >
            {isPending ? (
              <Flex justifyContent='center' p='l'>
                <Text variant='body' color='subdued'>
                  {messages.loading}
                </Text>
              </Flex>
            ) : filtered.length === 0 ? (
              <Flex justifyContent='center' p='l'>
                <Text variant='body' color='subdued'>
                  {messages.empty}
                </Text>
              </Flex>
            ) : (
              filtered.map((t) => (
                <TrackRow
                  key={t.track_id}
                  trackId={t.track_id}
                  title={t.title}
                  ownerName={currentUser?.name ?? ''}
                  checked={selectedSet.has(t.track_id)}
                  onToggle={() => toggle(t.track_id)}
                />
              ))
            )}
          </Box>
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Flex
          justifyContent='space-between'
          alignItems='center'
          gap='m'
          w='100%'
        >
          <Flex gap='m' alignItems='center'>
            <Text variant='body' size='s' color='subdued'>
              {messages.selectedCount(selectedIds.length)}
            </Text>
            {selectedIds.length > 0 ? (
              <TextLink
                variant='visible'
                onClick={() => setViewOnlySelected((v) => !v)}
              >
                {messages.viewSelection}
              </TextLink>
            ) : null}
          </Flex>
          <Flex gap='s'>
            <Button variant='secondary' onClick={onClose}>
              {messages.cancel}
            </Button>
            <Button
              variant='primary'
              onClick={handleDone}
              disabled={selectedIds.length === 0}
            >
              {messages.done}
            </Button>
          </Flex>
        </Flex>
      </ModalFooter>
    </Modal>
  )
}

// ----- one row ---------------------------------------------------------------

type TrackRowProps = {
  trackId: number
  title: string
  ownerName: string
  checked: boolean
  onToggle: () => void
}

const TrackRow = ({
  trackId,
  title,
  ownerName,
  checked,
  onToggle
}: TrackRowProps) => {
  const { imageUrl } = useTrackCoverArt({
    trackId,
    size: SquareSizes.SIZE_150_BY_150
  })
  return (
    <Flex
      alignItems='center'
      gap='m'
      p='m'
      css={{
        borderBottom: '1px solid var(--harmony-border-default)',
        cursor: 'pointer'
      }}
      onClick={onToggle}
    >
      <Box
        css={{
          width: 48,
          height: 48,
          borderRadius: 4,
          backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          flexShrink: 0
        }}
      />
      <Flex direction='column' css={{ flex: 1, minWidth: 0 }}>
        <Text variant='body' size='m' ellipses>
          {title}
        </Text>
        <Text variant='body' size='s' color='subdued' ellipses>
          {ownerName}
        </Text>
      </Flex>
      <Checkbox checked={checked} onChange={onToggle} aria-label={title} />
    </Flex>
  )
}
