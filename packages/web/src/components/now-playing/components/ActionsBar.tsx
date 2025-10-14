import { memo, MouseEvent } from 'react'

import { useCurrentUserId, useTrack } from '@audius/common/api'
import { useGatedContentAccess } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import {
  IconShare,
  IconKebabHorizontal,
  IconButton,
  Flex
} from '@audius/harmony'
import { pick } from 'lodash'

import FavoriteButton from 'components/alt-button/FavoriteButton'
import RepostButton from 'components/alt-button/RepostButton'

import styles from './ActionsBar.module.css'

type ActionsBarProps = {
  trackId: ID
  onToggleRepost: () => void
  onToggleFavorite: () => void
  onShare: () => void
  onClickOverflow: () => void
  isDarkMode: boolean
  isMatrixMode: boolean
}

const ActionsBar = ({
  trackId,
  onToggleRepost,
  onToggleFavorite,
  onShare,
  onClickOverflow,
  isDarkMode,
  isMatrixMode
}: ActionsBarProps) => {
  const { data: partialTrack } = useTrack(trackId, {
    select: (track) =>
      pick(track, [
        'track_id',
        'is_unlisted',
        'owner_id',
        'has_current_user_reposted',
        'has_current_user_saved',
        'access',
        'is_stream_gated',
        'stream_conditions',
        'is_download_gated',
        'download_conditions'
      ])
  })
  const { data: currentUserId } = useCurrentUserId()
  const {
    owner_id: ownerId,
    has_current_user_reposted: hasReposted,
    has_current_user_saved: hasSaved,
    is_unlisted: isUnlisted
  } = partialTrack ?? {}
  const isOwner = ownerId === currentUserId
  const { hasStreamAccess } = useGatedContentAccess(partialTrack)
  const shouldShowActions = hasStreamAccess && !isUnlisted

  if (!shouldShowActions) return null

  return (
    <Flex className={styles.actionsBar}>
      <RepostButton
        isDarkMode={isDarkMode}
        isMatrixMode={isMatrixMode}
        isActive={hasReposted}
        isDisabled={isOwner}
        onClick={onToggleRepost}
        wrapperClassName={styles.icon}
        className={styles.repostButton}
        altVariant
      />
      <FavoriteButton
        isActive={hasSaved}
        isDisabled={isOwner}
        isDarkMode={isDarkMode}
        isMatrixMode={isMatrixMode}
        onClick={onToggleFavorite}
        wrapperClassName={styles.icon}
        className={styles.favoriteButton}
        altVariant
      />
      <IconButton
        aria-label='share'
        size='xl'
        color='default'
        icon={IconShare}
        onClick={onShare}
      />
      <IconButton
        aria-label='more actions'
        size='xl'
        color='default'
        icon={IconKebabHorizontal}
        onClick={(event: MouseEvent) => {
          event.stopPropagation()
          onClickOverflow()
        }}
      />
    </Flex>
  )
}

export default memo(ActionsBar)
