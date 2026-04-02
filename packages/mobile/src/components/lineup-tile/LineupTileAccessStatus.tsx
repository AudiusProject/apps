import { useCallback } from 'react'

import { useArtistCoin } from '@audius/common/api'
import type {
  ID,
  AccessConditions,
  TokenGatedConditions
} from '@audius/common/models'
import {
  ModalSource,
  isContentTokenGated,
  isContentUSDCPurchaseGated
} from '@audius/common/models'
import {
  PurchaseableContentType,
  usePremiumContentPurchaseModal,
  gatedContentActions,
  gatedContentSelectors
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import { TouchableOpacity } from 'react-native'
import LinearGradient from 'react-native-linear-gradient'
import { useDispatch, useSelector } from 'react-redux'

import type { FlexProps } from '@audius/harmony-native'
import {
  Button,
  Flex,
  IconLock,
  IconLockUnlocked,
  useTheme,
  Text
} from '@audius/harmony-native'
import LoadingSpinner from 'app/components/loading-spinner'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { make, track } from 'app/services/analytics'
import { setVisibility } from 'app/store/drawers/slice'
import { makeStyles } from 'app/styles'
import { EventNames } from 'app/types/analytics'

import { useTilePressBlock } from './TilePressBlockContext'
import { LineupTileSource } from './types'

const { getGatedContentStatusMap } = gatedContentSelectors
const { setLockedContentId } = gatedContentActions

const messages = {
  unlocking: 'Unlocking',
  locked: 'Locked',
  unlock: 'Unlock',
  price: (price: string) => `$${price}`
}

const useStyles = makeStyles(({ spacing }) => ({
  loadingSpinner: {
    width: spacing(4),
    height: spacing(4)
  }
}))

export const LineupTileAccessStatus = ({
  contentId,
  contentType,
  streamConditions,
  hasStreamAccess,
  source: tileSource
}: {
  contentId: ID
  contentType: PurchaseableContentType
  streamConditions: AccessConditions
  hasStreamAccess: boolean | undefined
  source?: LineupTileSource
}) => {
  const styles = useStyles()
  const { color } = useTheme()
  const dispatch = useDispatch()
  const isUSDCEnabled = useIsUSDCEnabled()
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const gatedTrackStatusMap = useSelector(getGatedContentStatusMap)
  const gatedTrackStatus = gatedTrackStatusMap[contentId]
  const isUSDCPurchase =
    isUSDCEnabled && isContentUSDCPurchaseGated(streamConditions)
  const isTokenGated = isContentTokenGated(streamConditions)
  const isUnlocking = gatedTrackStatus === 'UNLOCKING'

  const { data: token } = useArtistCoin(
    (streamConditions as TokenGatedConditions)?.token_gate?.token_mint,
    { enabled: isTokenGated }
  )

  const handlePress = useCallback(() => {
    if (hasStreamAccess) {
      return
    }
    if (isUSDCPurchase) {
      track(
        make({
          eventName: EventNames.PURCHASE_CONTENT_BUY_CLICKED,
          contentId,
          contentType
        })
      )
      const determineModalSource = () => {
        if (tileSource === LineupTileSource.DM_COLLECTION) {
          return ModalSource.DirectMessageCollectionTile
        }
        if (tileSource === LineupTileSource.DM_TRACK) {
          return ModalSource.DirectMessageTrackTile
        }
        return contentType === PurchaseableContentType.ALBUM
          ? ModalSource.LineUpCollectionTile
          : ModalSource.LineUpTrackTile
      }
      openPremiumContentPurchaseModal(
        { contentId, contentType },
        {
          source: determineModalSource()
        }
      )
    } else if (contentId) {
      dispatch(setLockedContentId({ id: contentId }))
      dispatch(setVisibility({ drawer: 'LockedContent', visible: true }))
    }
  }, [
    hasStreamAccess,
    isUSDCPurchase,
    contentId,
    contentType,
    openPremiumContentPurchaseModal,
    tileSource,
    dispatch
  ])

  const buttonText = isUSDCPurchase
    ? messages.price(
        USDC(streamConditions.usdc_purchase.price / 100).toLocaleString()
      )
    : isTokenGated
      ? messages.unlock
      : isUnlocking
        ? messages.unlocking
        : messages.locked

  const showButtonText =
    !isUSDCPurchase || isTokenGated || (!hasStreamAccess && !isUnlocking)

  const blockTilePress = useTilePressBlock()

  const handlePressWithBlock = useCallback(() => handlePress(), [handlePress])

  const backgroundColor = isUSDCPurchase
    ? color.special.lightGreen
    : isTokenGated
      ? color.primary.default
      : color.special.blue

  const lockedStyles: FlexProps = {
    borderRadius: 's',
    ph: 'm',
    pv: 'xs',
    style: { backgroundColor }
  }

  const unlockedStyles: FlexProps = {
    borderRadius: 'l',
    ph: 's',
    pv: '2xs',
    style: { backgroundColor }
  }

  if (isTokenGated && !hasStreamAccess && !isUnlocking) {
    return (
      <Button
        variant='secondary'
        size='small'
        rounded
        onPress={handlePressWithBlock}
        style={{ height: 24 }}
      >
        {buttonText}
      </Button>
    )
  }

  return (
    <TouchableOpacity onPressIn={blockTilePress} onPress={handlePressWithBlock}>
      <Flex
        {...(hasStreamAccess || isUnlocking ? unlockedStyles : lockedStyles)}
        direction='row'
        alignItems='center'
        gap='xs'
      >
        {isTokenGated ? (
          <LinearGradient
            {...color.special.coinGradient}
            style={{
              position: 'absolute',
              borderRadius: hasStreamAccess || isUnlocking ? 12 : 4,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          />
        ) : null}
        {hasStreamAccess ? (
          <IconLockUnlocked color='white' size='xs' />
        ) : isUnlocking ? (
          <LoadingSpinner
            style={styles.loadingSpinner}
            fill={color.icon.staticWhite}
          />
        ) : (
          <IconLock color='white' size='s' />
        )}
        {showButtonText ? (
          <Text color='white' variant='label' size='m'>
            {buttonText}
          </Text>
        ) : null}
      </Flex>
    </TouchableOpacity>
  )
}
