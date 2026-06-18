import { route } from '@audius/common/utils'
import {
  Button,
  IconCheck,
  IconEmailAddress,
  IconError,
  Text
} from '@audius/harmony'
import { Link, useSearchParams } from 'react-router'

import Page from 'components/page/Page'

import styles from './VerifyEmailPage.module.css'

const { SETTINGS_PAGE, SIGN_IN_PAGE } = route

const messages = {
  title: 'Email Verification',
  successTitle: 'Email Verified',
  successDescription:
    'Your email address has been verified. You can keep using Audius.',
  expiredTitle: 'Verification Link Expired',
  expiredDescription:
    'This verification link is no longer valid. Sign in and resend the verification email from settings.',
  invalidTitle: 'Invalid Verification Link',
  invalidDescription:
    'This verification link is invalid or has already been used.',
  errorTitle: 'Verification Failed',
  errorDescription:
    'Something went wrong while verifying your email. Please try again from settings.',
  settings: 'Go To Settings',
  signIn: 'Sign In'
}

type VerificationStatus = 'success' | 'expired' | 'invalid' | 'error'

const statusConfig: Record<
  VerificationStatus,
  {
    title: string
    description: string
    Icon: typeof IconCheck
  }
> = {
  success: {
    title: messages.successTitle,
    description: messages.successDescription,
    Icon: IconCheck
  },
  expired: {
    title: messages.expiredTitle,
    description: messages.expiredDescription,
    Icon: IconEmailAddress
  },
  invalid: {
    title: messages.invalidTitle,
    description: messages.invalidDescription,
    Icon: IconError
  },
  error: {
    title: messages.errorTitle,
    description: messages.errorDescription,
    Icon: IconError
  }
}

const getStatus = (status: string | null): VerificationStatus => {
  if (
    status === 'success' ||
    status === 'expired' ||
    status === 'invalid' ||
    status === 'error'
  ) {
    return status
  }
  return 'invalid'
}

export const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams()
  const status = getStatus(searchParams.get('status'))
  const { title, description, Icon } = statusConfig[status]

  return (
    <Page title={messages.title} description={title}>
      <div className={styles.wrapper}>
        <div className={styles.panel}>
          <div className={styles.icon}>
            <Icon color={status === 'success' ? 'staticWhite' : 'default'} />
          </div>
          <div className={styles.copy}>
            <Text variant='heading' size='l'>
              {title}
            </Text>
            <Text variant='body' size='l'>
              {description}
            </Text>
          </div>
          <div className={styles.actions}>
            <Button variant='primary' fullWidth asChild>
              <Link to={SETTINGS_PAGE}>{messages.settings}</Link>
            </Button>
            <Button variant='secondary' fullWidth asChild>
              <Link to={SIGN_IN_PAGE}>{messages.signIn}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Page>
  )
}

export default VerifyEmailPage
