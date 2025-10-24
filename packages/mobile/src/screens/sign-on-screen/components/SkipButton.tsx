import { useCallback } from 'react'

import { skipButtonMessages } from '@audius/common/messages'
import { signUp } from '@audius/web/src/common/store/pages/signon/actions'
import { useDispatch } from 'react-redux'

import { Button } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'

import type { SignOnScreenParamList } from '../types'

export const SkipButton = () => {
  const navigation = useNavigation<SignOnScreenParamList>()
  const dispatch = useDispatch()

  const handleSkip = useCallback(() => {
    // User is skipping genre/artist selection, create account now
    dispatch(signUp())
    navigation.navigate('AccountLoading')
  }, [dispatch, navigation])

  return (
    <Button variant='secondary' fullWidth onPress={handleSkip}>
      {skipButtonMessages.skipThisStep}
    </Button>
  )
}
