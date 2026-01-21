import { useState, useCallback } from 'react'

import { Button, IconEmbed } from '@audius/harmony'

import SettingsCard from '../SettingsCard'

import { DeveloperAppsSettingsModal } from './DeveloperAppsSettingsModal'

const messages = {
  title: 'Create App',
  description: 'Create your own app using the Audius API.',
  buttonText: 'Manage Your Apps'
}

export const DeveloperAppsSettingsCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleOpen = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return (
    <>
      <SettingsCard
        icon={<IconEmbed color='accent' />}
        title={messages.title}
        description={messages.description}
      >
        <Button variant='secondary' onClick={handleOpen} fullWidth>
          {messages.buttonText}
        </Button>
      </SettingsCard>
      <DeveloperAppsSettingsModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  )
}
