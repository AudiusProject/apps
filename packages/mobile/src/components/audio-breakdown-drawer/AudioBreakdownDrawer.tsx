import {
  useAudioBalance,
  useAssociatedWallets,
  useWalletAudioBalances
} from '@audius/common/api'
import { formatNumberCommas } from '@audius/common/utils'
import { AUDIO } from '@audius/fixed-decimal'

import { Divider, Flex, spacing, Text } from '@audius/harmony-native'
import { GradientText } from 'app/components/core'
import { AppDrawer } from 'app/components/drawer'

import { Wallet } from './Wallet'

const AUDIO_BREAKDOWN_MODAL_NAME = 'AudioBreakdown'

const messages = {
  modalTitle: '$AUDIO BREAKDOWN',
  total: 'TOTAL $AUDIO',
  audiusWallet: 'AUDIUS WALLET',
  audiusWalletDescription: 'You can use this $AUDIO throughout the app',
  linkedWallets: 'LINKED WALLETS',
  linkedWalletsDescription:
    'Linked wallets are more secure but not all features are supported',
  linkedWalletsTooltip:
    'Linked wallets affect VIP status and NFTs. Upcoming features may require different behavior to support linked wallets. ',
  audio: '$AUDIO'
}

export const AudioBreakdownDrawer = () => {
  const { accountBalance, connectedWalletsBalance, totalBalance } =
    useAudioBalance()

  const { data: connectedWallets = [] } = useAssociatedWallets()
  const connectedWalletsBalances = useWalletAudioBalances({
    wallets: connectedWallets
  })

  return (
    <AppDrawer
      modalName={AUDIO_BREAKDOWN_MODAL_NAME}
      title={messages.modalTitle}
      isFullscreen
    >
      <Flex alignItems='center' p='xl' pt='l' gap='xl'>
        <Flex gap='s'>
          <GradientText style={{ fontSize: spacing.unit12 }}>
            {formatNumberCommas(
              AUDIO(totalBalance).trunc().toLocaleString('en-US', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              })
            )}
          </GradientText>

          <Text variant='title' size='l' color='subdued'>
            {messages.total}
          </Text>
        </Flex>

        <Flex
          p='xl'
          borderRadius='l'
          border='strong'
          backgroundColor='surface1'
        >
          <Flex row justifyContent='center'>
            <Text variant='title' size='l'>
              {messages.audiusWallet}
            </Text>

            <GradientText style={{ marginLeft: spacing.m, fontSize: 18 }}>
              {formatNumberCommas(
                AUDIO(accountBalance).trunc().toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              )}
            </GradientText>
          </Flex>

          <Flex mt='l'>
            <Text variant='label' size='s' color='subdued' textAlign='center'>
              {messages.audiusWalletDescription}
            </Text>
          </Flex>
        </Flex>

        <Flex
          p='xl'
          borderRadius='l'
          border='strong'
          backgroundColor='surface1'
          gap='l'
        >
          <Flex row justifyContent='center'>
            <Text variant='title' size='l'>
              {messages.linkedWallets}
            </Text>

            <GradientText style={{ marginLeft: spacing.m, fontSize: 18 }}>
              {formatNumberCommas(
                AUDIO(connectedWalletsBalance).trunc().toLocaleString('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0
                })
              )}
            </GradientText>
          </Flex>

          <Flex row justifyContent='space-between'>
            <Text variant='label' color='subdued'>
              {messages.linkedWallets}
            </Text>
            <Text variant='label' color='subdued'>
              {messages.audio}
            </Text>
          </Flex>

          <Divider orientation='horizontal' />

          {connectedWalletsBalances.data.map((res) =>
            res.balance ? (
              <Wallet
                chain={res.chain}
                key={res.address}
                address={res.address}
                balance={res.balance}
              />
            ) : null
          )}

          <Text variant='label' size='s' color='subdued' textAlign='center'>
            {messages.linkedWalletsDescription}
          </Text>
        </Flex>
      </Flex>
    </AppDrawer>
  )
}
