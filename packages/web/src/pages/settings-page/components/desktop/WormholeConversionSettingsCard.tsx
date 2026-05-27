import { useCallback, useEffect } from 'react'

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
  Box,
  Button,
  IconArrowRight,
  IconLogoCircleETH,
  Text,
  Tooltip
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useLocalStorage } from 'react-use'

import SettingsCard from './SettingsCard'

const { toast } = toastActions

const messages = {
  title: 'MIGRATE $AUDIO TO SOLANA',
  description:
    'Migrate your built-in $AUDIO tokens from Ethereum to Solana to regain access to in-app features and Buy/Sell/Send functionality with your balance. This is a one-time conversion for users with a built-in ERC-20 $AUDIO balance prior to February 2022.',
  buttonText: 'Migrate to Solana',
  buttonTextConverting: 'Migrating…',
  ethBalance: 'ERC-20 $AUDIO Balance',
  noBalance: 'No ERC-20 $AUDIO to migrate',
  loading: 'Loading...',
  migrationInProgress: 'Migration in progress',
  success: 'Migration transaction sent!',
  error: 'Migration failed, please try again',
  tooltip:
    'The migration process usually takes 60 minutes to complete. You can navigate away, and your balance will automatically return to your built-in wallet upon completion.'
}

const WORMHOLE_MIGRATION_STARTED_KEY = 'wormholeMigrationCompleted'
const WORMHOLE_MIGRATION_STARTED_TTL_MS = 24 * 60 * 60 * 1000

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

  const [migrationStartedAt, setMigrationStartedAt, removeMigrationStartedAt] =
    useLocalStorage<number | boolean | null>(
      WORMHOLE_MIGRATION_STARTED_KEY,
      null
    )

  const hasBalance = ethBalance && ethBalance > BigInt(0)
  const isLegacyMigrationStarted = migrationStartedAt === true
  const migrationStartedAtMs =
    typeof migrationStartedAt === 'number' ? migrationStartedAt : null
  const isMigrationInProgress =
    isLegacyMigrationStarted ||
    (migrationStartedAtMs !== null &&
      Date.now() - migrationStartedAtMs <= WORMHOLE_MIGRATION_STARTED_TTL_MS)

  useEffect(() => {
    if (isLegacyMigrationStarted) {
      setMigrationStartedAt(Date.now())
    } else if (migrationStartedAtMs !== null && !isMigrationInProgress) {
      removeMigrationStartedAt()
    }
  }, [
    isLegacyMigrationStarted,
    isMigrationInProgress,
    migrationStartedAtMs,
    removeMigrationStartedAt,
    setMigrationStartedAt
  ])

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
          setMigrationStartedAt(Date.now())
        },
        onError: (error) => {
          dispatch(
            toast({
              content: messages.error,
              type: 'error'
            })
          )
          console.error('Error converting AUDIO to Solana', error)
        }
      }
    )
  }, [
    hasBalance,
    isConverting,
    user?.erc_wallet,
    transferEthToSol,
    dispatch,
    setMigrationStartedAt
  ])

  const formattedBalance = ethBalance
    ? AUDIO(ethBalance).toLocaleString('en-US', { maximumFractionDigits: 2 })
    : '0'

  const isButtonDisabled =
    !hasBalance || isConverting || isBalanceLoading || isMigrationInProgress

  if (!hasBalance && !isMigrationInProgress) {
    return null
  }

  return (
    <SettingsCard
      icon={<IconLogoCircleETH color='accent' />}
      title={messages.title}
      description={messages.description}
    >
      <Box>
        {isBalanceLoading ? (
          <Text variant='body' strength='weak'>
            {messages.loading}
          </Text>
        ) : (
          <Text variant='body' strength='default'>
            {messages.ethBalance}: {formattedBalance} $AUDIO
          </Text>
        )}
      </Box>
      <Tooltip text={messages.tooltip} placement='top'>
        <Box>
          <Button
            variant='secondary'
            onClick={handleConvert}
            fullWidth
            disabled={isButtonDisabled}
            iconRight={
              isConverting || isMigrationInProgress ? undefined : IconArrowRight
            }
          >
            {isConverting
              ? messages.buttonTextConverting
              : isMigrationInProgress
                ? messages.migrationInProgress
                : messages.buttonText}
          </Button>
        </Box>
      </Tooltip>
    </SettingsCard>
  )
}
