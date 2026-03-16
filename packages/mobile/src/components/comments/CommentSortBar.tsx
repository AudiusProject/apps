import { useCurrentCommentSection } from '@audius/common/context'
import { GetTrackCommentsSortMethodEnum } from '@audius/sdk/services'

import { Flex, SelectablePill } from '@audius/harmony-native'

const messages = {
  top: 'Top',
  newest: 'Newest',
  timestamp: 'Timestamp'
}

export const CommentSortBar = () => {
  const { currentSort, setCurrentSort } = useCurrentCommentSection()
  return (
    <Flex gap='s' direction='row'>
      <SelectablePill
        type='radio'
        label={messages.top}
        isSelected={currentSort === GetTrackCommentsSortMethodEnum.Top}
        onPress={() => setCurrentSort(GetTrackCommentsSortMethodEnum.Top)}
      />
      <SelectablePill
        type='radio'
        label={messages.newest}
        isSelected={currentSort === GetTrackCommentsSortMethodEnum.Newest}
        onPress={() => setCurrentSort(GetTrackCommentsSortMethodEnum.Newest)}
      />
      <SelectablePill
        type='radio'
        label={messages.timestamp}
        isSelected={currentSort === GetTrackCommentsSortMethodEnum.Timestamp}
        onPress={() => setCurrentSort(GetTrackCommentsSortMethodEnum.Timestamp)}
      />
    </Flex>
  )
}
