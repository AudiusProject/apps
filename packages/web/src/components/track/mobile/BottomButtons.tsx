import { MouseEvent, ReactElement, memo } from 'react'

import {
  isContentUSDCPurchaseGated,
  AccessConditions,
  GatedContentStatus
} from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconShare,
  Text,
  Tooltip
} from '@audius/harmony'
import cn from 'classnames'

import AnimatedIconButton, {
  AnimatedIconType
} from 'components/animated-button/AnimatedIconButton'
import { useIsMobile } from 'hooks/useIsMobile'
import { useIsUSDCEnabled } from 'hooks/useIsUSDCEnabled'

import { GatedConditionsPill } from '../GatedConditionsPill'

import styles from './BottomButtons.module.css'

const messages = {
  repost: 'Repost',
  unrepost: 'Unrepost',
  favorite: 'Favorite',
  unfavorite: 'Unfavorite',
  share: 'Share'
}

type BottomButtonsProps = {
  hasSaved: boolean
  hasReposted: boolean
  toggleSave: () => void
  toggleRepost: () => void
  onClickOverflow: () => void
  onShare: (e?: MouseEvent) => void
  onClickGatedUnlockPill?: (e: MouseEvent) => void
  isLoading: boolean
  isOwner: boolean
  isDarkMode: boolean
  isUnlisted?: boolean
  isShareHidden?: boolean
  isTrack?: boolean
  hasStreamAccess?: boolean
  readonly?: boolean
  streamConditions?: Nullable<AccessConditions>
  gatedTrackStatus?: GatedContentStatus
  isMatrixMode: boolean
  contentId: number
  contentType: string
  renderOverflow?: () => React.ReactNode
}

const BottomButtons = (props: BottomButtonsProps) => {
  const isMobile = useIsMobile()
  const isUSDCEnabled = useIsUSDCEnabled()
  const isUSDCPurchase =
    isUSDCEnabled && isContentUSDCPurchaseGated(props.streamConditions)

  // Wrap with a Harmony Tooltip on desktop web; skip on native mobile (no hover)
  const withTooltip = (
    label: string,
    disabled: boolean,
    children: ReactElement
  ) =>
    isMobile ? (
      children
    ) : (
      <Tooltip text={label} placement='top' mount='page' disabled={disabled}>
        <Flex css={{ position: 'relative' }}>{children}</Flex>
      </Tooltip>
    )

  // Readonly variant only renders content for locked USDC tracks
  if (!!props.readonly && (!isUSDCPurchase || props.hasStreamAccess)) {
    return null
  }

  const moreButton =
    !isMobile && props.renderOverflow ? (
      props.renderOverflow()
    ) : (
      <IconButton
        icon={IconKebabHorizontal}
        onClick={(e) => {
          e.stopPropagation()
          props.onClickOverflow()
        }}
        size='l'
        color='subdued'
        aria-label='More'
      />
    )

  // Stream conditions without access
  if (!props.isLoading && props.streamConditions && !props.hasStreamAccess) {
    return (
      <Flex
        ph={props.isTrack ? undefined : 's'}
        pt='s'
        pb={props.isTrack ? undefined : 's'}
        direction='row'
        alignItems='center'
        justifyContent='space-between'
        borderTop='default'
      >
        <Text variant='title' size='s'>
          <GatedConditionsPill
            streamConditions={props.streamConditions}
            unlocking={props.gatedTrackStatus === 'UNLOCKING'}
            onClick={props.onClickGatedUnlockPill}
            contentId={props.contentId}
            contentType={props.contentType}
          />
        </Text>
        {props.readonly ? null : moreButton}
      </Flex>
    )
  }

  const shareButton = withTooltip(
    messages.share,
    false,
    <div
      className={cn(styles.button, {
        [styles.shareHidden]: props.isShareHidden
      })}
    >
      <IconButton
        icon={IconShare}
        onClick={props.onShare}
        size='l'
        color='subdued'
        aria-label={messages.share}
      />
    </div>
  )

  if (props.isUnlisted) {
    return (
      <Flex
        ph='s'
        pt='s'
        pb='s'
        direction='row'
        alignItems='center'
        justifyContent='flex-end'
        borderTop='default'
      >
        {moreButton}
      </Flex>
    )
  }

  return (
    <Flex
      ph={props.isTrack ? undefined : 's'}
      pt='s'
      pb={props.isTrack ? undefined : 's'}
      direction='row'
      alignItems='center'
      justifyContent='space-between'
      borderTop='default'
    >
      <Flex
        gap='xl'
        direction='row'
        alignItems='center'
        justifyContent='space-between'
      >
        {withTooltip(
          props.hasReposted ? messages.unrepost : messages.repost,
          props.isOwner,
          <AnimatedIconButton
            icon={AnimatedIconType.REPOST}
            wrapperClassName={cn(styles.button, styles.repostButton)}
            className={styles.buttonContent}
            activeClassName={styles.activeButton}
            disabledClassName={styles.disabledButton}
            onClick={props.toggleRepost}
            isActive={props.hasReposted}
            isDisabled={props.isOwner}
            isMatrix={props.isMatrixMode}
            stopPropagation
          />
        )}
        {withTooltip(
          props.hasSaved ? messages.unfavorite : messages.favorite,
          props.isOwner,
          <AnimatedIconButton
            icon={AnimatedIconType.FAVORITE}
            wrapperClassName={cn(styles.button, styles.favoriteButton)}
            className={styles.buttonContent}
            activeClassName={styles.activeButton}
            disabledClassName={styles.disabledButton}
            onClick={props.toggleSave}
            isActive={props.hasSaved}
            isDisabled={props.isOwner}
            isMatrix={props.isMatrixMode}
            stopPropagation
          />
        )}
        {shareButton}
      </Flex>
      {moreButton}
    </Flex>
  )
}

export default memo(BottomButtons)
