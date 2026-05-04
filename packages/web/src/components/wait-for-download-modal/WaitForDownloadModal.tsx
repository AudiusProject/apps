import { useCallback, useEffect } from 'react'

import { useTrack, useUser } from '@audius/common/api'
import { DownloadQuality } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import {
  useWaitForDownloadModal,
  tracksSocialActions,
  downloadsSelectors
} from '@audius/common/store'
import { getFilename } from '@audius/common/utils'
import {
  ModalHeader,
  Flex,
  IconReceive,
  Text,
  Hint,
  IconError,
  TextLink,
  ModalTitle
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './WaitForDownloadModal.module.css'

const { getDownloadError } = downloadsSelectors

const messages = {
  title: 'Downloading...',
  somethingWrong:
    'Something went wrong. Please check your connection and storage and try again.',
  tryAgain: 'Try again.'
}

export const WaitForDownloadModal = NiceModal.create(() => {
  const isMobile = useIsMobile()
  const modal = useModal()
  const {
    data: { parentTrackId, trackIds, quality }
  } = useWaitForDownloadModal()
  const dispatch = useDispatch()
  const { data: track } = useTrack(parentTrackId ?? trackIds[0])
  const { data: user } = useUser(track?.owner_id)

  const downloadError = useSelector(getDownloadError)

  const handleClose = useCallback(() => {
    modal.hide()
  }, [modal])

  const handleClosed = useCallback(() => {
    dispatch(tracksSocialActions.cancelDownloads())
  }, [dispatch])

  const performDownload = useCallback(() => {
    dispatch(
      tracksSocialActions.downloadTrack({
        trackIds,
        parentTrackId,
        original: quality === DownloadQuality.ORIGINAL
      })
    )
  }, [trackIds, parentTrackId, quality, dispatch])

  useEffect(() => {
    performDownload()
  }, [performDownload])

  const trackName =
    !parentTrackId &&
    user &&
    track?.orig_filename &&
    track?.orig_filename?.length > 0
      ? getFilename({
          track,
          user,
          isOriginal: quality === DownloadQuality.ORIGINAL
        })
      : track?.title

  return (
    <ModalDrawer
      isOpen={modal.visible}
      onClose={handleClose}
      onClosed={handleClosed}
      bodyClassName={styles.modal}
      isFullscreen
      dismissOnClickOutside
      wrapperClassName={isMobile ? styles.mobileWrapper : undefined}
    >
      <ModalHeader
        onClose={handleClose}
        showDismissButton={!isMobile}
        className={cn(styles.modalHeader, { [styles.mobile]: isMobile })}
      >
        <ModalTitle icon={<IconReceive />} title={messages.title} />
      </ModalHeader>
      <Flex direction='column' p='xl' gap='xl' alignItems='center'>
        <Text variant='body' size='l' strength='strong'>
          {trackName}
        </Text>
        {downloadError ? (
          <Hint icon={IconError}>
            <Flex direction='column' gap='m'>
              <Text variant='body' color='default'>
                {messages.somethingWrong}
              </Text>
              <TextLink variant='visible' onClick={performDownload}>
                {messages.tryAgain}
              </TextLink>
            </Flex>
          </Hint>
        ) : (
          <LoadingSpinner className={styles.spinner} />
        )}
      </Flex>
    </ModalDrawer>
  )
})

NiceModal.register('WaitForDownloadModal', WaitForDownloadModal)
registerNiceModalId('WaitForDownloadModal')
