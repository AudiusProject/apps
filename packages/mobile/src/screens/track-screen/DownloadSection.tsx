import React, { Fragment, useCallback, useState } from 'react'

import { useStems, useTrack } from '@audius/common/api'
import { useDownloadableContentAccess } from '@audius/common/hooks'
import type { ID } from '@audius/common/models'
import { DownloadQuality, ModalSource } from '@audius/common/models'
import {
  PurchaseableContentType,
  useDownloadTrackArchiveModal,
  usePremiumContentPurchaseModal,
  useWaitForDownloadModal
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import { css } from '@emotion/native'
import { LayoutAnimation } from 'react-native'

import {
  Button,
  Divider,
  Flex,
  IconLockUnlocked,
  IconReceive,
  Text,
  useTheme
} from '@audius/harmony-native'
import { Expandable, ExpandableArrowIcon } from 'app/components/expandable'
import { useToast } from 'app/hooks/useToast'
import { make, track as trackEvent } from 'app/services/analytics'
import type { AllEvents } from 'app/types/analytics'
import { EventNames } from 'app/types/analytics'

import { DownloadRow } from './DownloadRow'

const ORIGINAL_TRACK_INDEX = 1
const STEM_INDEX_OFFSET_WITHOUT_ORIGINAL_TRACK = 1
const STEM_INDEX_OFFSET_WITH_ORIGINAL_TRACK = 2

const messages = {
  title: 'Stems & Downloads',
  // TODO: When upgrading react native to >0.74, we need to remove the $ here
  // and also update android to include jsc+intl
  // https://github.com/facebook/hermes/issues/23
  // https://stackoverflow.com/questions/41408025/react-native-tolocalestring-not-working-on-android
  unlockAll: (price: string) => `Unlock All $${price}`,
  purchased: 'purchased',
  followToDownload: 'Must follow artist to download.',
  purchaseableIsOwner: (price: string) =>
    `Fans can unlock & download these files for a one time purchase of ${price}`,
  downloadAll: 'Download All',
  download: 'Download'
}

export const DownloadSection = ({ trackId }: { trackId: ID }) => {
  const { color } = useTheme()
  const { toast } = useToast()
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const { onOpen: openWaitForDownloadModal } = useWaitForDownloadModal()
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: track } = useTrack(trackId)
  const { data: stemTracks = [] } = useStems(trackId)

  const {
    price,
    shouldDisplayPremiumDownloadLocked,
    shouldDisplayPremiumDownloadUnlocked,
    shouldDisplayDownloadFollowGated,
    shouldDisplayOwnerPremiumDownloads
  } = useDownloadableContentAccess({ trackId })

  const formattedPrice = price ? USDC(price / 100).toLocaleString() : undefined
  const shouldHideDownload =
    !track?.access.download && !shouldDisplayDownloadFollowGated
  const downloadQuality = DownloadQuality.ORIGINAL

  const onToggleExpand = useCallback(() => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(180, 'easeInEaseOut', 'opacity')
    )
    setIsExpanded((expanded) => !expanded)
  }, [])

  const handlePurchasePress = useCallback(() => {
    openPremiumContentPurchaseModal(
      { contentId: trackId, contentType: PurchaseableContentType.TRACK },
      { source: ModalSource.TrackDetails }
    )
  }, [trackId, openPremiumContentPurchaseModal])

  const handleDownload = useCallback(
    ({ trackIds, parentTrackId }: { trackIds: ID[]; parentTrackId?: ID }) => {
      if (shouldDisplayDownloadFollowGated) {
        // On mobile, show a toast instead of a tooltip
        toast({ content: messages.followToDownload })
      } else if (track && track.access.download) {
        openWaitForDownloadModal({
          parentTrackId,
          trackIds,
          quality: downloadQuality
        })

        // Track download attempt event
        let event: AllEvents
        if (parentTrackId) {
          event = {
            eventName: EventNames.TRACK_DOWNLOAD_CLICKED_DOWNLOAD_ALL,
            parentTrackId,
            stemTrackIds: trackIds,
            device: 'native'
          }
        } else {
          event = {
            eventName: EventNames.TRACK_DOWNLOAD_CLICKED_DOWNLOAD_SINGLE,
            trackId: trackIds[0],
            device: 'native'
          }
        }
        trackEvent(make(event))
      }
    },
    [
      downloadQuality,
      openWaitForDownloadModal,
      shouldDisplayDownloadFollowGated,
      toast,
      track
    ]
  )

  const { onOpen: openDownloadTrackArchiveModal } =
    useDownloadTrackArchiveModal()

  const handleDownloadAll = useCallback(() => {
    if (shouldDisplayDownloadFollowGated) {
      toast({ content: messages.followToDownload })
      return
    }

    // Only include parent track in count if it's downloadable
    const parentTrackCount = track?.access?.download ? 1 : 0
    openDownloadTrackArchiveModal({
      trackId,
      fileCount: stemTracks.length + parentTrackCount
    })
  }, [
    openDownloadTrackArchiveModal,
    shouldDisplayDownloadFollowGated,
    stemTracks.length,
    toast,
    trackId,
    track?.access?.download
  ])

  const hasStems = stemTracks.length > 0
  const downloadButtonText = hasStems ? messages.downloadAll : messages.download

  const handleDownloadButtonPress = useCallback(() => {
    if (hasStems) {
      handleDownloadAll()
    } else {
      handleDownload({ trackIds: [trackId] })
    }
  }, [hasStems, handleDownloadAll, handleDownload, trackId])

  const renderHeader = () => {
    return (
      <Flex gap='l' column pb={isExpanded ? 'l' : undefined}>
        <Flex row justifyContent='space-between' alignItems='center'>
          <Flex row alignItems='center' gap='s'>
            <IconReceive color='default' />
            <Text variant='label' size='l' strength='strong'>
              {messages.title}
            </Text>
          </Flex>
          <ExpandableArrowIcon expanded={isExpanded} />
        </Flex>
        {shouldDisplayPremiumDownloadLocked && formattedPrice !== undefined ? (
          <Button
            variant='primary'
            size='small'
            color='lightGreen'
            onPress={handlePurchasePress}
          >
            {messages.unlockAll(formattedPrice)}
          </Button>
        ) : null}
        {shouldDisplayPremiumDownloadUnlocked ? (
          <Flex row alignItems='center' gap='s'>
            <Flex
              borderRadius='3xl'
              ph='s'
              style={css({
                backgroundColor: color.special.lightGreen,
                paddingTop: 1,
                paddingBottom: 1
              })}
            >
              <IconLockUnlocked color='white' size='xs' />
            </Flex>
            <Text
              variant='label'
              // TODO: size other than m causes misalignment C-3709
              size='l'
              strength='strong'
              color='subdued'
            >
              {messages.purchased}
            </Text>
          </Flex>
        ) : null}
        {!shouldHideDownload ? (
          <Button
            variant='secondary'
            size='small'
            onPress={handleDownloadButtonPress}
            fullWidth
          >
            {downloadButtonText}
          </Button>
        ) : null}
        {shouldDisplayOwnerPremiumDownloads && formattedPrice ? (
          <Flex>
            <Text variant='body' size='m' strength='strong'>
              {messages.purchaseableIsOwner(formattedPrice)}
            </Text>
          </Flex>
        ) : null}
      </Flex>
    )
  }

  return (
    <Expandable
      renderHeader={renderHeader}
      expanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <Flex gap='m'>
        {track?.is_downloadable ? (
          <>
            <Divider />
            <DownloadRow
              trackId={trackId}
              index={ORIGINAL_TRACK_INDEX}
              hideDownload={shouldHideDownload}
              onDownload={handleDownload}
            />
          </>
        ) : null}
        {stemTracks?.map((stemTrack, i) => (
          <Fragment key={stemTrack.track_id}>
            <Divider />
            <DownloadRow
              trackId={stemTrack.track_id}
              index={
                i +
                (track?.is_downloadable
                  ? STEM_INDEX_OFFSET_WITH_ORIGINAL_TRACK
                  : STEM_INDEX_OFFSET_WITHOUT_ORIGINAL_TRACK)
              }
              hideDownload={shouldHideDownload}
              onDownload={handleDownload}
            />
          </Fragment>
        ))}
      </Flex>
    </Expandable>
  )
}
