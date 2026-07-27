import { useCallback, useEffect } from 'react'

import {
  useCancelStemsArchiveJob,
  useDownloadTrackStems,
  useGetStemsArchiveJobStatus
} from '@audius/common/api'
import { useAppContext } from '@audius/common/context'
import { ID, Name } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import { useDownloadTrackArchiveModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  ModalHeader,
  Text,
  Flex,
  LoadingSpinner,
  IconFolder,
  ModalTitle,
  IconReceive,
  Hint,
  IconError,
  TextLink
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { env } from 'services/env'

const messages = {
  title: 'Preparing Download',
  zippingFiles: (count: number) => `Zipping files (${count})`,
  error: 'Something went wrong. Please check your connection and try again.',
  tryAgain: 'Try again.'
}

const triggerDownload = (url: string) => {
  if (document) {
    const link = document.createElement('a')
    link.href = url
    link.click()
    link.remove()
  } else {
    throw new Error('No document found')
  }
}

type DownloadTrackArchiveModalContentProps = {
  trackId: ID
  fileCount: number
  isOpen: boolean
  onClose: () => void
  onClosed: () => void
}
const DownloadTrackArchiveModalContent = ({
  trackId,
  fileCount,
  isOpen,
  onClose,
  onClosed
}: DownloadTrackArchiveModalContentProps) => {
  const {
    analytics: { track, make }
  } = useAppContext()
  const {
    mutate: downloadTrackStems,
    isError: initiateDownloadFailed,
    isPending: isStartingDownload,
    data: { id: jobId } = {}
  } = useDownloadTrackStems({
    trackId
  })

  const { mutate: cancelStemsArchiveJob } = useCancelStemsArchiveJob()

  const {
    data: jobStatus,
    isError: isJobStatusError,
    isTimedOut: isJobTimedOut
  } = useGetStemsArchiveJobStatus({
    jobId
  })

  const hasError =
    !isStartingDownload &&
    (initiateDownloadFailed ||
      jobStatus?.state === 'failed' ||
      (!!jobId && (isJobStatusError || isJobTimedOut)))

  useEffect(() => {
    if (hasError) {
      track(
        make({
          eventName: Name.TRACK_DOWNLOAD_FAILED_DOWNLOAD_ALL
        })
      )
    }
  }, [hasError, track, make])

  useEffect(() => {
    downloadTrackStems()
  }, [downloadTrackStems])

  useEffect(() => {
    if (jobStatus?.state === 'completed') {
      triggerDownload(`${env.ARCHIVE_ENDPOINT}/archive/stems/download/${jobId}`)
      track(
        make({
          eventName: Name.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_ALL
        })
      )
      onClose()
    }
  }, [jobStatus, onClose, jobId, track, make])

  const handleClose = useCallback(() => {
    if (jobId) {
      cancelStemsArchiveJob({ jobId })
    }
    onClose()
  }, [onClose, jobId, cancelStemsArchiveJob])

  const handleRetry = useCallback(() => {
    downloadTrackStems()
  }, [downloadTrackStems])

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={onClosed}
      dismissOnClickOutside={false}
      size='small'
    >
      <ModalHeader>
        <ModalTitle title={messages.title} Icon={IconReceive} />
      </ModalHeader>
      <ModalContent>
        <Flex
          justifyContent='center'
          alignItems='center'
          direction='column'
          gap='xl'
        >
          <Flex alignItems='center' gap='l'>
            <IconFolder color='default' size='l' />
            <Text variant='body' size='l' strength='strong'>
              {messages.zippingFiles(fileCount)}
            </Text>
          </Flex>
          {hasError ? (
            <Hint
              icon={IconError}
              border='strong'
              actions={
                <TextLink variant='visible' onClick={handleRetry}>
                  {messages.tryAgain}
                </TextLink>
              }
            >
              {messages.error}
            </Hint>
          ) : (
            <LoadingSpinner size='l' />
          )}
        </Flex>
      </ModalContent>
    </Modal>
  )
}

export const DownloadTrackArchiveModal = NiceModal.create(() => {
  const modal = useModal()
  const {
    data: { trackId, fileCount }
  } = useDownloadTrackArchiveModal()

  if (!trackId) {
    console.error(
      'Unexpected missing trackId when rendering DownloadTrackArchiveModal'
    )
    return null
  }

  return (
    <DownloadTrackArchiveModalContent
      trackId={trackId}
      fileCount={fileCount}
      isOpen={modal.visible}
      onClose={() => modal.hide()}
      onClosed={() => modal.remove()}
    />
  )
})

NiceModal.register('DownloadTrackArchive', DownloadTrackArchiveModal)
registerNiceModalId('DownloadTrackArchive')
