import { useState, useCallback, useEffect } from 'react'

import { Button, IconShieldCheck } from '@audius/harmony'

import { useHistoryContext } from 'app/HistoryProvider'
import { AUTHORIZED_APPS_SETTINGS_PAGE, doesMatchRoute } from 'utils/route'

import SettingsCard from '../SettingsCard'

import { AuthorizedAppsSettingsModal } from './AuthorizedAppsSettingsModal'

const messages = {
  title: 'Authorized Apps',
  description:
    'Manage the 3rd party apps that are allowed to modify your account.',
  buttonText: 'Authorized Apps'
}

export const AuthorizedAppsSettingsCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { history } = useHistoryContext()

  useEffect(() => {
    const match = doesMatchRoute(
      history.location,
      AUTHORIZED_APPS_SETTINGS_PAGE
    )
    if (match) {
      setIsModalOpen(true)
    }
  }, [history.location])

  const handleOpen = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return (
    <>
      <SettingsCard
        icon={<IconShieldCheck />}
        title={messages.title}
        description={messages.description}
      >
        <Button variant='secondary' onClick={handleOpen} fullWidth>
          {messages.buttonText}
        </Button>
      </SettingsCard>
      <AuthorizedAppsSettingsModal isOpen={isModalOpen} onClose={handleClose} />
    </>
  )
}
