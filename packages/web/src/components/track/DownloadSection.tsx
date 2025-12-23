import { MouseEvent, useCallback, useState } from 'react'

import { useFileSizes, useStems, useTrack } from '@audius/common/api'
import {
  useDownloadableContentAccess,
  useUploadingStems
} from '@audius/common/hooks'
import {
  Name,
  ModalSource,
  DownloadQuality,
  ID,
  StemCategory
} from '@audius/common/models'
import {
  usePremiumContentPurchaseModal,
  useWaitForDownloadModal,
  toastActions,
  PurchaseableContentType,
  useDownloadTrackArchiveModal
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import {
  Flex,
  Box,
  Text,
  IconReceive,
  Button,
  IconCaretDown,
  IconLockUnlocked,
  LoadingSpinner,
  Tooltip
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import { make, useRecord } from 'common/store/analytics/actions'
import { Expandable } from 'components/expandable/Expandable'
import { useIsMobile } from 'hooks/useIsMobile'
import {
  useRequiresAccountCallback,
  useRequiresAccountOnClick
} from 'hooks/useRequiresAccount'

import { DownloadRow } from './DownloadRow'

const { toast } = toastActions

const ORIGINAL_TRACK_INDEX = 1
const STEM_INDEX_OFFSET_WITHOUT_ORIGINAL_TRACK = 1
const STEM_INDEX_OFFSET_WITH_ORIGINAL_TRACK = 2

const messages = {
  title: 'Stems & Downloads',
  unlockAll: (price: string) => `Unlock All ${price}`,
  purchased: 'purchased',
  followToDownload: 'Must follow artist to download.',
  purchaseableIsOwner: (price: string) =>
    `Fans can unlock & download these files for a one time purchase of ${price}`,
  downloadAll: 'Download All',
  download: 'Download'
}

type DownloadSectionProps = {
  trackId: ID
}

export const DownloadSection = ({ trackId }: DownloadSectionProps) => {
  const dispatch = useDispatch()
  const record = useRecord()
  const isMobile = useIsMobile()
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) => {
      return {
        is_downloadable: track?.is_downloadable,
        access: track?.access
      }
    }
  })
  const { is_downloadable, access } = partialTrack ?? {}

  const { data: stemTracks = [], isSuccess: isStemsSuccess } = useStems(trackId)
  const { uploadingTracks: uploadingStems } = useUploadingStems(trackId)
  const {
    price,
    shouldDisplayPremiumDownloadLocked,
    shouldDisplayPremiumDownloadUnlocked,
    shouldDisplayDownloadFollowGated,
    shouldDisplayOwnerPremiumDownloads
  } = useDownloadableContentAccess({ trackId })

  // Filter out uploading stems that are already in the stemTracks array
  const filteredUploadingStems = uploadingStems.filter(
    (s) => !stemTracks.find((t) => t.orig_filename === s.name)
  )
  const isUploadingStems = filteredUploadingStems.length > 0

  const downloadQuality = DownloadQuality.ORIGINAL
  const shouldHideDownload =
    !access?.download && !shouldDisplayDownloadFollowGated
  const formattedPrice = price ? USDC(price / 100).toLocaleString() : undefined
  const [expanded, setExpanded] = useState(false)
  const [lockedContentModalVisibility, setLockedContentModalVisibility] =
    useModalState('LockedContent')
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()

  const { onOpen: openDownloadTrackArchiveModal } =
    useDownloadTrackArchiveModal()

  const { data: fileSizes } = useFileSizes(
    {
      trackIds: [trackId, ...stemTracks.map((s) => s.track_id)],
      downloadQuality
    },
    { enabled: isStemsSuccess }
  )
  const { onOpen: openWaitForDownloadModal } = useWaitForDownloadModal()

  const onToggleExpand = useCallback(() => setExpanded((val) => !val), [])

  const handlePurchaseClick = useRequiresAccountOnClick((_event) => {
    if (lockedContentModalVisibility) {
      setLockedContentModalVisibility(false)
    }
    openPremiumContentPurchaseModal(
      { contentId: trackId, contentType: PurchaseableContentType.TRACK },
      { source: ModalSource.TrackDetails }
    )
  }, [])

  const handleDownload = useRequiresAccountCallback(
    ({ trackIds, parentTrackId }: { trackIds: ID[]; parentTrackId?: ID }) => {
      if (isMobile && shouldDisplayDownloadFollowGated) {
        // On mobile, show a toast instead of a tooltip
        dispatch(toast({ content: messages.followToDownload }))
      } else if (partialTrack && partialTrack.access.download) {
        openWaitForDownloadModal({
          parentTrackId,
          trackIds,
          quality: downloadQuality
        })

        // Track download attempt event
        if (parentTrackId) {
          record(
            make(Name.TRACK_DOWNLOAD_CLICKED_DOWNLOAD_ALL, {
              parentTrackId,
              stemTrackIds: trackIds,
              device: 'web'
            })
          )
        } else {
          record(
            make(Name.TRACK_DOWNLOAD_CLICKED_DOWNLOAD_SINGLE, {
              trackId: trackIds[0],
              device: 'web'
            })
          )
        }
      }
    },
    [
      dispatch,
      downloadQuality,
      isMobile,
      openWaitForDownloadModal,
      record,
      shouldDisplayDownloadFollowGated,
      partialTrack
    ]
  )

  const handleDownloadAll = useRequiresAccountCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      // Only include parent track in count if it's downloadable
      const parentTrackCount = access?.download ? 1 : 0
      openDownloadTrackArchiveModal({
        trackId,
        fileCount: stemTracks.length + parentTrackCount
      })
    },
    [
      openDownloadTrackArchiveModal,
      trackId,
      stemTracks.length,
      access?.download
    ]
  )

  const hasStems = stemTracks.length > 0 || isUploadingStems
  const downloadButtonText = hasStems ? messages.downloadAll : messages.download

  const handleDownloadButtonClick = useRequiresAccountCallback(
    (e: MouseEvent) => {
      e.stopPropagation()
      if (hasStems) {
        handleDownloadAll(e)
      } else {
        handleDownload({ trackIds: [trackId] })
      }
    },
    [hasStems, handleDownloadAll, handleDownload, trackId]
  )

  const renderDownloadAllButton = () => {
    if (shouldHideDownload) {
      return null
    }

    return (
      <Tooltip
        mount='body'
        placement='left'
        text={messages.followToDownload}
        disabled={!shouldDisplayDownloadFollowGated}
      >
        <Flex onClick={(e) => e.stopPropagation()}>
          <Button
            disabled={shouldDisplayDownloadFollowGated}
            variant='secondary'
            size='small'
            onClick={handleDownloadButtonClick}
          >
            {downloadButtonText}
          </Button>
        </Flex>
      </Tooltip>
    )
  }

  return (
    <Box border='default' borderRadius='m' css={{ overflow: 'hidden' }}>
      <Flex column>
        <Flex
          gap='m'
          row
          justifyContent='space-between'
          alignItems='center'
          p='l'
          onClick={onToggleExpand}
          css={{
            cursor: 'pointer'
          }}
          role='button'
          aria-expanded={expanded}
          aria-controls='download-section'
        >
          <Flex
            justifyContent='space-between'
            wrap='wrap'
            gap='m'
            css={{ flexGrow: 1 }}
          >
            <Flex row alignItems='center' gap='s'>
              <IconReceive size='l' color='default' />
              <Text variant='label' size='l' strength='strong'>
                {messages.title}
              </Text>
            </Flex>
            <Flex gap='l' alignItems='center'>
              {shouldDisplayPremiumDownloadLocked &&
              formattedPrice !== undefined ? (
                <Button
                  variant='primary'
                  size='small'
                  color='lightGreen'
                  onClick={handlePurchaseClick}
                >
                  {messages.unlockAll(formattedPrice)}
                </Button>
              ) : null}
            </Flex>
          </Flex>
          <Flex
            row
            alignItems='center'
            justifyContent='flex-end'
            gap='m'
            role='row'
          >
            {isUploadingStems ? (
              <LoadingSpinner size='xl' />
            ) : (
              renderDownloadAllButton()
            )}

            {shouldDisplayPremiumDownloadUnlocked ? (
              <Flex gap='s'>
                <Flex
                  borderRadius='3xl'
                  ph='s'
                  css={{
                    backgroundColor: 'var(--harmony-light-green)',
                    paddingTop: '1px',
                    paddingBottom: '1px'
                  }}
                >
                  <IconLockUnlocked color='white' size='xs' />
                </Flex>
                <Text
                  variant='label'
                  size='l'
                  strength='strong'
                  color='subdued'
                >
                  {messages.purchased}
                </Text>
              </Flex>
            ) : null}
          </Flex>

          <IconCaretDown
            css={{
              transition: 'transform var(--harmony-expressive)',
              transform: expanded ? 'rotate(-180deg)' : undefined
            }}
            size='m'
            color='default'
          />
        </Flex>
        {shouldDisplayOwnerPremiumDownloads && formattedPrice ? (
          <Flex pl='l' pr='l' pb='l'>
            <Text variant='body' size='m' strength='strong'>
              {messages.purchaseableIsOwner(formattedPrice)}
            </Text>
          </Flex>
        ) : null}
        <Expandable expanded={expanded} id='downloads-section'>
          <Box>
            {is_downloadable ? (
              <DownloadRow
                trackId={trackId}
                parentTrackId={trackId}
                onDownload={handleDownload}
                index={ORIGINAL_TRACK_INDEX}
                hideDownload={shouldHideDownload}
                size={fileSizes?.[trackId]?.[downloadQuality]}
              />
            ) : null}
            {stemTracks.map((stemTrack, i) => (
              <DownloadRow
                trackId={stemTrack.track_id}
                parentTrackId={trackId}
                key={stemTrack.track_id}
                category={stemTrack.stem_of?.category}
                filename={stemTrack.orig_filename ?? undefined}
                onDownload={handleDownload}
                hideDownload={shouldHideDownload}
                size={fileSizes?.[stemTrack.track_id]?.[downloadQuality]}
                index={
                  i +
                  (is_downloadable
                    ? STEM_INDEX_OFFSET_WITH_ORIGINAL_TRACK
                    : STEM_INDEX_OFFSET_WITHOUT_ORIGINAL_TRACK)
                }
              />
            ))}
            {filteredUploadingStems.map((s, i) => (
              <DownloadRow
                key={`uploading-stem-${i}`}
                onDownload={() => {}}
                hideDownload={shouldHideDownload}
                size={s.size}
                index={
                  i +
                  stemTracks.length +
                  (is_downloadable
                    ? STEM_INDEX_OFFSET_WITH_ORIGINAL_TRACK
                    : STEM_INDEX_OFFSET_WITHOUT_ORIGINAL_TRACK)
                }
                category={s.category ?? StemCategory.OTHER}
                filename={s.name}
                isLoading
              />
            ))}
          </Box>
        </Expandable>
      </Flex>
    </Box>
  )
}
