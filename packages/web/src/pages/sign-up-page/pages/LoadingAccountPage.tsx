import { useCallback, useEffect } from 'react'

import { route } from '@audius/common/utils'
import { Button, Flex } from '@audius/harmony'
import { useDispatch, useSelector } from 'react-redux'

import { signUp } from 'common/store/pages/signon/actions'
import { getStatus, getAccountReady } from 'common/store/pages/signon/selectors'
import { EditingStatus } from 'common/store/pages/signon/types'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { Heading, Page } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'

const { SIGN_UP_COMPLETED_REDIRECT } = route

const messages = {
  heading: 'Your Account is Almost Ready to Rock 🤘',
  description: "We're just finishing up a few things...",
  failureHeading: "We Couldn't Finish Creating Your Account",
  failureDescription:
    'Your login is saved. Try again to finish creating your account.',
  retry: 'Try Again'
}

// This loading page shows up when the users account is still being created either due to slow creation or a fast user
// The user just waits here until the account is created and before being shown the welcome modal on the trending page
export const LoadingAccountPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigateToPage()
  const isFastReferral = useFastReferral()
  const accountReady = useSelector(getAccountReady)
  const accountCreationStatus = useSelector(getStatus)

  const isAccountReady = isFastReferral
    ? accountReady
    : accountReady || accountCreationStatus === EditingStatus.SUCCESS
  const didAccountCreationFail = accountCreationStatus === EditingStatus.FAILURE

  const handleRetry = useCallback(() => {
    dispatch(signUp())
  }, [dispatch])

  useEffect(() => {
    if (isAccountReady) {
      navigate(SIGN_UP_COMPLETED_REDIRECT)
    }
  }, [navigate, isAccountReady])

  return (
    <Page gap='3xl' justifyContent='center' alignItems='center' pb='3xl'>
      {didAccountCreationFail ? null : (
        <LoadingSpinner css={{ height: '72px' }} />
      )}
      <Flex justifyContent='center' css={{ textAlign: 'center' }}>
        <Heading
          heading={
            didAccountCreationFail ? messages.failureHeading : messages.heading
          }
          description={
            didAccountCreationFail
              ? messages.failureDescription
              : messages.description
          }
        />
      </Flex>
      {didAccountCreationFail ? (
        <Button variant='primary' onClick={handleRetry}>
          {messages.retry}
        </Button>
      ) : null}
    </Page>
  )
}
