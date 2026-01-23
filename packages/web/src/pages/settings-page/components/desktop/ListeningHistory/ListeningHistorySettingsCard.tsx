import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { Button, IconListeningHistory } from '@audius/harmony'
import { useDispatch } from 'react-redux'

import { push } from 'utils/navigation'

import SettingsCard from '../SettingsCard'

const { HISTORY_PAGE } = route

const messages = {
  title: 'Listening History',
  description: "Review the songs you've listened to on Audius.",
  buttonText: 'View Listening History'
}

export const ListeningHistorySettingsCard = () => {
  const dispatch = useDispatch()

  const handleClick = useCallback(() => {
    dispatch(push(HISTORY_PAGE))
  }, [dispatch])

  return (
    <SettingsCard
      icon={<IconListeningHistory color='accent' />}
      title={messages.title}
      description={messages.description}
    >
      <Button variant='secondary' onClick={handleClick} fullWidth>
        {messages.buttonText}
      </Button>
    </SettingsCard>
  )
}
