import { useCallback } from 'react'

import {
  selectIsAccountComplete,
  useAccountStatus,
  useCurrentAccount,
  useCurrentAccountUser,
  useHasAccount
} from '@audius/common/api'
import { Name, Status } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Box, Button, IconArrowRight } from '@audius/harmony'
import { Link } from 'react-router'

import { make, useRecord } from 'common/store/analytics/actions'
import { SignOnLink } from 'components/SignOnLink'

import { useNavSidebar } from './NavSidebarContext'

const { SIGN_UP_PAGE } = route

const messages = {
  signUp: 'Sign up',
  uploadTrack: 'Upload Track',
  uploading: 'Uploading...',
  finishSignUp: 'Finish Signing Up',
  signUpLabel: 'Create an account',
  finishSignUpLabel: 'Finish signing up'
}

export const LeftNavCTA = () => {
  const record = useRecord()
  const { isCollapsed } = useNavSidebar()
  const isSignedIn = useHasAccount()
  const { data: accountStatus } = useAccountStatus()
  const { data: hasCompletedAccount } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })
  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })

  let status = 'signedOut'
  if (isSignedIn) status = 'signedIn'
  if (accountStatus === Status.LOADING) status = 'loading'
  if (!hasCompletedAccount && guestEmail) status = 'guest'

  const handleSignup = useCallback(() => {
    record(make(Name.CREATE_ACCOUNT_OPEN, { source: 'nav button' }))
  }, [record])

  if (status === 'signedIn' || status === 'uploading' || status === 'loading') {
    return null
  }

  if (isCollapsed) {
    if (status === 'guest') {
      return (
        <Box ph='xs' pb='s' w='100%'>
          <Button
            variant='primary'
            size='xs'
            asChild
            fullWidth
            css={{ fontSize: 12 }}
          >
            <SignOnLink signUp>{messages.finishSignUp}</SignOnLink>
          </Button>
        </Box>
      )
    }
    return (
      <Box ph='xs' pb='s' w='100%'>
        <Button
          variant='primary'
          size='xs'
          asChild
          fullWidth
          onClick={handleSignup}
          css={{ fontSize: 12 }}
        >
          <Link to={SIGN_UP_PAGE}>{messages.signUp}</Link>
        </Button>
      </Box>
    )
  }

  if (status === 'guest') {
    return (
      <Box p='l' w='100%'>
        <Button
          variant='primary'
          size='small'
          asChild
          iconRight={IconArrowRight}
          fullWidth
        >
          <SignOnLink signUp>{messages.finishSignUp}</SignOnLink>
        </Button>
      </Box>
    )
  }

  return (
    <Box p='l' w='100%'>
      <Button
        variant='primary'
        size='small'
        asChild
        iconRight={IconArrowRight}
        fullWidth
        onClick={handleSignup}
      >
        <Link to={SIGN_UP_PAGE}>{messages.signUp}</Link>
      </Button>
    </Box>
  )
}
