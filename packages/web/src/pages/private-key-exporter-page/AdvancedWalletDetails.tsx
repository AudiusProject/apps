import { useCallback, useContext, useEffect, useState } from 'react'

import {
  useCurrentAccountUser,
  useCurrentUserId,
  useQueryContext
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import { Nullable, shortenSPLAddress } from '@audius/common/utils'
import { Flex, Box, Divider, IconCopy, Text, useTheme } from '@audius/harmony'
import pkg from 'bs58'

import { make, useRecord } from 'common/store/analytics/actions'
import { ToastContext } from 'components/toast/ToastContext'
import { useIsMobile } from 'hooks/useIsMobile'
import { copyToClipboard } from 'utils/clipboardUtil'

const messages = {
  advancedWalletDetails: 'Advanced Wallet Details',
  solanaWallet: 'Solana Wallet',
  ethereumWallet: 'Ethereum Wallet',
  address: 'ADDRESS',
  privateKey: 'PRIVATE KEY',
  copied: 'Copied to Clipboard!'
}

type KeyProps = {
  label: string
  value: string
  isPrivate?: boolean
}

const Key = ({ label, value, isPrivate }: KeyProps) => {
  const { color } = useTheme()
  const { toast } = useContext(ToastContext)
  const record = useRecord()
  const isMobile = useIsMobile()
  const { data: accountHandle } = useCurrentAccountUser({
    select: (user) => user?.handle
  })
  const { data: accountUserId } = useCurrentUserId()
  const handleClick = useCallback(() => {
    copyToClipboard(value)
    if (accountHandle && accountUserId) {
      if (isPrivate) {
        record(
          make(Name.EXPORT_PRIVATE_KEY_PRIVATE_KEY_COPIED, {
            handle: accountHandle,
            userId: accountUserId
          })
        )
      } else {
        record(
          make(Name.EXPORT_PRIVATE_KEY_PUBLIC_ADDRESS_COPIED, {
            handle: accountHandle,
            userId: accountUserId
          })
        )
      }
    }
    toast(messages.copied)
  }, [value, accountHandle, accountUserId, isPrivate, record, toast])
  return (
    <Flex
      border='strong'
      borderRadius='m'
      backgroundColor='surface1'
      css={{ borderWidth: 1, cursor: 'pointer' }}
      onClick={handleClick}
    >
      <Flex justifyContent='center' alignItems='center' css={{ width: 150 }}>
        <Text variant='title' css={{ color: color.neutral.n600 }}>
          {label}
        </Text>
      </Flex>
      <Divider orientation='vertical' />
      <Box p='xl' css={isMobile ? {} : { width: 464 }}>
        <Text variant='body'>
          {isPrivate
            ? shortenSPLAddress(value, isMobile ? 4 : 18)
            : isMobile
              ? shortenSPLAddress(value, 4)
              : value}
        </Text>
      </Box>
      <Divider orientation='vertical' />
      <Box p='xl' css={{ width: 64 }}>
        <IconCopy width={16} height={16} color='default' />
      </Box>
    </Flex>
  )
}

export const AdvancedWalletDetails = () => {
  const [solanaPublicKey, setSolanaPublicKey] = useState<Nullable<string>>(null)
  const [solanaEncodedPrivateKey, setSolanaEncodedPrivateKey] =
    useState<Nullable<string>>(null)
  const [ethAddress, setEthAddress] = useState<Nullable<string>>(null)
  const [ethPrivateKey, setEthPrivateKey] = useState<Nullable<string>>(null)
  const { solanaWalletService, authService } = useQueryContext()

  useEffect(() => {
    const fetchKeypair = async () => {
      // Fetch Solana wallet details
      const solanaKeypair = await solanaWalletService.getKeypair()
      if (solanaKeypair) {
        setSolanaPublicKey(solanaKeypair.publicKey.toString())
        setSolanaEncodedPrivateKey(pkg.encode(solanaKeypair.secretKey))
      }

      // Fetch Ethereum wallet details
      const hedgehogWallet = authService.getWallet()
      if (hedgehogWallet) {
        setEthAddress(hedgehogWallet.getAddressString())
        setEthPrivateKey(hedgehogWallet.getPrivateKeyString())
      }
    }
    fetchKeypair()
  }, [solanaWalletService, authService])

  if (!solanaPublicKey || !solanaEncodedPrivateKey || !ethAddress || !ethPrivateKey) {
    return null
  }

  return (
    <Flex direction='column' gap='l' pv='xl'>
      <Text variant='heading' size='s'>
        {messages.advancedWalletDetails}
      </Text>

      {/* Solana Wallet */}
      <Text variant='title' size='s'>
        {messages.solanaWallet}
      </Text>
      <Key label={messages.address} value={solanaPublicKey} />
      <Key label={messages.privateKey} value={solanaEncodedPrivateKey} isPrivate />

      {/* Ethereum Wallet */}
      <Text variant='title' size='s' mt='l'>
        {messages.ethereumWallet}
      </Text>
      <Key label={messages.address} value={ethAddress} />
      <Key label={messages.privateKey} value={ethPrivateKey} isPrivate />
    </Flex>
  )
}
