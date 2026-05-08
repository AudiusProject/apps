import { FeedFilter } from '@audius/common/models'

import HeaderButton from 'components/header-button/HeaderButton'

const messages = {
  filterAll: 'All Posts',
  filterOriginal: 'Original Posts',
  filterReposts: 'Reposts'
}

const messageMap = {
  [FeedFilter.ALL]: messages.filterAll,
  [FeedFilter.ORIGINAL]: messages.filterOriginal,
  [FeedFilter.REPOST]: messages.filterReposts
}

// HeaderButton for filtering feed by All/Original/Repost
type FeedFilterButtonProps = {
  currentFilter: FeedFilter
  didOpenModal: () => void
  showIcon?: boolean
}

const FeedFilterButton = ({
  currentFilter,
  didOpenModal,
  showIcon = true
}: FeedFilterButtonProps) => {
  return (
    <HeaderButton
      showIcon={showIcon}
      onClick={didOpenModal}
      text={messageMap[currentFilter]}
    />
  )
}

export default FeedFilterButton
