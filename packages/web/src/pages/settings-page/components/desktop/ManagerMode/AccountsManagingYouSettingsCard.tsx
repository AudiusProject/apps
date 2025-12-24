import { useState, useCallback, useEffect } from 'react'

import { route } from '@audius/common/utils'
import { Button, IconShieldUser } from '@audius/harmony'
import { useLocation } from 'react-router'

import { doesMatchRoute } from 'utils/route'

import SettingsCard from '../SettingsCard'

import { AccountsManagingYouSettingsModal } from './AccountsManagingYouSettingsModal'

const { ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE } = route

const messages = {
  accountsManagingYouTitle: 'Accounts Managing You',
  accountsManagingYouDescription:
    'Invite other Audius users to make changes to your account on your behalf.',
  reviewManagersButtonText: 'Review Managers'
}

export const AccountsManagingYouSettingsCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const match = doesMatchRoute(location, ACCOUNTS_MANAGING_YOU_SETTINGS_PAGE)
    if (match) {
      setIsModalOpen(true)
    }
  }, [location])

  const handleOpen = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  return (
    <>
      <SettingsCard
        icon={<IconShieldUser />}
        title={messages.accountsManagingYouTitle}
        description={messages.accountsManagingYouDescription}
      >
        <Button variant='secondary' onClick={handleOpen} fullWidth>
          {messages.reviewManagersButtonText}
        </Button>
      </SettingsCard>
      <AccountsManagingYouSettingsModal
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    </>
  )
}
