import { useCallback } from 'react'

import { cacheUsersSelectors, tippingActions } from '@audius/common/store'
import { Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconTokenGold, Button } from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

import { useSelectProfile } from './selectors'
const { beginTip } = tippingActions
const { getUser } = cacheUsersSelectors

const messages = {
  title: 'Tip $AUDIO',
  // NOTE: Send tip -> Send $AUDIO change
  titleAlt: 'Send $AUDIO', // iOS only
  label: 'Tip Audio tokens',
  labelAlt: 'Send Audio tokens' // iOS only
}

const useStyles = makeStyles(() => ({
  text: {
    fontSize: 16
  }
}))

export const TipAudioButton = () => {
  const navigation = useNavigation()
  const { user_id } = useSelectProfile(['user_id'])
  const user = useSelector((state) => getUser(state, { id: user_id }))
  const dispatch = useDispatch()

  const handlePress = useCallback(() => {
    dispatch(beginTip({ user, source: 'profile' }))
    navigation.navigate('TipArtist')
  }, [dispatch, user, navigation])

  const styles = useStyles()

  return (
    <Button
      variant='primary'
      accessibilityLabel={
        Platform.OS === 'ios' ? messages.labelAlt : messages.label
      }
      iconLeft={IconTokenGold}
      fullWidth
      onPress={handlePress}
      styles={{
        text: styles.text
      }}
    >
      {Platform.OS === 'ios' ? messages.titleAlt : messages.title}
    </Button>
  )
}
