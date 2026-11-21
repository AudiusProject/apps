import { wait } from '@audius/common/utils'
import NetInfo from '@react-native-community/netinfo'
import { View } from 'react-native'
import { useAsyncFn } from 'react-use'

import {
  IconNoWifi,
  Text,
  IconRefresh,
  Button,
  Flex
} from '@audius/harmony-native'
import { Tile } from 'app/components/core'
import { makeStyles } from 'app/styles'
import { useThemeColors } from 'app/utils/theme'

const messages = {
  reloading: (isReloading: boolean) =>
    isReloading ? 'Reloading...' : 'Reload',
  title: `You're Offline`,
  subtitle: `We Couldn't Load the Page.\nConnect to the Internet and Try Again.`
}

const useStyles = makeStyles(({ typography, spacing }) => ({
  root: {
    padding: spacing(4),
    paddingBottom: spacing(0),
    margin: spacing(3)
  }
}))

export type OfflinePlaceholderProps = {
  unboxed?: boolean
}

export const OfflinePlaceholder = (props: OfflinePlaceholderProps) => {
  const { unboxed } = props
  const styles = useStyles()
  const [{ loading: isRefreshing }, handleRefresh] = useAsyncFn(async () => {
    return await Promise.all([NetInfo.refresh(), wait(800)])
  })

  const { neutralLight4 } = useThemeColors()

  const body = (
    <Flex justifyContent='center' alignItems='center' gap='l' pv='l'>
      <IconNoWifi height={80} width={80} fill={neutralLight4} />
      <Text variant='heading' size='l'>
        {messages.title}
      </Text>
      <Text variant='body' size='m' textAlign='center'>
        {messages.subtitle}
      </Text>
      <Button
        disabled={isRefreshing}
        fullWidth
        iconLeft={IconRefresh}
        onPress={handleRefresh}
      >
        {messages.reloading(isRefreshing)}
      </Button>
    </Flex>
  )

  return unboxed ? (
    <View style={styles.root}>{body}</View>
  ) : (
    <Tile styles={{ tile: styles.root }}>{body}</Tile>
  )
}
