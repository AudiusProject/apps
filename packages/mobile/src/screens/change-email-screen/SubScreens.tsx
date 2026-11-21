import { useEffect } from 'react'

import { useField } from 'formik'
import { useAsync } from 'react-use'
import { formatOtp } from '~/schemas/sign-on/confirmEmailSchema'

import { Box, Text } from '@audius/harmony-native'
import { HarmonyTextField, PasswordField } from 'app/components/fields'
import LoadingSpinner from 'app/components/loading-spinner'
import { identityService } from 'app/services/sdk/identity'

import { ResendCodeLink } from '../change-password-screen/ResendCodeLink'
import { SubScreen } from '../change-password-screen/SubScreen'
import { SubScreenHeader } from '../change-password-screen/SubScreenHeader'

const messages = {
  changeYourEmail: 'Change Your Email',
  confirmPasswordHelp: 'Please enter your current password.',
  currentEmail: 'Current Email',
  currentPassword: 'Current Password',
  newEmailHelp: 'Enter the new email you would like to use on Audius.',
  newEmail: 'New email',
  verifyEmailDescription: 'Enter the verification code sent to your email.',
  code: 'Code',
  otpPlaceholder: '123 456',
  resendHelp: 'Didn’t get an email? '
}

export const CurrentEmail = () => {
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
        <LoadingSpinner style={{ width: 16, height: 16 }} />
      )}
    </Text>
  )
}

export const ConfirmPasswordSubScreen = () => {
  return (
    <SubScreen>
      <SubScreenHeader
        title={messages.changeYourEmail}
        description={messages.confirmPasswordHelp}
      />
      <Box>
        <Text variant='label' size={'xs'}>
          {messages.currentEmail}
        </Text>
        <CurrentEmail />
      </Box>
      <PasswordField
        name='password'
        label={messages.currentPassword}
        autoComplete={'password'}
        clearErrorOnChange={false}
        helperText={undefined}
      />
    </SubScreen>
  )
}

export const NewEmailSubScreen = () => {
  return (
    <SubScreen>
      <SubScreenHeader
        title={messages.changeYourEmail}
        description={messages.newEmailHelp}
      />
      <Box>
        <Text variant='label' size={'xs'}>
          {messages.currentEmail}
        </Text>
        <CurrentEmail />
      </Box>
      <HarmonyTextField
        name='email'
        label={messages.newEmail}
        autoComplete='off'
        keyboardType='email-address'
        autoCorrect={false}
        autoCapitalize='none'
      />
    </SubScreen>
  )
}

export const VerifyEmailSubScreen = () => (
  <SubScreen>
    <SubScreenHeader
      title={messages.changeYourEmail}
      description={messages.verifyEmailDescription}
    />
    <HarmonyTextField
      name='otp'
      label={messages.code}
      keyboardType='number-pad'
      placeholder={messages.otpPlaceholder}
      transformValueOnChange={formatOtp}
    />
    <Text variant='body'>
      {messages.resendHelp} <ResendCodeLink />
    </Text>
  </SubScreen>
)
