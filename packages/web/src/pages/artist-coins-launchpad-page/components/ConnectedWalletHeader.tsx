import { shortenSPLAddress } from '@audius/common/utils'
import {
  Flex,
  IconPhantom,
  IconMetamask,
  IconSolana,
  Text
} from '@audius/harmony'

type WalletIconComponent =
  | typeof IconPhantom
  | typeof IconMetamask
  | typeof IconSolana

const getWalletIcon = (): WalletIconComponent => {
  // Check if Phantom is available
  if (typeof window !== 'undefined' && window.phantom) {
    return IconPhantom
  }
  if (typeof window !== 'undefined' && window.ethereum) {
    return IconMetamask
  }
  return IconSolana // Fallback
}

export const ConnectedWalletHeader = ({
  connectedWalletAddress
}: {
  connectedWalletAddress: string
}) => {
  const WalletIcon = getWalletIcon()
  return (
    <Flex gap='s' alignItems='center' justifyContent='flex-end' w='100%'>
      <Text variant='body' size='m' color='subdued'>
        Connected Wallet
      </Text>
      <Flex direction='column' gap='xs' alignItems='flex-start'>
        <Flex
          backgroundColor='surface1'
          border='default'
          borderRadius='3xl'
          pl='xs'
          pr='s'
          pv='xs'
          gap='xs'
          alignItems='center'
        >
          <Flex
            w={24}
            h={24}
            borderRadius='3xl'
            backgroundColor='white'
            alignItems='center'
            justifyContent='center'
          >
            <WalletIcon size='l' />
          </Flex>
          <Text variant='body' size='m' strength='strong' ellipses>
            {shortenSPLAddress(connectedWalletAddress)}
          </Text>
        </Flex>
      </Flex>
    </Flex>
  )
}
