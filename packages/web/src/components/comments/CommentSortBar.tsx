import { useCurrentCommentSection } from '@audius/common/context'
import { Flex, SelectablePill } from '@audius/harmony'
import { GetTrackCommentsSortMethodEnum } from '@audius/sdk/services'

const messages = {
  top: 'Top',
  newest: 'Newest',
  timestamp: 'Timestamp'
}

export const CommentSortBar = () => {
  const { currentSort, setCurrentSort } = useCurrentCommentSection()
  return (
    <Flex gap='s' ph='xl'>
      <SelectablePill
        label={messages.top}
        isSelected={currentSort === GetTrackCommentsSortMethodEnum.Top}
        onClick={() => setCurrentSort(GetTrackCommentsSortMethodEnum.Top)}
      />
      <SelectablePill
        label={messages.newest}
        isSelected={currentSort === GetTrackCommentsSortMethodEnum.Newest}
        onClick={() => setCurrentSort(GetTrackCommentsSortMethodEnum.Newest)}
      />
      <SelectablePill
        label={messages.timestamp}
        isSelected={currentSort === GetTrackCommentsSortMethodEnum.Timestamp}
        onClick={() => setCurrentSort(GetTrackCommentsSortMethodEnum.Timestamp)}
      />
    </Flex>
  )
}
