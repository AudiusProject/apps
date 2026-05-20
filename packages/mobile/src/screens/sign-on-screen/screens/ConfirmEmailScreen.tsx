import { useCallback, useEffect, useState } from 'react'

import { confirmEmailMessages as messages } from '@audius/common/messages'
import {
  confirmEmailSchema,
  formatOtp,
  confirmEmailErrorMessages
} from '@audius/common/schemas'
import { setValueField, signIn } from 'common/store/pages/signon/actions'
import {
  getEmailField,
  getOtpField,
  getPasswordField,
  getIsGuest
} from 'common/store/pages/signon/selectors'
import { Formik, useField } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Text, TextLink } from '@audius/harmony-native'
import { HarmonyTextField } from 'app/components/fields'
import { useToast } from 'app/hooks/useToast'

import { Heading, Page, PageFooter } from '../components/layout'
import { useTrackScreen } from '../utils/useTrackScreen'

const initialValues = {
  otp: ''
}

type ConfirmEmailValues = {
  otp: string
}

const ConfirmEmailSchema = toFormikValidationSchema(confirmEmailSchema)

export const ConfirmEmailScreen = () => {
  const dispatch = useDispatch()
  const { value: email } = useSelector(getEmailField)
  const { value: password } = useSelector(getPasswordField)
  const { value: otp } = useSelector(getOtpField)
  const isGuest = useSelector(getIsGuest)
  const isSubmitting = !!otp

  useTrackScreen('ConfirmEmail')

  const handleSubmit = useCallback(
    async (values: ConfirmEmailValues) => {
      const { otp } = values
      const sanitizedOtp = otp.replace(/\s/g, '')
      dispatch(setValueField('otp', sanitizedOtp))
      dispatch(signIn(email, password, sanitizedOtp))
    },
    [dispatch, email, password]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={ConfirmEmailSchema}
    >
      <Page>
        <Heading
          heading={isGuest ? messages.finishSigningUp : messages.title}
          description={messages.description}
        />
        <VerificationCodeField />
        <Text variant='body'>
          {messages.noEmailNotice} <ResendCodeLink />
        </Text>
        <PageFooter
          shadow='flat'
          buttonProps={{ isLoading: isSubmitting, disabled: isSubmitting }}
          avoidKeyboard
        />
      </Page>
    </Formik>
  )
}

const VerificationCodeField = () => {
  const isInvalidOtp = useSelector(
    (state: any) =>
      getPasswordField(state).error.includes('400') &&
      getOtpField(state).value === ''
  )
  const [, , { setError }] = useField('otp')

  useEffect(() => {
    if (isInvalidOtp) {
      setError(confirmEmailErrorMessages.invalid)
    }
  }, [isInvalidOtp, setError])

  return (
    <HarmonyTextField
      name='otp'
      keyboardType='number-pad'
      label={messages.otpLabel}
      placeholder={messages.otpPlaceholder}
      transformValueOnChange={formatOtp}
    />
  )
}

const ResendCodeLink = () => {
  const dispatch = useDispatch()
  const { value: email } = useSelector(getEmailField)
  const { value: password } = useSelector(getPasswordField)
  const { toast } = useToast()
  const [hasResentCode, setHasResendCode] = useState(false)

  const handleClick = useCallback(() => {
    dispatch(signIn(email, password))
    toast({ content: messages.resentToast })
    setHasResendCode(true)
  }, [dispatch, email, password, toast])

  return (
    <TextLink
      variant={hasResentCode ? 'subdued' : 'visible'}
      onPress={handleClick}
      disabled={hasResentCode}
    >
      {messages.resendCode}
    </TextLink>
  )
}
