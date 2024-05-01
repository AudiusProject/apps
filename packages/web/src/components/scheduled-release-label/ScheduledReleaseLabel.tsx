import { Text, IconCalendarMonth } from '@audius/harmony'
import cn from 'classnames'
import moment from 'moment'

import { getLocalTimezone } from 'utils/dateUtils'

import gatedContentLabelStyles from '../track/GatedContentLabel.module.css'

import styles from './ScheduledReleaseLabel.module.css'

export type ScheduledReleaseLabelProps = {
  released?: string | null
  isUnlisted?: boolean
}

export const ScheduledReleaseLabel = ({
  released,
  isUnlisted
}: ScheduledReleaseLabelProps) => {
  if (!released || !isUnlisted || moment(released).isBefore(moment())) {
    return null
  }
  return (
    <div
      className={cn(
        gatedContentLabelStyles.labelContainer,
        styles.scheduledReleaseLabel
      )}
    >
      <IconCalendarMonth size='s' />
      <Text variant='body'>
        Releases{' '}
        {moment(released).format('M/D/YY [@] h:mm A') +
          ' ' +
          getLocalTimezone()}
      </Text>
    </div>
  )
}

export const ScheduledReleaseGiantLabel = ({
  released,
  isUnlisted
}: ScheduledReleaseLabelProps) => {
  if (!released || !isUnlisted || moment(released).isBefore(moment())) {
    return null
  }

  return (
    <div
      className={cn(
        gatedContentLabelStyles.labelContainer,
        styles.scheduledReleaseLabel
      )}
    >
      <IconCalendarMonth />
      <Text color='accent' variant='title'>
        Releases
        {' ' +
          moment(released).format('M/D/YY [@] h:mm A') +
          ' ' +
          getLocalTimezone()}
      </Text>
    </div>
  )
}
