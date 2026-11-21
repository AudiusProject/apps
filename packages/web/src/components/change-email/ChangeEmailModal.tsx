import { useCallback, useContext, useEffect, useState } from 'react'

import {
  ChangeEmailPage,
  isOtpMissingError,
  useChangeEmailFormConfiguration
} from '@audius/common/hooks'
import { formatOtp } from '@audius/common/schemas'
import {
  Modal,
  ModalContentPages,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Box,
  Button,
  Flex,
  IconArrowRight,
  IconEmailAddress,
  Text,
  TextLink
} from '@audius/harmony'
import { Formik, useField, useFormikContext } from 'formik'
import { useAsync } from 'react-use'

import { HarmonyPasswordField } from 'components/form-fields/HarmonyPasswordField'
import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { ModalForm } from 'components/modal-form/ModalForm'
import { ToastContext } from 'components/toast/ToastContext'
import { identityService } from 'services/audius-sdk/identity'

import styles from './ChangeEmailModal.module.css'

const messages = {
  changeEmail: 'Change Email',
  confirmPasswordHelp: 'Please enter your current password.',
  currentEmail: 'Current Email',
  currentPassword: 'Current Password',
  newEmailHelp: 'Enter the new email you would like to use on Audius.',
  newEmail: 'New email',
  continue: 'Continue',
  somethingWrong: 'Something went wrong.',
  verifyEmailHelp: 'Enter the verification code sent to your email.',
  resendHelp: 'Didn’t get an email? ',
  resend: 'Resend code.',
  code: 'Code',
  otpPlaceholder: '123 456',
  resentToast: 'Verification code resent.',
  success: 'Email updated!'
}

type ChangeEmailModalProps = {
  isOpen: boolean
  onClose: () => void
}

const ResendCodeLink = () => {
  const [{ value: email }] = useField('email')

  const [isSending, setIsSending] = useState(false)
  const { toast } = useContext(ToastContext)

  const handleClick = useCallback(async () => {
    setIsSending(true)
    try {
      await identityService.changeEmail({
        email
      })
    } catch (e) {
      if (isOtpMissingError(e)) {
        toast(messages.resentToast)
      } else {
        toast(messages.somethingWrong)
      }
    } finally {
      setIsSending(false)
    }
  }, [email, toast])
  return (
    <TextLink variant='visible' disabled={isSending} onClick={handleClick}>
      {messages.resend}
    </TextLink>
  )
}

const CurrentEmail = () => {
  const [{ value: oldEmail }, , { setValue: setOldEmail }] =
    useField('oldEmail')
  const emailRequest = useAsync(async () => {
    return await identityService.getUserEmail()
  })
  useEffect(() => {
    if (emailRequest.value) {
      setOldEmail(emailRequest.value)
    }
  }, [emailRequest.loading, emailRequest.value, setOldEmail])
  return (
    <Text variant='body' size='m'>
      {oldEmail !== '' ? (
        oldEmail
      ) : (
        <LoadingSpinner className={styles.inlineSpinner} />
      )}
    </Text>
  )
}

export const ConfirmPasswordPage = () => {
  return (
    <Flex direction='column' gap='xl'>
      <Text variant='body'>{messages.confirmPasswordHelp}</Text>
      <Box>
        <Text variant='label' size='xs'>
          {messages.currentEmail}
        </Text>
        <CurrentEmail />
      </Box>
      <HarmonyPasswordField
        name='password'
        label={messages.currentPassword}
        autoComplete='password'
      />
    </Flex>
  )
}

export const NewEmailPage = () => {
  return (
    <Flex direction='column' gap='xl'>
      <Text variant='body'>{messages.newEmailHelp}</Text>
      <Box>
        <Text variant='label' size='xs'>
          {messages.currentEmail}
        </Text>
        <CurrentEmail />
      </Box>
      <HarmonyTextField name='email' label={messages.newEmail} />
    </Flex>
  )
}

export const VerifyEmailPage = () => {
  return (
    <Flex direction='column' gap='xl'>
      <Text variant='body'>{messages.verifyEmailHelp}</Text>
      <HarmonyTextField
        name='otp'
        label={messages.code}
        placeholder={messages.otpPlaceholder}
        transformValueOnChange={formatOtp}
      />
      <Text variant='body'>
        {messages.resendHelp}
        <ResendCodeLink />
      </Text>
    </Flex>
  )
}

const ChangeEmailModalForm = ({
  onClose,
  page
}: Pick<ChangeEmailModalProps, 'onClose'> & {
  page: ChangeEmailPage
}) => {
  const { isSubmitting } = useFormikContext()

  return (
    <ModalForm>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={messages.changeEmail} icon={<IconEmailAddress />} />
      </ModalHeader>
      <ModalContentPages currentPage={page}>
        <ConfirmPasswordPage />
        <NewEmailPage />
        <VerifyEmailPage />
      </ModalContentPages>
      <ModalFooter className={styles.footer}>
        <Button
          variant='primary'
          type='submit'
          isLoading={isSubmitting}
          fullWidth
          iconRight={
            page === ChangeEmailPage.VerifyEmail ? undefined : IconArrowRight
          }
        >
          {page === ChangeEmailPage.VerifyEmail
            ? messages.changeEmail
            : messages.continue}
        </Button>
      </ModalFooter>
    </ModalForm>
  )
}

export const ChangeEmailModal = ({
  isOpen,
  onClose
}: ChangeEmailModalProps) => {
  const { toast } = useContext(ToastContext)
  const onSuccess = useCallback(() => {
    onClose()
    toast(messages.success)
  }, [onClose, toast])

  const { page, setPage, ...formikConfig } =
    useChangeEmailFormConfiguration(onSuccess)

  const handleClosed = useCallback(() => {
    setPage(ChangeEmailPage.ConfirmPassword)
  }, [setPage])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onClosed={handleClosed}
      size='small'
    >
      <Formik {...formikConfig}>
        <ChangeEmailModalForm onClose={onClose} page={page} />
      </Formik>
    </Modal>
  )
}
