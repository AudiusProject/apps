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
  Flex,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Radio,
  RadioGroup,
  TextInput,
  Text,
  IconSearch
} from '@audius/harmony'

import { useTrackCoverArt } from 'hooks/useTrackCoverArt'

const messages = {
  title: 'Add Source Track',
  search: 'Search for Tracks',
  done: 'Done',
  cancel: 'Cancel',
  selectedCount: (n: number) => `${n} Track${n === 1 ? '' : 's'} Selected`,
  empty: 'No tracks found.',
  loading: 'Loading tracks…'
}

type AddSourceTrackModalProps = {
  isOpen: boolean
  onClose: () => void
  /** Tracks already selected on the parent form. First entry pre-selects the radio. */
  initialSelectedIds: number[]
  /** Called with the final set of selected track IDs when "Done" is clicked. */
  onDone: (selectedIds: number[]) => void
}

/**
 * Single-select track picker modal used by the Host Remix Contest page's
 * Source Tracks section. Searches over the signed-in user's own tracks
 * (client-side filter for now; falls back to fetch-all). Contests only
 * support one Source Track today — the API returns the selection as an
 * array so the wiring can expand to multi-select later without a
 * caller-facing shape change.
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

  // Fetch the host's public + unlisted tracks. 100 is the discovery-node
  // max per page; we filter client-side and assume the host's recent
  // catalog fits. If someone has >100 tracks and can't find an older one,
  // we'll swap this for a server-side search / paged fetch.
  const { data: tracks, isPending } = useUserTracksByHandle(
    { handle, filterTracks: 'all', limit: 100 },
    { enabled: !!handle }
  )

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(
    initialSelectedIds[0] ?? null
  )

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (tracks ?? []).filter((t) => {
      if (!term) return true
      return t.title.toLowerCase().includes(term)
    })
  }, [tracks, search])

  const handleSelect = useCallback((id: number) => {
    setSelectedId(id)
  }, [])

  const handleDone = useCallback(() => {
    onDone(selectedId != null ? [selectedId] : [])
    onClose()
  }, [selectedId, onDone, onClose])

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
              <RadioGroup
                name='source-track-picker'
                value={selectedId != null ? String(selectedId) : null}
                css={{ gap: 0 }}
              >
                {filtered.map((t) => (
                  <TrackRow
                    key={t.track_id}
                    trackId={t.track_id}
                    title={t.title}
                    ownerName={currentUser?.name ?? ''}
                    checked={selectedId === t.track_id}
                    onSelect={() => handleSelect(t.track_id)}
                  />
                ))}
              </RadioGroup>
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
          <Text variant='body' size='s' color='subdued'>
            {messages.selectedCount(selectedId != null ? 1 : 0)}
          </Text>
          <Flex gap='s'>
            <Button variant='secondary' onClick={onClose}>
              {messages.cancel}
            </Button>
            <Button
              variant='primary'
              onClick={handleDone}
              disabled={selectedId == null}
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
  onSelect: () => void
}

const TrackRow = ({
  trackId,
  title,
  ownerName,
  checked,
  onSelect
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
      onClick={onSelect}
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
      <Radio
        value={String(trackId)}
        checked={checked}
        onChange={onSelect}
        aria-label={title}
      />
    </Flex>
  )
}
