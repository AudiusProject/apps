import { useEffect, useMemo, useState } from 'react'

import { Status } from '@audius/common/models'
import { passwordSchema } from '@audius/common/schemas'
import { Button, Flex, IconArrowRight, Modal, Text } from '@audius/harmony'
import { Form, Formik } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import EnterPassword from 'components/sign-on/EnterPassword'
import { EnterPasswordSection } from 'pages/sign-up-page/components/EnterPasswordSection'

import styles from './PasswordResetModal.module.css'
import { changePassword } from './store/actions'
import { getStatus } from './store/selectors'

const RESET_REQUIRED_KEY = 'password-reset-required'

type PasswordResetMode = 'password' | 'emailpassword'

type PasswordResetRequiredData = {
  mode: PasswordResetMode
  email?: string
  lookupKey?: string
}

type EmailPasswordFormValues = {
  email: string
  password: string
  confirmPassword: string
}

const messages = {
  passwordTitle: 'Reset Your Password',
  emailPasswordTitle: 'Reset Your Email & Password',
  continueLabel: 'Submit',
  passwordHelpText:
    'Create a password that is secure and easy to remember. Write it down or use a password manager.',
  emailPasswordHelpText:
    'Set a new email and password to recover your account.',
  emailLabel: 'New Email',
  emailRequired: 'Please enter an email.',
  invalidEmail: 'Please enter a valid email.'
}

const emailPasswordFormikSchema = toFormikValidationSchema(
  z.intersection(
    z.object({
      email: z
        .string({ required_error: messages.emailRequired })
        .trim()
        .min(1, { message: messages.emailRequired })
        .email(messages.invalidEmail)
    }),
    passwordSchema
  )
)

const decodeIfEncoded = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const parseResetRequiredData = (
  rawResetData: string
): PasswordResetRequiredData | null => {
  let parsed: unknown = rawResetData
  try {
    parsed = JSON.parse(rawResetData)
  } catch {
    // Backwards compatibility with legacy non-JSON payloads.
  }

  if (typeof parsed === 'string') {
    const parsedEmail = decodeIfEncoded(parsed)
    if (parsedEmail && parsedEmail !== 'null') {
      return {
        mode: 'password',
        email: parsedEmail
      }
    }
    return null
  }

  if (typeof parsed !== 'object' || parsed === null) return null

  const parsedData = parsed as {
    mode?: unknown
    email?: unknown
    lookupKey?: unknown
  }
  const { mode, email, lookupKey } = parsedData

  const parsedEmail = typeof email === 'string' && email ? email : undefined
  const parsedLookupKey =
    typeof lookupKey === 'string' && lookupKey ? lookupKey : undefined

  if (mode === 'password') {
    if (!parsedEmail) return null
    return {
      mode: 'password',
      email: parsedEmail
    }
  }

  if (mode === 'emailpassword') {
    if (!parsedLookupKey) return null
    return {
      mode: 'emailpassword',
      email: parsedEmail,
      lookupKey: parsedLookupKey
    }
  }

  return null
}

export const PasswordResetModal = () => {
  const dispatch = useDispatch()

  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [resetRequiredData, setResetRequiredData] =
    useState<PasswordResetRequiredData | null>(null)
  const status = useSelector(getStatus)

  const onChangePassword = (
    email: string,
    password: string,
    lookupKey?: string
  ) => {
    dispatch(changePassword(email, password, lookupKey))
    setIsLoading(true)
  }

  // When the component mounts, show the modal if the reset key exists
  useEffect(() => {
    const rawResetData = window.localStorage.getItem(RESET_REQUIRED_KEY)
    if (rawResetData) {
      const parsedResetData = parseResetRequiredData(rawResetData)
      if (parsedResetData) {
        setResetRequiredData(parsedResetData)
        setShowModal(true)
      } else {
        setResetRequiredData(null)
        setShowModal(false)
        window.localStorage.removeItem(RESET_REQUIRED_KEY)
      }
    }

    // Clean up the required set key when the user leaves
    const onBeforeUnload = () => {
      window.localStorage.removeItem(RESET_REQUIRED_KEY)
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [])

  // Cleanup RESET_REQUIRED_KEY on unmount
  useEffect(
    () => () => {
      window.localStorage.removeItem(RESET_REQUIRED_KEY)
    },
    []
  )

  // When the status changes, if success clear the key and close the modal.
  // Otherwise, let the user try again or close the modal.
  useEffect(() => {
    if (status === Status.SUCCESS) {
      window.localStorage.removeItem(RESET_REQUIRED_KEY)
      setShowModal(false)
      setIsLoading(false)
      setResetRequiredData(null)
    }
    if (status === Status.ERROR) {
      setIsLoading(false)
    }
  }, [status])

  const onSubmitPassword = (password: string) => {
    if (!resetRequiredData || resetRequiredData.mode !== 'password') return
    if (!resetRequiredData.email) return

    onChangePassword(resetRequiredData.email, password)
  }

  const onSubmitEmailPassword = ({
    email,
    password
  }: EmailPasswordFormValues) => {
    if (!resetRequiredData || resetRequiredData.mode !== 'emailpassword') return
    if (!resetRequiredData.lookupKey) return

    onChangePassword(email.trim(), password, resetRequiredData.lookupKey)
  }

  const isEmailPasswordMode = resetRequiredData?.mode === 'emailpassword'
  const emailPasswordInitialValues = useMemo(
    () => ({
      email:
        resetRequiredData?.mode === 'emailpassword'
          ? (resetRequiredData.email ?? '')
          : '',
      password: '',
      confirmPassword: ''
    }),
    [resetRequiredData]
  )

  return (
    <Modal
      title={
        isEmailPasswordMode
          ? messages.emailPasswordTitle
          : messages.passwordTitle
      }
      dismissOnClickOutside={false}
      isOpen={showModal}
      onClose={() => {}}
      showTitleHeader
      bodyClassName={styles.modalBody}
      headerContainerClassName={styles.modalHeader}
      titleClassName={styles.modalTitle}
    >
      <Flex direction='column' gap='xl' p='l'>
        <Text variant='body' strength='weak' textAlign='center'>
          {isEmailPasswordMode
            ? messages.emailPasswordHelpText
            : messages.passwordHelpText}
        </Text>
        {isEmailPasswordMode ? (
          <Formik
            enableReinitialize
            initialValues={emailPasswordInitialValues}
            onSubmit={onSubmitEmailPassword}
            validationSchema={emailPasswordFormikSchema}
          >
            {({ isValid }) => (
              <Flex
                as={Form}
                direction='column'
                gap='xl'
                pb='m'
                ph='xl'
                h='100%'
                w='100%'
                justifyContent='space-between'
              >
                <Flex direction='column' gap='xl'>
                  <HarmonyTextField
                    name='email'
                    autoComplete='email'
                    label={messages.emailLabel}
                    autoFocus
                    transformValueOnBlur={(value) => value.trim()}
                  />
                  <EnterPasswordSection />
                </Flex>
                <Flex justifyContent='center'>
                  <Button
                    name='continue'
                    type='submit'
                    iconRight={IconArrowRight}
                    disabled={!isValid}
                    variant='primary'
                    isLoading={isLoading}
                  >
                    {messages.continueLabel}
                  </Button>
                </Flex>
              </Flex>
            )}
          </Formik>
        ) : (
          <EnterPassword
            continueLabel={messages.continueLabel}
            onSubmit={onSubmitPassword}
            isLoading={isLoading}
          />
        )}
      </Flex>
    </Modal>
  )
}
