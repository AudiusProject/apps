import { useCallback, useContext, useEffect } from 'react'

import {
  ChangePasswordFormValues,
  ChangePasswordPage,
  useChangePasswordFormConfiguration
} from '@audius/common/hooks'
import {
  Button,
  Flex,
  IconArrowRight,
  IconLock,
  Paper,
  Text
} from '@audius/harmony'
import { Form, Formik, useFormikContext } from 'formik'

import {
  ConfirmPasswordPage,
  VerifyEmailPage
} from 'components/change-email/ChangeEmailModal'
import { NewPasswordPage } from 'components/change-password/ChangePasswordModal'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
import { ToastContext } from 'components/toast/ToastContext'
import { goBack } from 'utils/navigation'

import { SlidingPages } from './SlidingPages'

const messages = {
  changeYourPassword: 'Change Your Password',
  changePassword: 'Change Password',
  continue: 'Continue',
  success: 'Password updated!'
}

const ChangePasswordMobileForm = ({ page }: { page: ChangePasswordPage }) => {
  const { isSubmitting } = useFormikContext<ChangePasswordFormValues>()
  return (
    <Flex
      as={Form}
      direction='column'
      justifyContent='space-between'
      css={{ flexGrow: 1 }}
    >
      <Flex p='l' gap='s' direction='column' mt='xl'>
        <Text variant='heading' color='heading'>
          {messages.changeYourPassword}
        </Text>
        <SlidingPages currentPage={page}>
          <ConfirmPasswordPage />
          <VerifyEmailPage />
          <NewPasswordPage />
        </SlidingPages>
      </Flex>
      <Paper shadow='midInverted' p='l'>
        <Button
          fullWidth
          variant='primary'
          iconRight={
            page === ChangePasswordPage.NewPassword ? IconLock : IconArrowRight
          }
          type='submit'
          isLoading={isSubmitting}
        >
          {page === ChangePasswordPage.NewPassword
            ? messages.changePassword
            : messages.continue}
        </Button>
      </Paper>
    </Flex>
  )
}

export const ChangePasswordMobilePage = () => {
  const navContext = useContext(NavContext)!
  const { toast } = useContext(ToastContext)

  useEffect(() => {
    navContext.setLeft(LeftPreset.CLOSE)
    return () => {
      navContext.setLeft(LeftPreset.BACK)
    }
  }, [navContext])

  const onSuccess = useCallback(() => {
    goBack()
    toast(messages.success)
  }, [toast])

  const { page, ...formikConfiguration } =
    useChangePasswordFormConfiguration(onSuccess)

  return (
    <Flex
      direction='column'
      css={{
        textAlign: 'start',
        backgroundColor: 'white',
        height: 'calc(100% - 50px)'
      }}
    >
      <Formik {...formikConfiguration}>
        <ChangePasswordMobileForm page={page} />
      </Formik>
    </Flex>
  )
}
