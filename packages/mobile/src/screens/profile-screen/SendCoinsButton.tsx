import { useCallback } from 'react'

import { useProfileUser } from '@audius/common/api'
import { sendTokensModalActions } from '@audius/common/store'
import { useDispatch } from 'react-redux'

import { IconMoneySend, Button } from '@audius/harmony-native'
import { env } from 'app/services/env'

const messages = {
  sendCoins: 'Send Coins'
}

export const SendCoinsButton = () => {
  const dispatch = useDispatch()
  const { user: profileUser } = useProfileUser()

  const handlePress = useCallback(() => {
    dispatch(
      sendTokensModalActions.open({
        mint: env.WAUDIO_MINT_ADDRESS,
        isOpen: true,
        user: profileUser ?? undefined
      })
    )
  }, [dispatch, profileUser])

  return (
    <Button
      iconRight={IconMoneySend}
      variant='secondary'
      size='small'
      onPress={handlePress}
      accessibilityLabel={messages.sendCoins}
    />
  )
}
