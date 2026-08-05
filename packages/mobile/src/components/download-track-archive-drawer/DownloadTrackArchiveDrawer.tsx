import { useCallback, useEffect, useState } from 'react'

import {
  useCancelStemsArchiveJob,
  useDownloadTrackStems,
  useGetStemsArchiveJobStatus,
  useTrack
} from '@audius/common/api'
import { useAppContext } from '@audius/common/context'
import type { ID } from '@audius/common/models'
import { Name } from '@audius/common/models'
import type { DownloadFile } from '@audius/common/services'
import { useDownloadTrackArchiveModal } from '@audius/common/store'

import {
  Flex,
  Hint,
  IconError,
  IconFolder,
  IconReceive,
  Text,
  TextLink
} from '@audius/harmony-native'
import Drawer from 'app/components/drawer'
import { env } from 'app/services/env'

import { DrawerHeader } from '../core/DrawerHeader'
import LoadingSpinner from '../loading-spinner'

const messages = {
  title: 'Downloading...',
  zippingFiles: (count: number) => `Zipping files (${count})`,
  error: 'Something went wrong. Please check your connection and try again.',
  tryAgain: 'Try again.'
}

const useDownloadFile = () => {
  const { trackDownload } = useAppContext()
  const [fetching, setFetching] = useState<boolean>(false)
  const [success, setSuccess] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  const downloadFile = useCallback(
    async ({ file }: { file: DownloadFile }) => {
      setFetching(true)
      setError(null)
      const abortController = new AbortController()
      setAbortController(abortController)
      try {
        await trackDownload.downloadFile({
          file,
          mimeType: 'application/zip',
          abortSignal: abortController.signal
        })
        setSuccess(true)
      } catch (e) {
        setError(e as Error)
        console.error('Failed to download track archive', e as Error)
      } finally {
        setFetching(false)
        setAbortController(null)
      }
    },
    [trackDownload]
  )

  const cancel = useCallback(() => {
    if (abortController) {
      abortController.abort()
    }
  }, [abortController])

  const reset = useCallback(() => {
    setFetching(false)
    setSuccess(false)
    setError(null)
  }, [])

  return { downloadFile, fetching, success, error, reset, cancel }
}

type DownloadTrackArchiveDrawerContentProps = {
  trackId: ID
  fileCount: number
  isOpen: boolean
  onClose: () => void
  onClosed: () => void
}

const DownloadTrackArchiveDrawerContent = ({
  trackId,
  fileCount,
  isOpen,
  onClose,
  onClosed
}: DownloadTrackArchiveDrawerContentProps) => {
  const {
    analytics: { track, make }
  } = useAppContext()

  const { data: trackTitle } = useTrack(trackId, {
    select: (track) => track.title
  })
  const [step, setStep] = useState<'downloading' | 'zipping'>('zipping')

  const {
    mutate: downloadTrackStems,
    isError: initiateDownloadFailed,
    isPending: isStartingDownload,
    data: { id: jobId } = {}
  } = useDownloadTrackStems({
    trackId
  })

  const {
    downloadFile,
    success: downloadSuccess,
    error: downloadError,
    reset: resetDownload,
    cancel: cancelDownload
  } = useDownloadFile()

  const { mutate: cancelStemsArchiveJob } = useCancelStemsArchiveJob()

  const {
    data: jobState,
    isError: isJobStatusError,
    isTimedOut: isJobTimedOut
  } = useGetStemsArchiveJobStatus({
    jobId
  })

  // `isTimedOut` and `isError` have to be part of this, not just `failed`.
  // A job that never leaves `waiting` — the archiver worker losing its Redis
  // lock and holding every concurrency slot, for instance — is reported as a
  // perfectly valid non-terminal state forever, so keying only off `failed`
  // leaves the drawer spinning with no error and no retry until the user
  // gives up. The shared hook already enforces STEMS_ARCHIVE_POLL_TIMEOUT_MS
  // and hands back `isTimedOut`; web consumes it and mobile did not.
  const hasError =
    !isStartingDownload &&
    (downloadError ||
      initiateDownloadFailed ||
      jobState?.state === 'failed' ||
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
    if (jobState?.state === 'completed' && trackTitle) {
      const fetchResult = async () => {
        setStep('downloading')
        await downloadFile({
          file: {
            url: `${env.ARCHIVE_ENDPOINT}/archive/stems/download/${jobId}`,
            filename: `${trackTitle}.zip`
          }
        })
        track(
          make({
            eventName: Name.TRACK_DOWNLOAD_SUCCESSFUL_DOWNLOAD_ALL
          })
        )
        onClose()
      }
      fetchResult()
    }
  }, [jobState, onClose, jobId, downloadFile, trackTitle, make, track])

  // Close drawer automatically if download was successful
  useEffect(() => {
    if (downloadSuccess) {
      onClose()
    }
  }, [downloadSuccess, onClose])

  const handleClose = useCallback(() => {
    if (jobId) {
      cancelStemsArchiveJob({ jobId })
    }
    cancelDownload()
    onClose()
  }, [onClose, jobId, cancelStemsArchiveJob, cancelDownload])

  const handleRetry = useCallback(() => {
    setStep('zipping')
    resetDownload()
    downloadTrackStems()
  }, [downloadTrackStems, resetDownload])

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} onClosed={onClosed}>
      <Flex ph='l' pv='xl' gap='xl'>
        <DrawerHeader icon={IconReceive} title={messages.title} />
        <Flex justifyContent='center' alignItems='center' gap='xl'>
          <Flex row alignItems='center' gap='l'>
            {step === 'zipping' ? (
              <>
                <IconFolder color='default' size='l' />
                <Text variant='body' size='l' strength='strong'>
                  {messages.zippingFiles(fileCount)}
                </Text>
              </>
            ) : (
              <Text variant='body' size='l' strength='strong'>
                {`${trackTitle}.zip`}
              </Text>
            )}
          </Flex>
          {hasError ? (
            <Hint
              icon={IconError}
              border='strong'
              actions={
                <TextLink variant='visible' onPress={handleRetry}>
                  {messages.tryAgain}
                </TextLink>
              }
            >
              {messages.error}
            </Hint>
          ) : (
            <LoadingSpinner />
          )}
        </Flex>
      </Flex>
    </Drawer>
  )
}

export const DownloadTrackArchiveDrawer = () => {
  const {
    data: { trackId, fileCount },
    isOpen,
    onClose,
    onClosed
  } = useDownloadTrackArchiveModal()

  if (!trackId) {
    console.error(
      'Unexpected missing trackId when rendering DownloadTrackArchiveDrawer'
    )
    return null
  }

  return (
    <DownloadTrackArchiveDrawerContent
      trackId={trackId}
      fileCount={fileCount}
      isOpen={isOpen}
      onClose={onClose}
      onClosed={onClosed}
    />
  )
}
