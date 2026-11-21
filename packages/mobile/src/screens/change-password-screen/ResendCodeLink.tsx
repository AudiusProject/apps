import { isOtpMissingError } from '@audius/common/hooks'
import { useField } from 'formik'
import { useAsyncFn } from 'react-use'

import { TextLink } from '@audius/harmony-native'
import { useToast } from 'app/hooks/useToast'
import { identityService } from 'app/services/sdk/identity'

const messages = {
  resend: 'Resend code.',
  resentToast: 'Verification code resent.',
  somethingWrong: 'Something went wrong.'
}

export const ResendCodeLink = () => {
  const [{ value: email }] = useField('email')

  const { toast } = useToast()

  const [{ loading }, sendCode] = useAsyncFn(async () => {
    try {
      await identityService.changeEmail({
        email
      })
    } catch (e) {
      if (isOtpMissingError(e)) {
        toast({ content: messages.resentToast, type: 'info' })
      } else {
        toast({ content: messages.somethingWrong, type: 'error' })
      }
    }
  }, [email, toast])
  return (
    <TextLink variant='visible' disabled={loading} onPress={sendCode}>
      {messages.resend}
    </TextLink>
  )
}
