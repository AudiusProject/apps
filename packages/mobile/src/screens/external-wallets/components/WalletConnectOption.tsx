import type { ReactNode } from 'react'

import { TouchableOpacity, View } from 'react-native'

import { Text } from 'app/components/core'
import { makeStyles } from 'app/styles'

const useStyles = makeStyles(({ spacing }) => ({
  wallet: {
    flexBasis: '45%',
    marginTop: spacing(6),
    marginBottom: spacing(4),
    alignItems: 'center'
  },
  walletIcon: {
    display: 'flex',
    height: 64,
    width: 64,
    marginBottom: spacing(2)
  },
  description: {
    marginTop: spacing(1),
    textAlign: 'center'
  }
}))

type WalletOptionProps = {
  name: string
  icon: ReactNode
  description?: string
  onPress: () => void
}

export const WalletConnectOption = (props: WalletOptionProps) => {
  const { name, icon, description, onPress } = props
  const styles = useStyles()
  return (
    <TouchableOpacity style={styles.wallet} onPress={onPress}>
      <View style={styles.walletIcon}>{icon}</View>
      <Text fontSize='medium'>{name}</Text>
      {description ? (
        <Text fontSize='small' color='neutralLight4' style={styles.description}>
          {description}
        </Text>
      ) : null}
    </TouchableOpacity>
  )
}
