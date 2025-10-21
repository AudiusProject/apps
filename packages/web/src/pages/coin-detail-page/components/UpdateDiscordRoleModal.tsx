import { useDiscordCode } from '@audius/common/api'
import { AUDIUS_DISCORD_LINK } from '@audius/common/src/utils/route'
import {
  Flex,
  ModalContent,
  Modal,
  ModalTitle,
  ModalHeader,
  ModalFooter,
  Button,
  IconDiscord,
  ModalContentText
} from '@audius/harmony'

import ClickableAddress from 'components/rewards/ClickableAddress'

const messages = {
  copyThisCode: 'COPY THIS CODE',
  discordDescription:
    'To access the private token-holders only Discord channel and/or update your Discord role, copy & paste this code into a DM to the Audius VIP Discord Bot (@$AUDIO-BOT)',
  launch: 'LAUNCH THE VIP DISCORD',
  title: 'Update Discord Role'
}

export const UpdateDiscordRoleModal = ({
  isOpen,
  onClose,
  mint
}: {
  isOpen: boolean
  onClose: () => void
  mint: string
}) => {
  const { data: discordCode } = useDiscordCode(mint)
  const handleDiscordClick = () => {
    window.open(AUDIUS_DISCORD_LINK, '_blank')
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalHeader onClose={onClose}>
        <ModalTitle title={messages.title} />
      </ModalHeader>
      <ModalContent>
        <Flex direction='column' gap='2xl'>
          {/* 600px max width just makes it look better; the text stretches the modal out otherwise */}
          <ModalContentText css={{ maxWidth: '600px' }}>
            {messages.discordDescription}
          </ModalContentText>
          {discordCode ? (
            <ClickableAddress
              label={messages.copyThisCode}
              address={discordCode}
              isCompact
            />
          ) : null}
        </Flex>
      </ModalContent>
      <ModalFooter>
        <Button
          variant='primary'
          css={(theme) => ({ margin: theme.spacing['2xl'] })}
          onClick={handleDiscordClick}
          iconLeft={IconDiscord}
        >
          {messages.launch}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
