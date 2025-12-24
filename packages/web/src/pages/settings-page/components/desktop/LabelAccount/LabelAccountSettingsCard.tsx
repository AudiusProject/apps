import { useCallback, useEffect } from 'react'

import { settingsMessages } from '@audius/common/messages'
import { route } from '@audius/common/utils'
import { Button, IconUserList } from '@audius/harmony'
import { useMatch } from 'react-router'

import { useModalState } from 'common/hooks/useModalState'

import SettingsCard from '../SettingsCard'

const { LABEL_ACCOUNT_SETTINGS_PAGE } = route

export const LabelAccountSettingsCard = () => {
  const [, setIsModalOpen] = useModalState('LabelAccount')
  const match = useMatch(LABEL_ACCOUNT_SETTINGS_PAGE)

  useEffect(() => {
    if (match) {
      setIsModalOpen(true)
    }
  }, [match, setIsModalOpen])

  const handleOpen = useCallback(() => {
    setIsModalOpen(true)
  }, [setIsModalOpen])

  return (
    <>
      <SettingsCard
        icon={<IconUserList />}
        title={settingsMessages.labelAccountCardTitle}
        description={settingsMessages.labelAccountCardDescription}
      >
        <Button variant='secondary' fullWidth onClick={handleOpen}>
          {settingsMessages.labelAccountButtonText}
        </Button>
      </SettingsCard>
    </>
  )
}
