import type { RefObject } from 'react'

import type { Nullable } from '@audius/common/utils'
import type { ScrollView, FlatList } from 'react-native/types'

import { ExpandableContent, UserGeneratedText } from 'app/components/core'

type TrackDescriptionProps = {
  description?: Nullable<string>
  scrollRef?: RefObject<ScrollView | FlatList | null>
}

export const TrackDescription = ({
  description,
  scrollRef
}: TrackDescriptionProps) => {
  if (!description) return null

  return (
    <ExpandableContent scrollRef={scrollRef}>
      <UserGeneratedText source={'track page'} variant='body' size='s'>
        {description}
      </UserGeneratedText>
    </ExpandableContent>
  )
}
