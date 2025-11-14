import { useCallback } from 'react'

import {
  useCurrentUserId,
  useTransferEthToSol,
  useUser,
  useWalletAudioBalance
} from '@audius/common/api'
import { Chain } from '@audius/common/models'
import { toastActions } from '@audius/common/store'
import { AUDIO } from '@audius/fixed-decimal'
import {
  Button,
  IconArrowRight,
  IconLogoCircleETH,
  Text
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import SettingsCard from './SettingsCard'

const { toast } = toastActions

const messages = {
  title: 'Convert AUDIO to Solana',
  description:
    'Convert your Ethereum AUDIO tokens to Solana wAUDIO. This is a one-time conversion. Audius covers all fees.',
  buttonText: 'Convert to Solana',
  buttonTextConverting: 'Converting...',
  ethBalance: 'ETH AUDIO Balance',
  noBalance: 'No ETH AUDIO to convert',
  loading: 'Loading...',
  success: 'Successfully converted AUDIO to Solana',
  error: 'Conversion failed'
}

export const WormholeConversionSettingsCard = () => {
  const dispatch = useDispatch()
  const { data: currentUserId } = useCurrentUserId()
  const { data: user } = useUser(currentUserId)

  const { data: ethBalance, isPending: isBalanceLoading } =
    useWalletAudioBalance(
      {
        address: user?.erc_wallet ?? '',
        chain: Chain.Eth
      },
      { enabled: !!user?.erc_wallet }
    )

  const { mutate: transferEthToSol, isPending: isConverting } =
    useTransferEthToSol()

  const hasBalance = ethBalance && ethBalance > BigInt(0)

  const handleConvert = useCallback(() => {
    if (!hasBalance || isConverting || !user?.erc_wallet) return

    transferEthToSol(
      { ethAddress: user.erc_wallet },
      {
        onSuccess: () => {
          dispatch(
            toast({
              content: messages.success,
              type: 'info'
            })
          )
        },
        onError: (error) => {
          dispatch(
            toast({
              content: `${messages.error}: ${error instanceof Error ? error.message : String(error)}`,
              type: 'error'
            })
          )
        }
      }
    )
  }, [dispatch, hasBalance, isConverting, user?.erc_wallet, transferEthToSol])

  const formattedBalance = ethBalance
    ? AUDIO(ethBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '0'

  const isButtonDisabled = !hasBalance || isConverting || isBalanceLoading

  return (
    <SettingsCard
      icon={<IconLogoCircleETH />}
      title={messages.title}
      description={messages.description}
    >
      <div>
        {isBalanceLoading ? (
          <Text variant='body' strength='weak'>
            {messages.loading}
          </Text>
        ) : (
          <Text variant='body' strength='default'>
            {messages.ethBalance}: {formattedBalance} $AUDIO
          </Text>
        )}
      </div>
      <Button
        variant='primary'
        onClick={handleConvert}
        fullWidth
        disabled={isButtonDisabled}
        iconRight={isConverting ? undefined : IconArrowRight}
      >
        {isConverting ? messages.buttonTextConverting : messages.buttonText}
      </Button>
    </SettingsCard>
  )
}
