import React from 'react'

import { useFeedbackTracks } from '@audius/common/api'
import { exploreMessages as messages } from '@audius/common/messages'

import { useTheme } from '@audius/harmony-native'
import { TrackCardList } from 'app/components/track-card-list'

import { useExploreSectionTracking } from '../hooks/useExploreSectionTracking'

import { ExploreSection } from './ExploreSection'

export const FeedbackTracks = () => {
  const { spacing } = useTheme()
  const { InViewWrapper, inView } = useExploreSectionTracking(
    'Looking for Feedback'
  )
  const { trackIds, isSuccess } = useFeedbackTracks(
    { pageSize: 20 },
    { enabled: inView }
  )

  if (isSuccess && trackIds.length === 0) return null

  return (
    <InViewWrapper>
      <ExploreSection title={messages.lookingForFeedback}>
        <TrackCardList
          trackIds={trackIds}
          horizontal
          carouselSpacing={spacing.l}
        />
      </ExploreSection>
    </InViewWrapper>
  )
}
