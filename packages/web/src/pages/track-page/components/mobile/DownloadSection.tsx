import { useCallback, useState } from 'react'

import { useStems, useTrack } from '@audius/common/api'
import { useDownloadableContentAccess } from '@audius/common/hooks'
import { Name, ModalSource, DownloadQuality, ID } from '@audius/common/models'
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
  Divider
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
  download: 'Download Track'
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

  const { data: stemTracks = [] } = useStems(trackId)
  const {
    price,
    shouldDisplayPremiumDownloadLocked,
    shouldDisplayPremiumDownloadUnlocked,
    shouldDisplayDownloadFollowGated,
    shouldDisplayOwnerPremiumDownloads
  } = useDownloadableContentAccess({ trackId })

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
    (e) => {
      e.stopPropagation()
      if (isMobile && shouldDisplayDownloadFollowGated) {
        // On mobile, show a toast instead of a tooltip
        dispatch(toast({ content: messages.followToDownload }))
        return
      }
      // Only include parent track in count if it's downloadable
      const parentTrackCount = partialTrack?.access?.download ? 1 : 0
      openDownloadTrackArchiveModal({
        trackId,
        fileCount: stemTracks.length + parentTrackCount
      })
    },
    [
      isMobile,
      shouldDisplayDownloadFollowGated,
      openDownloadTrackArchiveModal,
      trackId,
      stemTracks.length,
      dispatch,
      partialTrack?.access?.download
    ]
  )

  const hasStems = stemTracks.length > 0
  const downloadButtonText = hasStems ? messages.downloadAll : messages.download

  const handleDownloadButtonClick = useRequiresAccountCallback(
    (e) => {
      e.stopPropagation()
      if (hasStems) {
        handleDownloadAll(e)
      } else {
        handleDownload({ trackIds: [trackId] })
      }
    },
    [hasStems, handleDownloadAll, handleDownload, trackId]
  )

  return (
    <Box css={{ overflow: 'hidden' }}>
      <Flex direction='column'>
        <Flex
          gap='m'
          pt='l'
          pb={expanded ? 'l' : undefined}
          w='100%'
          column
          justifyContent='space-between'
          alignItems='flex-start'
          backgroundColor='white'
          role='button'
          aria-expanded={expanded}
          aria-controls='download-section'
          onClick={onToggleExpand}
          borderTop='default'
        >
          <Flex justifyContent='space-between' row wrap='wrap' gap='m' w='100%'>
            <Flex row alignItems='center' gap='s'>
              <IconReceive size='l' color='default' />
              <Text variant='label' size='l' strength='strong'>
                {messages.title}
              </Text>
            </Flex>
            <IconCaretDown
              css={{
                transition: 'transform var(--harmony-expressive)',
                transform: expanded ? 'rotate(-180deg)' : undefined
              }}
              size='m'
              color='default'
            />
            {shouldDisplayPremiumDownloadLocked &&
            formattedPrice !== undefined ? (
              <Button
                variant='primary'
                size='small'
                color='lightGreen'
                onClick={handlePurchaseClick}
                fullWidth
              >
                {messages.unlockAll(formattedPrice)}
              </Button>
            ) : null}
          </Flex>
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
              <Text variant='label' size='l' strength='strong' color='subdued'>
                {messages.purchased}
              </Text>
            </Flex>
          ) : null}
          {shouldHideDownload ? null : (
            <Button
              variant='secondary'
              size='small'
              iconLeft={IconReceive}
              onClick={handleDownloadButtonClick}
              fullWidth
            >
              {downloadButtonText}
            </Button>
          )}
        </Flex>
        {shouldDisplayOwnerPremiumDownloads && formattedPrice ? (
          <Flex pv='l'>
            <Text variant='body' size='m' strength='strong'>
              {messages.purchaseableIsOwner(formattedPrice)}
            </Text>
          </Flex>
        ) : null}
        <Expandable expanded={expanded} id='downloads-section'>
          <Flex column gap='l'>
            {is_downloadable ? (
              <Flex column gap='l'>
                <Divider />
                <DownloadRow
                  trackId={trackId}
                  parentTrackId={trackId}
                  onDownload={handleDownload}
                  index={ORIGINAL_TRACK_INDEX}
                  hideDownload={shouldHideDownload}
                />
              </Flex>
            ) : null}
            {stemTracks.map((stemTrack, i) => (
              <Flex column gap='l' key={stemTrack.track_id}>
                <Divider />
                <DownloadRow
                  trackId={stemTrack.track_id}
                  parentTrackId={trackId}
                  onDownload={handleDownload}
                  hideDownload={shouldHideDownload}
                  index={
                    i +
                    (is_downloadable
                      ? STEM_INDEX_OFFSET_WITH_ORIGINAL_TRACK
                      : STEM_INDEX_OFFSET_WITHOUT_ORIGINAL_TRACK)
                  }
                />
              </Flex>
            ))}
          </Flex>
        </Expandable>
      </Flex>
    </Box>
  )
}
