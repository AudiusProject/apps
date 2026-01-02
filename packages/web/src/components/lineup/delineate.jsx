import { dayjs } from '@audius/common/utils'

import Delineator from 'components/delineator/Delineator'

const NOW = dayjs()
const START_OF_DAY = dayjs(NOW).startOf('day')
const START_OF_YESTERDAY = dayjs(NOW).subtract(1, 'day').startOf('day')
const START_OF_WEEK = dayjs(NOW).startOf('week')
const START_OF_LAST_WEEK = dayjs(NOW).subtract(1, 'week').startOf('week')
const START_OF_MONTH = dayjs(NOW).startOf('month')

const Delineations = Object.freeze({
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  EARLIER_THIS_WEEK: 'earlier this week',
  LAST_WEEK: 'last week',
  EARLIER_THIS_MONTH: 'earlier this month'
})

const calculateBucket = (timestamp) => {
  const time = dayjs(timestamp)
  if (time.isAfter(START_OF_DAY)) {
    return Delineations.TODAY
  }
  if (time.isAfter(START_OF_YESTERDAY)) {
    return Delineations.YESTERDAY
  }
  if (time.isAfter(START_OF_WEEK)) {
    return Delineations.EARLIER_THIS_WEEK
  }
  if (time.isAfter(START_OF_LAST_WEEK)) {
    return Delineations.LAST_WEEK
  }
  if (time.isAfter(START_OF_MONTH)) {
    return Delineations.EARLIER_THIS_MONTH
  }
  return {
    dayjs: dayjs(time).startOf('month')
  }
}

export const delineateByTime = (tiles, isMobile) => {
  const buckets = new Set([])

  tiles.forEach((tile, i) => {
    if (!tile) return
    const timestamp = tile.props.activityTimestamp
    if (timestamp) {
      const bucket = calculateBucket(timestamp)
      const bucketKey = bucket.dayjs ? bucket.dayjs.format() : bucket

      if (!buckets.has(bucketKey)) {
        buckets.add(bucketKey)

        let key = null
        let text = null

        if (bucket.dayjs) {
          key = bucket.dayjs.format()
          if (bucket.dayjs.year() === NOW.year()) {
            text = bucket.dayjs.format('MMMM')
          } else {
            text = bucket.dayjs.format('MMMM YYYY')
          }
        } else {
          key = bucket
          text = bucket
        }
        // Don't show a delineator at the top.
        if (i !== 0) {
          const d = <Delineator key={key} text={text} isMobile={isMobile} />
          tiles.splice(i, 0, d)
        }
      }
    }
  })
  return tiles
}

export const delineateByFeatured = (
  tiles,
  id,
  isMobile,
  className,
  customDelineator
) => {
  const featured = []
  let hasFeatured = false
  const filteredTiles = tiles
    .map((tile) => {
      if (tile.props.id === id) {
        featured.push(tile)
        hasFeatured = true
        return null
      }
      return tile
    })
    .filter(Boolean)
  const remaining = (
    hasFeatured
      ? [
          customDelineator || (
            <Delineator
              padTop
              className={className}
              isMobile={isMobile}
              key='featured'
            />
          )
        ]
      : []
  ).concat(filteredTiles)
  return { featured, remaining }
}
