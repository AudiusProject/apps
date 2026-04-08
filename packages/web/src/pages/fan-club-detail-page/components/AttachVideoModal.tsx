import { useCallback, useState } from 'react'

import { isValidVideoUrl, parseVideoUrl } from '@audius/common/utils'
import {
  Button,
  Flex,
  Hint,
  IconValidationCheck,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Text,
  TextInput
} from '@audius/harmony'

const messages = {
  title: 'ATTACH VIDEO',
  description: 'Add a YouTube or Vimeo link to attach it.',
  label: 'Video URL',
  hint: 'Tip: Unlisted videos work best for exclusive content.',
  cancel: 'Cancel',
  attach: 'Attach'
}

const YouTubeIcon = () => (
  <svg width='40' height='40' viewBox='0 0 40 40' fill='none'>
    <rect width='40' height='40' rx='8' fill='#e8e8e8' />
    <path
      d='M31.7 14.4a2.5 2.5 0 0 0-1.8-1.8C28.2 12 20 12 20 12s-8.2 0-9.9.6a2.5 2.5 0 0 0-1.8 1.8C8 16.1 8 20 8 20s0 3.9.3 5.6a2.5 2.5 0 0 0 1.8 1.8c1.7.6 9.9.6 9.9.6s8.2 0 9.9-.6a2.5 2.5 0 0 0 1.8-1.8c.3-1.7.3-5.6.3-5.6s0-3.9-.3-5.6Z'
      fill='red'
    />
    <path d='M17.5 24V16.5L24.5 20L17.5 24Z' fill='white' />
  </svg>
)

const VimeoIcon = () => (
  <svg width='40' height='40' viewBox='0 0 40 40' fill='none'>
    <rect width='40' height='40' rx='8' fill='#e8e8e8' />
    <path
      d='M31.95 15.48c-.1 2.1-1.56 4.97-4.4 8.62C24.6 28.08 22.1 30 20.05 30c-1.27 0-2.34-1.17-3.22-3.52l-1.76-6.44c-.65-2.35-1.35-3.52-2.1-3.52-.16 0-.73.34-1.7 1.02L10 15.95c1.07-.94 2.13-1.89 3.16-2.83 1.43-1.23 2.5-1.88 3.22-1.95 1.69-.16 2.73 1 3.12 3.46.42 2.66.72 4.32.88 4.97.49 2.22 1.03 3.33 1.62 3.33.46 0 1.14-.72 2.06-2.16.91-1.44 1.4-2.54 1.46-3.3.13-1.25-.36-1.88-1.47-1.88-.52 0-1.06.12-1.62.36 1.08-3.53 3.14-5.24 6.18-5.15 2.26.06 3.33 1.53 3.2 4.41l.04.22Z'
      fill='#1AB7EA'
    />
  </svg>
)

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
            {parsed ? (
              <Flex
                alignItems='center'
                justifyContent='center'
                css={{ position: 'relative', width: 40, height: 40 }}
              >
                {parsed.platform === 'youtube' ? (
                  <YouTubeIcon />
                ) : (
                  <VimeoIcon />
                )}
                <IconValidationCheck
                  size='s'
                  color='default'
                  css={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2
                  }}
                />
              </Flex>
            ) : null}
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
