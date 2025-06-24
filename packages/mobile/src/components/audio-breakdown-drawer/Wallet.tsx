import { useCallback } from 'react'

import { Chain } from '@audius/common/models'
import { shortenSPLAddress, shortenEthAddress } from '@audius/common/utils'
import { AUDIO } from '@audius/fixed-decimal'
import Clipboard from '@react-native-clipboard/clipboard'
import { Animated, TouchableWithoutFeedback, View } from 'react-native'

import { IconCopy } from '@audius/harmony-native'
import { ChainLogo, Text } from 'app/components/core'
import { usePressScaleAnimation } from 'app/hooks/usePressScaleAnimation'
import { useToast } from 'app/hooks/useToast'
import { makeStyles } from 'app/styles'

const messages = {
  copied: 'Copied To Clipboard!'
}

const useSyles = makeStyles(({ palette, spacing }) => ({
  walletRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing(3),
    paddingBottom: spacing(2)
  },
  linkedWallet: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  walletAddress: {
    marginLeft: spacing(4),
    fontSize: 14
  },
  linkedAmount: {
    fontSize: 14
  },
  copyIcon: {
    marginLeft: 10
  }
}))

type WalletProps = { chain: Chain; address: string; balance: bigint }

export const Wallet = (props: WalletProps) => {
  const { chain, address, balance } = props
  const styles = useSyles()
  const { toast } = useToast()

  const { scale, handlePressIn, handlePressOut } = usePressScaleAnimation(0.98)

  const displayAddress =
    chain === Chain.Eth ? shortenEthAddress : shortenSPLAddress

  const handleCopy = useCallback(() => {
    Clipboard.setString(address)
    toast({ content: messages.copied, type: 'info' })
  }, [address, toast])

  return (
    <View style={styles.walletRow}>
      <Animated.View style={[{ transform: [{ scale }] }]}>
        <TouchableWithoutFeedback
          onPress={handleCopy}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          <View style={styles.linkedWallet}>
            <ChainLogo chain={chain} />
            <Text style={styles.walletAddress} weight='demiBold'>
              {displayAddress(address)}
            </Text>
            <IconCopy style={styles.copyIcon} size='s' color='subdued' />
          </View>
        </TouchableWithoutFeedback>
      </Animated.View>
      <Text style={styles.linkedAmount} weight='demiBold'>
        {AUDIO(balance).toLocaleString()}
      </Text>
    </View>
  )
}
