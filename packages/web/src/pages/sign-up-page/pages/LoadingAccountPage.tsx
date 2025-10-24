import { useEffect } from 'react'

import { route } from '@audius/common/utils'
import { Flex } from '@audius/harmony'
import { useSelector } from 'react-redux'

import { getStatus, getAccountReady } from 'common/store/pages/signon/selectors'
import { EditingStatus } from 'common/store/pages/signon/types'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { Heading, Page } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'

const { SIGN_UP_COMPLETED_REDIRECT } = route

const messages = {
  heading: 'Your Account is Almost Ready to Rock 🤘',
  description: "We're just finishing up a few things..."
}

// This loading page shows up when the users account is still being created either due to slow creation or a fast user
// The user just waits here until the account is created and before being shown the welcome modal on the trending page
export const LoadingAccountPage = () => {
  const navigate = useNavigateToPage()
  const isFastReferral = useFastReferral()
  const accountReady = useSelector(getAccountReady)
  const accountCreationStatus = useSelector(getStatus)

  const isAccountReady = isFastReferral
    ? accountReady
    : accountReady || accountCreationStatus === EditingStatus.SUCCESS

  useEffect(() => {
    if (isAccountReady) {
      navigate(SIGN_UP_COMPLETED_REDIRECT)
    }
    // TODO: what to do in an error scenario? Any way to recover to a valid step?
  }, [navigate, isAccountReady])

  return (
    <Page gap='3xl' justifyContent='center' alignItems='center' pb='3xl'>
      <LoadingSpinner css={{ height: '72px' }} />
      <Flex justifyContent='center' css={{ textAlign: 'center' }}>
        <Heading
          heading={messages.heading}
          description={messages.description}
        />
      </Flex>
    </Page>
  )
}
