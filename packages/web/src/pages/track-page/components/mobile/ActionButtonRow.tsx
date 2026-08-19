import {
  IconShare,
  IconKebabHorizontal,
  IconButton,
  Flex,
  IconPencil
} from '@audius/harmony'
import cn from 'classnames'

import loadingSpinner from 'assets/animations/loadingSpinner.json'
import AnimatedIconButton, {
  AnimatedIconType
} from 'components/animated-button/AnimatedIconButton'
import { LazyLottie as Lottie } from 'components/lottie/LazyLottie'

import styles from './ActionButtonRow.module.css'

type ActionButtonRowProps = {
  isOwner: boolean
  isReposted: boolean
  isSaved: boolean
  isPublished?: boolean
  isPublishing?: boolean
  showRepost: boolean
  onRepost?: () => void
  onFavorite?: () => void
  onShare?: () => void
  onClickOverflow?: () => void
  onClickEdit?: () => void
  showFavorite: boolean
  showShare: boolean
  showOverflow: boolean
  showEdit?: boolean
  shareToastDisabled?: boolean
  darkMode: boolean
}

// A row of action buttons, visible on track or playlist pages.
const ActionButtonRow = ({
  showRepost,
  isOwner,
  isSaved,
  isReposted,
  isPublished = true,
  isPublishing = false,
  showFavorite,
  showShare,
  showOverflow,
  showEdit,
  shareToastDisabled = true,
  onRepost = () => {},
  onFavorite = () => {},
  onShare = () => {},
  onClickOverflow = () => {},
  onClickEdit = () => {},
  darkMode
}: ActionButtonRowProps) => {
  const renderRepostButton = () => {
    return (
      <div className={styles.animatedIconWrapper}>
        <AnimatedIconButton
          icon={AnimatedIconType.REPOST_LIGHT}
          className={cn(styles.animatedActionButton)}
          isDisabled={isOwner}
          onClick={onRepost}
          isActive={isReposted}
          activeClassName={styles.activeButton}
          disabledClassName={styles.disabledButton}
          darkMode={darkMode}
        />
      </div>
    )
  }

  const renderFavoriteButton = () => {
    return (
      <div className={styles.animatedIconWrapper}>
        <AnimatedIconButton
          className={cn(styles.animatedActionButton, styles.favoriteButton)}
          activeClassName={styles.activeButton}
          disabledClassName={styles.disabledButton}
          isActive={isSaved}
          isDisabled={isOwner}
          icon={AnimatedIconType.FAVORITE_LIGHT}
          onClick={onFavorite}
          darkMode={darkMode}
        />
      </div>
    )
  }

  const renderShareButton = () => {
    return (
      <IconButton
        aria-label='share'
        size='2xl'
        disabled={!isPublished}
        color='subdued'
        icon={IconShare}
        onClick={isPublished ? onShare : () => {}}
      />
    )
  }

  const renderSpinner = () => {
    return (
      <div className={cn(styles.actionButton, styles.spinner)}>
        <Lottie loop autoplay animationData={loadingSpinner} />
      </div>
    )
  }

  const renderOverflowMenu = () => {
    return (
      <IconButton
        aria-label='more actions'
        size='2xl'
        color='subdued'
        icon={IconKebabHorizontal}
        onClick={onClickOverflow}
      />
    )
  }

  const renderEditButton = () => (
    <IconButton
      aria-label='edit'
      size='2xl'
      color='subdued'
      icon={IconPencil}
      onClick={onClickEdit}
    />
  )

  return (
    <Flex direction='row' alignItems='center' justifyContent='center' gap='xl'>
      {showRepost && renderRepostButton()}
      {showFavorite && renderFavoriteButton()}
      {showShare && (isPublishing ? renderSpinner() : renderShareButton())}
      {showEdit && renderEditButton()}
      {showOverflow && renderOverflowMenu()}
    </Flex>
  )
}

export default ActionButtonRow
