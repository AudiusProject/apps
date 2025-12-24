import { useCallback, useEffect, useState } from 'react'

import { route } from '@audius/common/utils'
import { Button, IconUserArrowRotate } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { useLocation } from 'react-router'

import { replace } from 'utils/navigation'
import { doesMatchRoute } from 'utils/route'

import SettingsCard from '../SettingsCard'

import { AccountsYouManageSettingsModal } from './AccountsYouManageSettingsModal'

const { ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE, SETTINGS_PAGE } = route

const messages = {
  accountsYouManageTitle: 'Accounts You Manage',
  accountsYouManageDescription:
    'Review the accounts you’re authorized to manage.',
  reviewAccountsButtonText: 'Review Accounts'
}

export const AccountsYouManageSettingsCard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const dispatch = useDispatch()
  const location = useLocation()
  useEffect(() => {
    if (doesMatchRoute(location, ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE)) {
      setIsModalOpen(true)
    }
  }, [location])

  const handleOpen = useCallback(() => {
    setIsModalOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsModalOpen(false)
    if (doesMatchRoute(location, ACCOUNTS_YOU_MANAGE_SETTINGS_PAGE)) {
      dispatch(replace(SETTINGS_PAGE))
    }
  }, [location, dispatch])

  return (
    <>
      <SettingsCard
        icon={<IconUserArrowRotate />}
        title={messages.accountsYouManageTitle}
        description={messages.accountsYouManageDescription}
      >
        <Button variant='secondary' onClick={handleOpen} fullWidth>
          {messages.reviewAccountsButtonText}
        </Button>
      </SettingsCard>
      <AccountsYouManageSettingsModal
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    </>
  )
}
