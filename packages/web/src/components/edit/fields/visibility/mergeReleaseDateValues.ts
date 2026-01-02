import { dayjs } from '@audius/common/utils'

export const mergeReleaseDateValues = (
  day: string,
  time: string,
  meridian: string
) => {
  const truncatedReleaseDate = dayjs(day).startOf('day')
  const hour = parseInt(time.split(':')[0])
  let adjustedHours = hour

  if (meridian === 'PM' && hour < 12) {
    adjustedHours += 12
  } else if (meridian === 'AM' && hour === 12) {
    adjustedHours = 0
  }
  const combinedDateTime = truncatedReleaseDate
    .add(adjustedHours, 'hour')
    .add(parseInt(time.split(':')[1]), 'minute')

  return combinedDateTime
}
