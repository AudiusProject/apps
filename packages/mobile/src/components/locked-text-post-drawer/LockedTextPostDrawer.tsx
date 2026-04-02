import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import { View } from 'react-native'

import { Button, Flex, IconLock, Text } from '@audius/harmony-native'
import { NativeDrawer } from 'app/components/drawer'
import { useDrawer } from 'app/hooks/useDrawer'
import { useNavigation } from 'app/hooks/useNavigation'
import { makeStyles, flexRowCentered } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useColor } from 'app/utils/theme'

const DRAWER_NAME = 'LockedTextPost'

const messages = {
  howToUnlock: 'HOW TO UNLOCK',
  description: 'To unlock this post, you need to hold',
  buyCoins: 'Buy Coins'
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  drawer: {
    paddingVertical: spacing(6),
    alignItems: 'center',
    backgroundColor: palette.white,
    paddingHorizontal: spacing(4),
    gap: spacing(6)
  },
  titleContainer: {
    ...flexRowCentered(),
    justifyContent: 'center',
    paddingBottom: spacing(4),
    gap: spacing(2),
    borderBottomColor: palette.neutralLight8,
    borderBottomWidth: 1,
    width: '100%'
  }
}))

export const LockedTextPostDrawer = () => {
  const styles = useStyles()
  const neutralLight2 = useColor('neutralLight2')
  const navigation = useNavigation()
  const { data, onClose } = useDrawer('LockedTextPost')
  const mint = (data as { mint: string } | undefined)?.mint
  const { data: coin } = useArtistCoin(mint)

  const handleBuyCoins = useCallback(() => {
    if (coin?.ticker) {
      onClose()
      navigation.navigate('BuySell', {
        initialTab: 'buy',
        coinTicker: coin.ticker
      })
    }
  }, [coin?.ticker, navigation, onClose])

  return (
    <NativeDrawer drawerName={DRAWER_NAME}>
      <View style={styles.drawer}>
        <View style={styles.titleContainer}>
          <IconLock
            fill={neutralLight2}
            width={spacing(6)}
            height={spacing(6)}
          />
          <Text
            variant='label'
            size='xl'
            strength='strong'
            color='subdued'
          >
            {messages.howToUnlock}
          </Text>
        </View>
        <Flex column gap='l' w='100%' alignItems='center' ph='l'>
          <Text variant='body' size='l' textAlign='center'>
            {messages.description}{' '}
            <Text variant='body' size='l' strength='strong'>
              {coin?.ticker ? `$${coin.ticker}` : "the artist's coins"}
            </Text>
            .
          </Text>
          <Button
            variant='primary'
            color='coinGradient'
            fullWidth
            onPress={handleBuyCoins}
          >
            {messages.buyCoins}
          </Button>
        </Flex>
      </View>
    </NativeDrawer>
  )
}
