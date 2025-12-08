import { useCallback, useEffect } from 'react'

import { tippingSelectors, tippingActions } from '@audius/common/store'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { useKeepAwake } from '@thehale/react-native-keep-awake'
import { Platform } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  Button,
  IconCaretLeft,
  IconCheck,
  PlainButton
} from '@audius/harmony-native'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles } from 'app/styles'

import { ReceiverDetails } from './ReceiverDetails'
import { SendTipStatusText } from './SendTipStatusText'
import { TipHeader } from './TipHeader'
import { TipScreen } from './TipScreen'
import type { TipArtistNavigationParamList } from './navigation'

const { beginTip, confirmSendTip } = tippingActions
const { getSendTipData } = tippingSelectors

const messages = {
  title: 'Confirm Tip',
  // NOTE: Send tip -> Send $AUDIO change
  titleAlt: 'Confirm', // iOS only
  confirm: 'Confirm Tip',
  confirmAlt: 'Confirm', // iOS only
  goBack: 'Go Back'
}

const useStyles = makeStyles(({ spacing }) => ({
  disclaimer: {
    textAlign: 'center',
    marginBottom: spacing(6)
  },
  confirmButton: {
    marginBottom: spacing(6)
  },
  goBack: {
    alignSelf: 'center'
  }
}))

type ConfirmSendTipScreenProps = NativeStackScreenProps<
  TipArtistNavigationParamList,
  'ConfirmTip'
>

export const ConfirmSendTipScreen = ({
  navigation: nativeNavigation
}: ConfirmSendTipScreenProps) => {
  useKeepAwake()
  const styles = useStyles()
  const {
    user: receiver,
    status: sendStatus,
    source
  } = useSelector(getSendTipData)
  const navigation = useNavigation<TipArtistNavigationParamList>()
  const dispatch = useDispatch()

  const handleConfirm = useCallback(() => {
    dispatch(confirmSendTip())
  }, [dispatch])

  const handleGoBack = useCallback(() => {
    dispatch(beginTip({ user: receiver, source }))
    navigation.goBack()
  }, [dispatch, navigation, receiver, source])

  const inProgress = sendStatus === 'SENDING' || sendStatus === 'CONVERTING'

  useEffect(() => {
    if (sendStatus === 'SUCCESS') {
      navigation.navigate('TipSent')
    }
  }, [sendStatus, navigation])

  // Disable navigating back via swipes
  // if we're in progress
  useEffect(() => {
    nativeNavigation.setOptions({
      gestureEnabled: !inProgress
    })
  }, [nativeNavigation, inProgress])

  return (
    <TipScreen
      title={Platform.OS === 'ios' ? messages.titleAlt : messages.title}
      topbarLeft={inProgress ? null : undefined}
    >
      <TipHeader status='confirm' />
      <ReceiverDetails />
      <SendTipStatusText />
      <Button
        variant='primary'
        onPress={handleConfirm}
        isLoading={inProgress}
        iconRight={IconCheck}
        disabled={inProgress}
        fullWidth
        style={styles.confirmButton}
      >
        {Platform.OS === 'ios' ? messages.confirmAlt : messages.confirm}
      </Button>
      {inProgress ? null : (
        <PlainButton
          variant='subdued'
          iconLeft={IconCaretLeft}
          style={styles.goBack}
          onPress={handleGoBack}
          size='large'
        >
          {messages.goBack}
        </PlainButton>
      )}
    </TipScreen>
  )
}
