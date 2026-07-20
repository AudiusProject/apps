// This loading page shows up when the users account is still being created either due to slow creation or a fast user

import { useCallback, useEffect } from 'react'

import {
  finishSignUp,
  signUp
} from '@audius/web/src/common/store/pages/signon/actions'
import {
  getAccountReady,
  getStatus
} from '@audius/web/src/common/store/pages/signon/selectors'
import { EditingStatus } from '@audius/web/src/common/store/pages/signon/types'
import { useDispatch, useSelector } from 'react-redux'

import { Button, Flex } from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { useNavigation } from 'app/hooks/useNavigation'

import { Heading, Page } from '../components/layout'
import { useFastReferral } from '../hooks/useFastReferral'
import type { SignOnScreenParamList } from '../types'

const messages = {
  heading: 'Your Account is Almost Ready to Rock 🤘',
  description: "We're just finishing up a few things...",
  failureHeading: "We Couldn't Finish Creating Your Account",
  failureDescription:
    'Your login is saved. Try again to finish creating your account.',
  retry: 'Try Again'
}

// The user just waits here until the account is created and before being shown the welcome modal on the trending page
export const AccountLoadingScreen = () => {
  const dispatch = useDispatch()
  const navigation = useNavigation<SignOnScreenParamList>()
  const isFastReferral = useFastReferral()
  const accountReady = useSelector(getAccountReady)
  const accountCreationStatus = useSelector(getStatus)

  // Match web's logic: conditional check based on referral type
  const isAccountReady = isFastReferral
    ? accountReady
    : accountReady || accountCreationStatus === EditingStatus.SUCCESS
  const didAccountCreationFail = accountCreationStatus === EditingStatus.FAILURE

  const handleRetry = useCallback(() => {
    dispatch(signUp())
  }, [dispatch])

  useEffect(() => {
    if (isAccountReady) {
      // Mark sign up as finished so RootScreen shows HomeStack
      dispatch(finishSignUp())
      navigation.navigate('HomeStack', { screen: 'Trending' })
    }
  }, [isAccountReady, dispatch, navigation])

  return (
    <Page gap='3xl' justifyContent='center' alignItems='center' pb='3xl'>
      {didAccountCreationFail ? null : (
        <LoadingSpinner style={{ height: 36, width: 36 }} />
      )}
      <Flex justifyContent='center'>
        <Heading
          heading={
            didAccountCreationFail ? messages.failureHeading : messages.heading
          }
          description={
            didAccountCreationFail
              ? messages.failureDescription
              : messages.description
          }
          centered
        />
      </Flex>
      {didAccountCreationFail ? (
        <Button variant='primary' onPress={handleRetry}>
          {messages.retry}
        </Button>
      ) : null}
    </Page>
  )
}
