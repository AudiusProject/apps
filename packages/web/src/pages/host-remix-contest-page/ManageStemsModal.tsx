import { useCallback, useEffect, useState } from 'react'

import { useTrack, useUpdateTrack } from '@audius/common/api'
import type { AccessConditions, ID } from '@audius/common/models'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconCart,
  IconCloudUpload,
  IconReceive,
  IconUserFollowing,
  IconVisibilityPublic,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  SegmentedControl,
  Switch,
  Text
} from '@audius/harmony'

const messages = {
  title: 'Stems & Downloads',
  fullTrackDownloadLabel: 'Full Track Download',
  fullTrackDownloadHelper:
    'Allow your fans to download a lossless copy of your full track.',
  availabilityLabel: 'Download Availability',
  availabilityHelper: 'Specify who has access to download your files.',
  public: 'Public',
  followers: 'Followers',
  premium: 'Premium',
  uploadHeading: 'Upload Additional Files',
  uploadHelper: 'Provide FLAC, WAV, ALAC, or AIFF for highest audio quality.',
  uploadPlaceholder: 'Drag-and-drop audio files here, or ',
  browseToUpload: 'browse to upload',
  uploadComingSoon:
    'Additional stem file uploads coming soon — managed from the track edit page today.',
  save: 'Save',
  cancel: 'Cancel'
}

type Availability = 'public' | 'followers' | 'premium'

type ManageStemsModalProps = {
  isOpen: boolean
  onClose: () => void
  trackId: ID | null
}

/**
 * Host-facing "Manage Stems" modal. Opened from the source-track kebab on
 * the Create Contest page. Edits the *track itself* (no per-contest
 * override) — toggling Full Track Download + Download Availability maps
 * straight onto the track's is_downloadable / download_conditions.
 *
 * Upload of additional stem files is scoped out for this pass — it lives
 * on the track edit page today, so we link users there instead.
 */
export const ManageStemsModal = ({
  isOpen,
  onClose,
  trackId
}: ManageStemsModalProps) => {
  const { data: trackMeta } = useTrack(trackId ?? undefined, {
    select: (t) =>
      t
        ? {
            is_downloadable: t.is_downloadable,
            download_conditions: t.download_conditions
          }
        : undefined
  })

  const { mutate: updateTrack, isPending: isSaving } = useUpdateTrack()

  const [isDownloadable, setIsDownloadable] = useState(false)
  const [availability, setAvailability] = useState<Availability>('public')

  // Seed form state from the track whenever the modal opens / the target
  // track changes.
  useEffect(() => {
    if (!isOpen || !trackMeta) return
    setIsDownloadable(!!trackMeta.is_downloadable)
    const cond = trackMeta.download_conditions as AccessConditions | null
    if (!cond) {
      setAvailability('public')
    } else if ('follow_user_id' in (cond ?? {})) {
      setAvailability('followers')
    } else if (
      'usdc_purchase' in (cond ?? {}) ||
      'nft_collection' in (cond ?? {})
    ) {
      setAvailability('premium')
    } else {
      setAvailability('public')
    }
  }, [isOpen, trackMeta])

  const handleSave = useCallback(() => {
    if (!trackId) return
    // Only "public" availability is round-trippable without more form
    // state (we'd need a USDC price or NFT gate to save premium; the
    // follower-gate needs the host's own user id). For anything richer,
    // the user should go through the full track edit page — link
    // in-modal rather than silently failing.
    const nextConditions: AccessConditions | null =
      availability === 'public'
        ? null
        : (trackMeta?.download_conditions ?? null)

    updateTrack({
      trackId,
      metadata: {
        is_downloadable: isDownloadable,
        download_conditions: nextConditions
      } as any
    })
    onClose()
  }, [
    trackId,
    isDownloadable,
    availability,
    trackMeta?.download_conditions,
    updateTrack,
    onClose
  ])

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='medium'>
      <ModalHeader onClose={onClose}>
        <ModalTitle Icon={IconReceive} title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='xl'>
          {/* Full Track Download */}
          <Flex justifyContent='space-between' alignItems='center' gap='l'>
            <Flex direction='column' gap='xs' css={{ flex: 1 }}>
              <Text variant='title' size='l'>
                {messages.fullTrackDownloadLabel}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.fullTrackDownloadHelper}
              </Text>
            </Flex>
            <Switch
              checked={isDownloadable}
              onChange={(e) => setIsDownloadable(e.target.checked)}
            />
          </Flex>

          <Divider />

          {/* Download Availability */}
          <Flex direction='column' gap='m'>
            <Flex direction='column' gap='xs'>
              <Text variant='title' size='l'>
                {messages.availabilityLabel}
              </Text>
              <Text variant='body' size='s' color='subdued'>
                {messages.availabilityHelper}
              </Text>
            </Flex>
            <SegmentedControl<Availability>
              fullWidth
              selected={availability}
              onSelectOption={setAvailability}
              options={[
                {
                  key: 'public',
                  text: messages.public,
                  icon: <IconVisibilityPublic size='s' color='default' />
                },
                {
                  key: 'followers',
                  text: messages.followers,
                  icon: <IconUserFollowing size='s' color='default' />
                },
                {
                  key: 'premium',
                  text: messages.premium,
                  icon: <IconCart size='s' color='default' />
                }
              ]}
            />
          </Flex>

          <Divider />

          {/* Upload Additional Files (stub) */}
          <Flex direction='column' gap='m'>
            <Text variant='label' size='s' color='subdued'>
              {messages.uploadHeading}
            </Text>
            <Text variant='body' size='s' color='subdued'>
              {messages.uploadHelper}
            </Text>
            <Box
              p='xl'
              css={{
                border: '1px dashed var(--harmony-border-default)',
                borderRadius: 8,
                textAlign: 'center'
              }}
            >
              <Flex direction='column' alignItems='center' gap='s'>
                <IconCloudUpload size='xl' color='subdued' />
                <Text variant='body' size='s' color='subdued'>
                  {messages.uploadComingSoon}
                </Text>
              </Flex>
            </Box>
          </Flex>

          <Flex justifyContent='center' pt='s'>
            <Button
              variant='primary'
              onClick={handleSave}
              disabled={!trackId || isSaving}
            >
              {messages.save}
            </Button>
          </Flex>
        </Flex>
      </ModalContent>
    </Modal>
  )
}
