import { useCallback } from 'react'

import { Button, IconMoneyBracket } from '@audius/harmony'

import { useModalState } from 'common/hooks/useModalState'

import SettingsCard from '../SettingsCard'

const messages = {
  title: 'Payout Wallet',
  description:
    'Automatically send USDC earned on Audius to an external Solana wallet.',
  buttonText: 'Update Payout Wallet'
}

export const PayoutWalletSettingsCard = () => {
  const [, setIsModalOpen] = useModalState('PayoutWallet')

  const handleOpen = useCallback(() => {
    setIsModalOpen(true)
  }, [setIsModalOpen])

  return (
    <>
      <SettingsCard
        icon={<IconMoneyBracket color='accent' />}
        title={messages.title}
        description={messages.description}
      >
        <Button variant='secondary' onClick={handleOpen} fullWidth>
          {messages.buttonText}
        </Button>
      </SettingsCard>
    </>
  )
}
