import { useCallback, useEffect, useState } from 'react'

import { settingsMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Button, IconUserList } from '@audius/harmony'
import { useMatch } from 'react-router'

import { LabelAccountModal } from 'components/label-account-modal/LabelAccountModal'

import SettingsCard from '../SettingsCard'

const { LABEL_ACCOUNT_SETTINGS_PAGE } = route

export const LabelAccountSettingsCard = () => {
  const [isOpen, setIsOpen] = useState(false)
  const match = useMatch(LABEL_ACCOUNT_SETTINGS_PAGE)

  useEffect(() => {
    if (match) {
      setIsOpen(true)
    }
  }, [match])

  const handleOpen = useCallback(() => {
    setIsOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  return (
    <>
      <SettingsCard
        icon={<IconUserList color='accent' />}
        title={settingsMessages.labelAccountCardTitle}
        description={settingsMessages.labelAccountCardDescription}
      >
        <Button variant='secondary' fullWidth onClick={handleOpen}>
          {settingsMessages.labelAccountButtonText}
        </Button>
      </SettingsCard>
      <LabelAccountModal isOpen={isOpen} onClose={handleClose} />
    </>
  )
}
