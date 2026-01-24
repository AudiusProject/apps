import { useReplaceTrackProgressModal } from '@audius/common/store'

import {
  Button,
  Flex,
  IconAudiusLogo,
  IconValidationCheck,
  Text
} from '@audius/harmony-native'
import { AppDrawer } from 'app/components/drawer'
import LoadingSpinner from 'app/components/loading-spinner'
import { ProgressBar } from 'app/components/progress-bar'

const messages = {
  description:
    'Please hold on while we upload and replace the file for this track.',
  inProgress: 'Upload in progress',
  finalizing: 'Finalizing...',
  error: 'Something went wrong. Please try again later',
  close: 'Close'
}

export const ReplaceTrackProgressDrawer = () => {
  const { data, onClose } = useReplaceTrackProgressModal()
  const { loaded, total, transcode, error } = data
  const upload = (total ?? 0) === 0 ? 0 : (loaded ?? 0) / total!

  const uploadProgress = Math.min(upload + (transcode ?? 0), 2) / 2
  const isUploadComplete = uploadProgress >= 1

  return (
    <AppDrawer
      modalName='ReplaceTrackProgress'
      isFullscreen
      blockClose={!error}
      isGestureSupported={error}
    >
      <Flex h='100%' justifyContent='center'>
        {error ? (
          <Flex direction='column' gap='3xl' ph='2xl'>
            <Flex w={220} alignSelf='center' alignItems='center'>
              <Text variant='body' size='l' color='danger' textAlign='center'>
                {messages.error}
              </Text>
            </Flex>
            <Button variant='secondary' onPress={onClose}>
              {messages.close}
            </Button>
          </Flex>
        ) : (
          <Flex direction='column' gap='3xl' ph='2xl' pb='3xl'>
            <Flex alignItems='center' direction='column' gap='xl'>
              <IconAudiusLogo height={48} width={48} color='subdued' />
              <Text variant='body' size='l' textAlign='center'>
                {messages.description}
              </Text>
            </Flex>
            <Flex direction='column'>
              <Flex justifyContent='space-between' direction='row'>
                <Text variant='label' size='s'>
                  {isUploadComplete ? messages.finalizing : messages.inProgress}
                </Text>
                <Flex alignItems='center' gap='l' direction='row'>
                  <Text variant='label' size='s'>
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                  {isUploadComplete ? (
                    <IconValidationCheck size='s' />
                  ) : (
                    <LoadingSpinner style={{ height: 16, width: 16 }} />
                  )}
                </Flex>
              </Flex>
              <ProgressBar progress={uploadProgress} max={1} />
            </Flex>
          </Flex>
        )}
      </Flex>
    </AppDrawer>
  )
}
