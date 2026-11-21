import { useCallback } from 'react'

import { useAppContext } from '~/context/appContext'
import { AnalyticsEvent, AllTrackingEvents } from '~/models/Analytics'

export const useAnalytics = () => {
  const { analytics } = useAppContext()

  const track = useCallback(
    async (event: AnalyticsEvent, callback?: () => void) => {
      return analytics.track(event, callback)
    },
    [analytics]
  )

  const make = useCallback(
    <T extends AllTrackingEvents>(event: T) => {
      return analytics.make(event)
    },
    [analytics]
  )

  const trackEvent = useCallback(
    async <T extends AllTrackingEvents>(event: T, callback?: () => void) => {
      const analyticsEvent = analytics.make(event)
      return analytics.track(analyticsEvent, callback)
    },
    [analytics]
  )

  return {
    track,
    make,
    trackEvent
  }
}
