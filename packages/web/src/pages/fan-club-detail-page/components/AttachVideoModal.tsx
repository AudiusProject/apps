import { useCallback, useState } from 'react'

import { isValidVideoUrl, parseVideoUrl } from '@audius/common/utils'
import {
  Button,
  Flex,
  Hint,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Text,
  TextInput
} from '@audius/harmony'

import { VideoPlatformBadge } from 'components/video-platform-badge/VideoPlatformBadge'

const messages = {
  title: 'ATTACH VIDEO',
  description: 'Add a YouTube or Vimeo link to attach it.',
  label: 'Video URL',
  hint: 'Tip: Unlisted videos work best for exclusive content.',
  cancel: 'Cancel',
  attach: 'Attach'
}

type AttachVideoModalProps = {
  isOpen: boolean
  onClose: () => void
  onAttach: (videoUrl: string) => void
}

export const AttachVideoModal = ({
  isOpen,
  onClose,
  onAttach
}: AttachVideoModalProps) => {
  const [url, setUrl] = useState('')

  const parsed = url.trim() ? parseVideoUrl(url.trim()) : null
  const isValid = isValidVideoUrl(url.trim())

  const handleAttach = useCallback(() => {
    if (!isValid) return
    onAttach(url.trim())
    setUrl('')
    onClose()
  }, [isValid, url, onAttach, onClose])

  const handleClose = useCallback(() => {
    setUrl('')
    onClose()
  }, [onClose])

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size='small'>
      <ModalHeader onClose={handleClose}>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex column gap='l'>
          <Text variant='body' size='l'>
            {messages.description}
          </Text>
          <Flex row gap='m' alignItems='center'>
            <Flex flex={1}>
              <TextInput
                label={messages.label}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </Flex>
            {parsed ? <VideoPlatformBadge platform={parsed.platform} /> : null}
          </Flex>
          <Hint noIcon>{messages.hint}</Hint>
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Flex row gap='l' w='100%'>
          <Button variant='secondary' onClick={handleClose} fullWidth>
            {messages.cancel}
          </Button>
          <Button
            variant='primary'
            onClick={handleAttach}
            disabled={!isValid}
            fullWidth
          >
            {messages.attach}
          </Button>
        </Flex>
      </ModalFooter>
    </Modal>
  )
}
