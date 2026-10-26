import { useCallback, useEffect, useState } from 'react'

import { useDownloadTrackStems, useTrack } from '@audius/common/api'
import { useAppContext } from '@audius/common/context'
import type { ID } from '@audius/common/models'
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

import { DrawerHeader } from '../core/DrawerHeader'
import LoadingSpinner from '../loading-spinner'

const messages = {
  title: 'Downloading...',
  files: (count: number) => `${count} ${count === 1 ? 'file' : 'files'}`,
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
  const { data: trackTitle } = useTrack(trackId, {
    select: (track) => track.title
  })

  const { mutateAsync: getStemsZipUrl, isError: urlFailed } =
    useDownloadTrackStems({ trackId })

  const {
    downloadFile,
    success: downloadSuccess,
    error: downloadError,
    reset: resetDownload,
    cancel: cancelDownload
  } = useDownloadFile()

  const hasError = urlFailed || !!downloadError

  const startDownload = useCallback(async () => {
    if (!trackTitle) return
    resetDownload()
    try {
      const url = await getStemsZipUrl()
      await downloadFile({ file: { url, filename: `${trackTitle}.zip` } })
    } catch (e) {
      console.error('Failed to start stems download', e)
    }
  }, [trackTitle, getStemsZipUrl, downloadFile, resetDownload])

  useEffect(() => {
    startDownload()
  }, [startDownload])

  // Close drawer automatically if download was successful
  useEffect(() => {
    if (downloadSuccess) {
      onClose()
    }
  }, [downloadSuccess, onClose])

  const handleClose = useCallback(() => {
    cancelDownload()
    onClose()
  }, [onClose, cancelDownload])

  return (
    <Drawer isOpen={isOpen} onClose={handleClose} onClosed={onClosed}>
      <Flex ph='l' pv='xl' gap='xl'>
        <DrawerHeader icon={IconReceive} title={messages.title} />
        <Flex justifyContent='center' alignItems='center' gap='xl'>
          <Flex row alignItems='center' gap='l'>
            <IconFolder color='default' size='l' />
            <Text variant='body' size='l' strength='strong'>
              {messages.files(fileCount)}
            </Text>
          </Flex>
          {hasError ? (
            <Hint
              icon={IconError}
              border='strong'
              actions={
                <TextLink variant='visible' onPress={startDownload}>
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
