import { useCallback, useEffect, useMemo, useState } from 'react'

import {
  useDeleteTrack,
  useStems,
  useTrack,
  useUpdateTrack
} from '@audius/common/api'
import { useUploadingStems } from '@audius/common/hooks'
import type {
  AccessConditions,
  ID,
  StemUploadWithFile
} from '@audius/common/models'
import { StemCategory, stemCategoryFriendlyNames } from '@audius/common/models'
import { stemsUploadActions } from '@audius/common/store'
import { uuid } from '@audius/common/utils'
import {
  Box,
  Button,
  Divider,
  Flex,
  IconButton,
  IconCart,
  IconCloudUpload,
  IconReceive,
  IconTrash,
  IconUserFollowing,
  IconVisibilityPublic,
  LoadingSpinner,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  SegmentedControl,
  Switch,
  Text
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { processFiles } from 'pages/upload-page/store/utils/processFiles'

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
  uploading: (n: number) => `Uploading ${n} stem${n === 1 ? '' : 's'}…`,
  uploadingStatus: 'Uploading…',
  noStems: 'No stems on this track yet.',
  removeStem: 'Remove stem',
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
  const { mutate: deleteTrack } = useDeleteTrack()
  const dispatch = useDispatch()

  // Existing stems on the track (already uploaded). Refetched in real-time
  // by the publishStems success path, so newly-uploaded stems migrate from
  // the "uploading" list into here once they finish.
  const { data: existingStems = [] } = useStems(trackId ?? undefined)
  // In-flight stem uploads triggered by the dropzone below. Comes from
  // redux (stems-upload slice) — the upload-tracks saga consumes this and
  // calls publishStems when ready.
  const { uploadingTracks } = useUploadingStems(trackId ?? 0)
  // The redux slice doesn't clear once publishStems completes, so dedupe
  // anything already represented in `existingStems` to avoid double rows.
  const stillUploading = uploadingTracks.filter(
    (u) => !existingStems.some((s) => s.orig_filename === u.name)
  )

  const [isDownloadable, setIsDownloadable] = useState(false)
  const [availability, setAvailability] = useState<Availability>('public')
  const [pendingStemCount, setPendingStemCount] = useState(0)
  const fileInputId = useMemo(
    () => `manage-stems-file-input-${trackId ?? 'none'}`,
    [trackId]
  )

  // Seed form state from the track whenever the modal opens / the target
  // track changes.
  useEffect(() => {
    if (!isOpen) return
    if (!trackMeta) return
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

  const handleAddStemFiles = useCallback(
    async (files: File[]) => {
      if (!trackId || files.length === 0) return
      setPendingStemCount(files.length)
      try {
        const processed = await Promise.all(
          processFiles(files, (name, reason) => {
            // eslint-disable-next-line no-console
            console.warn('Skipping invalid stem file', name, reason)
          })
        )
        const valid = processed.filter(
          (p): p is NonNullable<typeof p> => p !== null
        )
        if (valid.length === 0) {
          setPendingStemCount(0)
          return
        }

        const uploads: StemUploadWithFile[] = valid.map((processedFile) => ({
          file: processedFile.file,
          metadata: processedFile.metadata,
          category: StemCategory.OTHER,
          allowDelete: true,
          allowCategorySwitch: true
        }))

        dispatch(
          stemsUploadActions.startStemUploads({
            parentId: trackId,
            uploads,
            batchUID: uuid()
          })
        )
      } finally {
        setPendingStemCount(0)
      }
    },
    [trackId, dispatch]
  )

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

          {/* Upload Additional Files */}
          <Flex direction='column' gap='m'>
            <Text variant='label' size='s' color='subdued'>
              {messages.uploadHeading}
            </Text>
            <Text variant='body' size='s' color='subdued'>
              {messages.uploadHelper}
            </Text>

            {/* Existing + uploading stems list */}
            {existingStems.length > 0 || stillUploading.length > 0 ? (
              <Flex
                direction='column'
                border='default'
                borderRadius='m'
                css={{ overflow: 'hidden' }}
              >
                {existingStems.map((stem) => (
                  <StemRow
                    key={`existing-${stem.track_id}`}
                    title={stem.orig_filename ?? stem.title}
                    category={stem.stem_of?.category ?? StemCategory.OTHER}
                    onRemove={() => deleteTrack({ trackId: stem.track_id })}
                  />
                ))}
                {stillUploading.map((u, i) => (
                  <StemRow
                    key={`uploading-${u.name}-${i}`}
                    title={u.name}
                    category={u.category ?? StemCategory.OTHER}
                    isUploading
                  />
                ))}
              </Flex>
            ) : null}

            <Box
              p='xl'
              css={{
                border: '1px dashed var(--harmony-border-default)',
                borderRadius: 8,
                textAlign: 'center',
                cursor: trackId && pendingStemCount === 0 ? 'pointer' : 'wait'
              }}
              onClick={() => {
                if (!trackId || pendingStemCount > 0) return
                document.getElementById(fileInputId)?.click()
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                if (!trackId || pendingStemCount > 0) return
                const files = Array.from(e.dataTransfer?.files ?? [])
                if (files.length > 0) handleAddStemFiles(files)
              }}
            >
              <Flex direction='column' alignItems='center' gap='s'>
                <IconCloudUpload size='xl' color='subdued' />
                <Text variant='body' size='s' color='subdued'>
                  {pendingStemCount > 0
                    ? messages.uploading(pendingStemCount)
                    : `${messages.uploadPlaceholder}${messages.browseToUpload}`}
                </Text>
              </Flex>
            </Box>
            <input
              id={fileInputId}
              type='file'
              accept='audio/*,.flac,.wav,.alac,.aiff,.aif,.mp3,.ogg,.m4a'
              multiple
              style={{ display: 'none' }}
              onChange={(e) => {
                const files = Array.from(e.target.files ?? [])
                if (files.length > 0) handleAddStemFiles(files)
                e.target.value = ''
              }}
            />
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

// ----- Stem row --------------------------------------------------------------

type StemRowProps = {
  title: string
  category: StemCategory
  isUploading?: boolean
  onRemove?: () => void
}

const StemRow = ({ title, category, isUploading, onRemove }: StemRowProps) => {
  return (
    <Flex
      alignItems='center'
      justifyContent='space-between'
      gap='m'
      pv='s'
      ph='m'
      css={{
        borderBottom: '1px solid var(--harmony-border-default)',
        '&:last-of-type': { borderBottom: 'none' }
      }}
    >
      <Flex direction='column' css={{ minWidth: 0, flex: 1 }}>
        <Text variant='body' size='m' ellipses>
          {title}
        </Text>
        <Text variant='body' size='s' color='subdued'>
          {isUploading
            ? messages.uploadingStatus
            : (stemCategoryFriendlyNames[category] ?? '')}
        </Text>
      </Flex>
      {isUploading ? (
        <LoadingSpinner css={{ width: 16, height: 16 }} />
      ) : onRemove ? (
        <IconButton
          aria-label={messages.removeStem}
          icon={IconTrash}
          color='default'
          size='s'
          onClick={onRemove}
        />
      ) : null}
    </Flex>
  )
}
