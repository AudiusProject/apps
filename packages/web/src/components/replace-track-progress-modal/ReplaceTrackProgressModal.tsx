import { useReplaceTrackProgressModal } from '@audius/common/store'
import {
  Modal,
  ModalContent,
  Text,
  Flex,
  IconAudiusLogo,
  ProgressBar,
  IconValidationCheck,
  LoadingSpinner,
  Button
} from '@audius/harmony'

const messages = {
  description:
    'Please hold on while we upload and replace the file for this track.',
  inProgress: 'Upload in progress',
  finalizing: 'Finalizing...',
  error: 'Something went wrong. Please try again later',
  close: 'Close'
}

export const ReplaceTrackProgressModal = () => {
  const { data, isOpen, onClose } = useReplaceTrackProgressModal()
  const { loaded, total, transcode, error } = data

  const uploadProgress =
    Math.min((loaded && total ? loaded / total : 0) + (transcode ?? 0), 2) / 2
  const isUploadComplete = uploadProgress >= 1

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='small'
      dismissOnClickOutside={false}
    >
      <ModalContent>
        {error ? (
          <Flex direction='column' gap='3xl' pt='3xl'>
            <Flex w={220} alignSelf='center' alignItems='center'>
              <Text variant='body' size='l' color='danger' textAlign='center'>
                {messages.error}
              </Text>
            </Flex>
            <Button variant='secondary' onClick={onClose}>
              {messages.close}
            </Button>
          </Flex>
        ) : (
          <Flex direction='column' gap='3xl'>
            <Flex alignItems='center' direction='column' gap='xl'>
              <IconAudiusLogo height={48} width={48} color='subdued' />
              <Text variant='body' size='l' textAlign='center'>
                {messages.description}
              </Text>
            </Flex>
            <Flex direction='column' gap='m'>
              <Flex justifyContent='space-between'>
                <Text variant='label' size='s'>
                  {isUploadComplete ? messages.finalizing : messages.inProgress}
                </Text>
                <Flex alignItems='center' gap='l'>
                  <Text variant='label' size='s'>
                    {Math.round(uploadProgress * 100)}%
                  </Text>
                  {isUploadComplete ? (
                    <IconValidationCheck size='s' />
                  ) : (
                    <LoadingSpinner css={{ height: 16, width: 16 }} />
                  )}
                </Flex>
              </Flex>
              <ProgressBar value={uploadProgress * 100} />
            </Flex>
          </Flex>
        )}
      </ModalContent>
    </Modal>
  )
}
