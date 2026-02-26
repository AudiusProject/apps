import type { ReactElement } from 'react'

import type { ID, AccessConditions } from '@audius/common/models'
import { isContentUSDCPurchaseGated } from '@audius/common/models'
import type { PurchaseableContentType } from '@audius/common/store'
import type { Nullable } from '@audius/common/utils'
import { View } from 'react-native'

import {
  Flex,
  IconButton,
  IconKebabHorizontal,
  IconPencil,
  IconRocket,
  IconShare
} from '@audius/harmony-native'
import { FavoriteButton } from 'app/components/favorite-button'
import { RepostButton } from 'app/components/repost-button'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { flexRowCentered, makeStyles } from 'app/styles'
import type { GestureResponderHandler } from 'app/types/gesture'

import { LineupTileAccessStatus } from './LineupTileAccessStatus'
import { useTilePressBlock } from './TilePressBlockContext'
import type { LineupTileSource } from './types'

const messages = {
  shareButtonLabel: 'Share Content',
  overflowButtonLabel: 'More Options',
  editButtonLabel: 'Edit Content',
  publishButtonLabel: 'Publish Content'
}

type Props = {
  disabled?: boolean
  readonly?: boolean
  hasReposted?: boolean
  hasSaved?: boolean
  isOwner?: boolean
  isShareHidden?: boolean
  isUnlisted?: boolean
  contentId?: ID
  contentType?: PurchaseableContentType
  streamConditions?: Nullable<AccessConditions>
  hasStreamAccess?: boolean
  source?: LineupTileSource
  onPressOverflow?: GestureResponderHandler
  onPressRepost?: GestureResponderHandler
  onPressSave?: GestureResponderHandler
  onPressShare?: GestureResponderHandler
  onPressPublish?: GestureResponderHandler
  onPressEdit?: GestureResponderHandler
}

const useStyles = makeStyles(({ spacing, palette }) => ({
  bottomButtons: {
    ...flexRowCentered(),
    justifyContent: 'space-between',
    marginHorizontal: spacing(2),
    paddingVertical: spacing(2),
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight8
  },
  button: {
    height: spacing(6),
    width: spacing(6)
  }
}))

export const LineupTileActionButtons = ({
  disabled,
  hasReposted,
  hasSaved,
  isOwner,
  isShareHidden,
  isUnlisted,
  contentId,
  contentType,
  hasStreamAccess = false,
  readonly = false,
  streamConditions,
  source,
  onPressOverflow,
  onPressRepost,
  onPressSave,
  onPressShare,
  onPressPublish,
  onPressEdit
}: Props) => {
  const styles = useStyles()
  const blockTilePress = useTilePressBlock()
  const isUSDCEnabled = useIsUSDCEnabled()

  const wrapWithBlock = (handler?: GestureResponderHandler) =>
    handler
      ? () => {
          blockTilePress?.()
          handler()
        }
      : undefined
  const isUSDCPurchase =
    isUSDCEnabled && isContentUSDCPurchaseGated(streamConditions)
  const showPublishButton = isOwner && isUnlisted

  const repostButton = (
    <RepostButton
      wrapperStyle={styles.button}
      onPress={wrapWithBlock(onPressRepost)}
      isActive={hasReposted}
      isDisabled={disabled}
    />
  )

  const favoriteButton = (
    <FavoriteButton
      wrapperStyle={styles.button}
      onPress={wrapWithBlock(onPressSave)}
      isActive={hasSaved}
      isDisabled={disabled}
    />
  )

  const shareButton = (
    <IconButton
      color='subdued'
      icon={IconShare}
      disabled={disabled}
      onPress={wrapWithBlock(onPressShare)}
      aria-label={messages.shareButtonLabel}
      size='l'
      style={{
        padding: 0
      }}
    />
  )

  const moreButton = (
    <IconButton
      color='subdued'
      icon={IconKebabHorizontal}
      disabled={disabled}
      onPress={wrapWithBlock(onPressOverflow)}
      aria-label={messages.overflowButtonLabel}
      size='l'
      style={{
        padding: 0
      }}
    />
  )

  const editButton = (
    <IconButton
      color='subdued'
      icon={IconPencil}
      disabled={disabled}
      onPress={wrapWithBlock(onPressEdit)}
      aria-label={messages.editButtonLabel}
      size='l'
      style={{
        padding: 0
      }}
    />
  )

  const publishButton = (
    <IconButton
      color='subdued'
      icon={IconRocket}
      disabled={disabled}
      onPress={wrapWithBlock(onPressPublish)}
      aria-label={messages.publishButtonLabel}
      size='l'
      style={{
        padding: 0
      }}
    />
  )

  const showGatedAccessStatus = contentId && !hasStreamAccess
  const showLeftButtons = !showGatedAccessStatus

  let content: ReactElement | null = null
  if (readonly) {
    if (isUSDCPurchase && showGatedAccessStatus && contentType) {
      content = (
        <View>
          <LineupTileAccessStatus
            contentId={contentId}
            contentType={contentType}
            streamConditions={streamConditions}
            hasStreamAccess={hasStreamAccess}
            source={source}
          />
        </View>
      )
    }
  } else {
    content = (
      <Flex direction='row' justifyContent='space-between' w='100%'>
        <Flex gap='2xl' direction='row' alignItems='center'>
          {showGatedAccessStatus && contentType && streamConditions != null ? (
            <LineupTileAccessStatus
              contentId={contentId}
              contentType={contentType}
              streamConditions={streamConditions}
              hasStreamAccess={hasStreamAccess}
              source={source}
            />
          ) : null}
          {showLeftButtons && (
            <>
              {!isOwner ? repostButton : null}
              {!isOwner ? favoriteButton : null}
              {!isShareHidden ? shareButton : null}
              {isOwner ? editButton : null}
              {showPublishButton ? publishButton : null}
            </>
          )}
        </Flex>
        {moreButton}
      </Flex>
    )
  }

  return content ? <View style={styles.bottomButtons}>{content}</View> : null
}
