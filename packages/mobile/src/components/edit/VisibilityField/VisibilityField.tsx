import { visibilityMessages } from '@audius/common/messages'
import { useField } from 'formik'
import { formatCalendarTime } from 'utils/dateUtils'

import { ContextualMenu } from 'app/components/core'

export const visibilityScreenName = 'Visibility'

const messages = {
  ...visibilityMessages,
  title: (entityType: 'track' | 'album' | 'playlist') =>
    `${entityType === 'track' ? 'Track' : entityType === 'album' ? 'Album' : 'Playlist'} Privacy`,
  scheduled: (date: string) => `Scheduled for ${formatCalendarTime(date)}`
}

export const VisibilityField = () => {
  const [{ value: entityType }] = useField<'track' | 'album' | 'playlist'>(
    'entityType'
  )
  const [{ value: isHidden }] = useField(
    entityType === 'track' ? 'is_unlisted' : 'is_private'
  )
  const [{ value: isScheduledRelease }] = useField('is_scheduled_release')
  const [{ value: releaseDate }] = useField('release_date')

  const value =
    isScheduledRelease && isHidden
      ? messages.scheduled(releaseDate)
      : isHidden
        ? messages.hidden
        : messages.public

  return (
    <ContextualMenu
      label={messages.title(entityType)}
      value={value}
      menuScreenName={visibilityScreenName}
    />
  )
}
