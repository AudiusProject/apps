import { useCallback, useMemo } from 'react'

import { FeedFilter } from '@audius/common/models'

import ActionDrawer from 'components/action-drawer/ActionDrawer'

import styles from './FeedFilterModal.module.css'

interface FeedFilterDrawerProps {
  isOpen: boolean
  onClose: () => void
  onSelectFilter: (filter: FeedFilter) => void
}

const messages = {
  title: 'What do you want to see in your feed?',
  filterAll: 'All Posts',
  filterOriginal: 'Original Posts',
  filterReposts: 'Reposts'
}

const FeedFilterDrawer = ({
  isOpen,
  onSelectFilter,
  onClose
}: FeedFilterDrawerProps) => {
  const handleSelectFilter = useCallback(
    (filter: FeedFilter) => {
      onSelectFilter(filter)
      onClose()
    },
    [onClose, onSelectFilter]
  )

  const actions = useMemo(
    () => [
      {
        text: messages.filterAll,
        onClick: () => handleSelectFilter(FeedFilter.ALL)
      },
      {
        text: messages.filterOriginal,
        onClick: () => handleSelectFilter(FeedFilter.ORIGINAL)
      },
      {
        text: messages.filterReposts,
        onClick: () => handleSelectFilter(FeedFilter.REPOST)
      }
    ],
    [handleSelectFilter]
  )

  return (
    <ActionDrawer
      renderTitle={() => <div className={styles.title}>{messages.title}</div>}
      actions={actions}
      onClose={onClose}
      isOpen={isOpen}
    />
  )
}

export default FeedFilterDrawer
