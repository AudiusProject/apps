import { useCallback, useContext, useEffect, useState } from 'react'

import { confirmEmailMessages as messages } from '@audius/common/messages'
import {
  confirmEmailSchema,
  formatOtp,
  confirmEmailErrorMessages
} from '@audius/common/schemas'
import { Text, TextLink } from '@audius/harmony'
import { Form, Formik, useField } from 'formik'
import { useDispatch } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  setValueField,
  signIn,
  startSignUp
} from 'common/store/pages/signon/actions'
import {
  getEmailField,
  getOtpField,
  getPasswordField,
  getIsGuest
} from 'common/store/pages/signon/selectors'
import { HarmonyTextField } from 'components/form-fields/HarmonyTextField'
import { ToastContext } from 'components/toast/ToastContext'
import { Heading, Page, PageFooter } from 'pages/sign-up-page/components/layout'
import { useSelector } from 'utils/reducer'

const initialValues = {
  otp: ''
}

type ConfirmEmailValues = {
  otp: string
}

const ConfirmEmailSchema = toFormikValidationSchema(confirmEmailSchema)

export const ConfirmEmailPage = () => {
  const dispatch = useDispatch()
  const { value: email } = useSelector(getEmailField)
  const { value: password } = useSelector(getPasswordField)
  const { value: otp } = useSelector(getOtpField)
  const isGuest = useSelector(getIsGuest)
  const isSubmitting = !!otp

  const handleSubmit = useCallback(
    (values: ConfirmEmailValues) => {
      const { otp } = values
      const sanitizedOtp = otp.replace(/\s/g, '')
      dispatch(setValueField('otp', sanitizedOtp))
      dispatch(setValueField('email', email))
      dispatch(startSignUp())
      dispatch(signIn(email, password, undefined, sanitizedOtp))
    },
    [dispatch, email, password]
  )

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={ConfirmEmailSchema}
    >
      <Page as={Form}>
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
          ph={0}
          buttonProps={{ isLoading: isSubmitting }}
        />
      </Page>
    </Formik>
  )
}

const VerificationCodeField = () => {
  const isInvalidOtp = useSelector(
    (state) =>
      typeof getPasswordField(state).error.includes === 'function' &&
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
  const { toast } = useContext(ToastContext)
  const [hasResentCode, setHasResendCode] = useState(false)

  const handleClick = useCallback(() => {
    dispatch(signIn(email, password))
    toast(messages.resentToast)
    setHasResendCode(true)
  }, [dispatch, email, password, toast])

  return (
    <TextLink
      variant={hasResentCode ? 'subdued' : 'visible'}
      onClick={handleClick}
      disabled={hasResentCode}
    >
      {messages.resendCode}
    </TextLink>
  )
}
