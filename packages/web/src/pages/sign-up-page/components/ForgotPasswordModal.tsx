import {
  Modal,
  Flex,
  Text,
  useTheme,
  IconQuestionCircle,
  ModalHeader,
  ModalTitle
} from '@audius/harmony'
import { CSSObject } from '@emotion/styled'

import Toast from 'components/toast/Toast'
import { copyToClipboard } from 'utils/clipboardUtil'

const messages = {
  forgotPassword: 'Forgot Your Password',
  restoreAccess:
    'To restore access to your account, please search for the email we sent when you first signed up.',
  fromHeader: 'From:',
  subjectHeader: 'Subject:',
  from: 'recovery@audius.co',
  subject: '"Save This Email: Audius Password Recovery"',
  copied: 'Copied to Clipboard!'
}

type ForgotPasswordModalProps = {
  isOpen: boolean
  onClose(): void
}

const TOOLTIP_DELAY = 1000

export const ForgotPasswordModal = (props: ForgotPasswordModalProps) => {
  const { isOpen, onClose } = props
  const { color } = useTheme()

  const onCopyFrom = () => {
    copyToClipboard(messages.from)
  }

  const onCopySubject = () => {
    copyToClipboard(messages.subject)
  }

  const linkCss: CSSObject = {
    cursor: 'pointer',
    ':hover': {
      color: color.secondary.secondary
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      dismissOnClickOutside
      size='medium'
    >
      <ModalHeader>
        <ModalTitle
          icon={<IconQuestionCircle />}
          title={messages.forgotPassword}
        />
      </ModalHeader>
      <Flex direction='column' gap='xl' m='xl'>
        <Text variant='body' strength='strong' textAlign='center'>
          {messages.restoreAccess}
        </Text>
        <Flex gap='m' pv='m' ph='xl' border='strong' borderRadius='m'>
          <Flex
            w={64}
            direction='column'
            gap='m'
            css={{ color: color.neutral.n400 }}
          >
            <Text variant='title'>{messages.fromHeader}</Text>
            <Text variant='title'>{messages.subjectHeader}</Text>
          </Flex>
          <Flex direction='column' gap='m' flex='1'>
            <Toast
              text={messages.copied}
              requireAccount={false}
              delay={TOOLTIP_DELAY}
              anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
              portalLocation={
                typeof document !== 'undefined'
                  ? document.getElementById('page') || document.body
                  : undefined
              }
            >
              <Text
                variant='title'
                strength='weak'
                onClick={onCopyFrom}
                css={linkCss}
              >
                {messages.from}
              </Text>
            </Toast>
            <Toast
              text={messages.copied}
              requireAccount={false}
              delay={TOOLTIP_DELAY}
              anchorOrigin={{ horizontal: 'left', vertical: 'top' }}
              transformOrigin={{ horizontal: 'left', vertical: 'bottom' }}
              portalLocation={
                typeof document !== 'undefined'
                  ? document.getElementById('page') || document.body
                  : undefined
              }
            >
              <Text
                variant='title'
                strength='weak'
                onClick={onCopySubject}
                css={linkCss}
              >
                {messages.subject}
              </Text>
            </Toast>
          </Flex>
        </Flex>
      </Flex>
    </Modal>
  )
}
