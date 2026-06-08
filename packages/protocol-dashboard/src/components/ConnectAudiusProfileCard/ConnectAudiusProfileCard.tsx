import { Box, Flex, Text } from '@audius/harmony'
import { useWeb3ModalProvider } from '@web3modal/ethers/react'

import Button, { ButtonType } from 'components/Button'
import { Card } from 'components/Card/Card'
import { ConnectAudiusProfileModal } from 'components/ConnectAudiusProfileModal/ConnectAudiusProfileModal'
import { useDashboardWalletUser } from 'hooks/useDashboardWalletUsers'
import { useAccountUser } from 'store/account/hooks'
import { useModalControls } from 'utils/hooks'

const messages = {
  connectAudiusProfile: 'Connect Audius Profile',
  connectAudius: 'Connect Audius',
  connectAudiusProfileDescription:
    'Help other users identify you by connecting your Audius account.',
  unlinkAudiusProfile: 'Unlink',
  audiusProfile: 'Audius Profile'
}

type ConnectAudiusProtileBtnProps = {
  wallet: string
  walletProvider?: any
}
const ConnectAudiusProfileButton = ({
  wallet,
  walletProvider
}: ConnectAudiusProtileBtnProps) => {
  const { isOpen, onClick, onClose } = useModalControls()
  return (
    <>
      <Button
        onClick={onClick}
        type={ButtonType.PRIMARY}
        text={messages.connectAudius}
      />
      <ConnectAudiusProfileModal
        wallet={wallet}
        walletProvider={walletProvider}
        isOpen={isOpen}
        onClose={onClose}
        action='connect'
      />
    </>
  )
}

export const ConnectAudiusProfileCard = () => {
  const { user: accountUser } = useAccountUser()
  const { walletProvider } = useWeb3ModalProvider()
  const { data: audiusProfileData, status: audiusProfileDataStatus } =
    useDashboardWalletUser(accountUser?.wallet)

  const hasConnectedAudiusAccount = audiusProfileData != null

  if (
    !accountUser?.wallet ||
    audiusProfileDataStatus !== 'success' ||
    hasConnectedAudiusAccount
  ) {
    return null
  }

  return (
    <Card gap='xl' pv='l' ph='xl'>
      <Flex direction='column' gap='s' css={{ flexGrow: 1 }}>
        <Text variant='heading' size='s'>
          {messages.connectAudiusProfile}
        </Text>
        <Text variant='body' size='m' strength='strong' color='subdued'>
          {messages.connectAudiusProfileDescription}
        </Text>
      </Flex>
      <Box>
        <ConnectAudiusProfileButton
          wallet={accountUser.wallet}
          walletProvider={walletProvider}
        />
      </Box>
    </Card>
  )
}
