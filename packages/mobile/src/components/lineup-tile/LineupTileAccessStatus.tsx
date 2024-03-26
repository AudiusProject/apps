import { useCallback } from 'react'

import type { ID, AccessConditions } from '@audius/common/models'
import { ModalSource, isContentUSDCPurchaseGated } from '@audius/common/models'
import {
  usePremiumContentPurchaseModal,
  gatedContentActions,
  gatedContentSelectors,
  PurchaseableContentType
} from '@audius/common/store'
import { formatPrice } from '@audius/common/utils'
import { TouchableOpacity, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconLock } from '@audius/harmony-native'
import { Text } from 'app/components/core'
import LoadingSpinner from 'app/components/loading-spinner'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { setVisibility } from 'app/store/drawers/slice'
import { flexRowCentered, makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useColor } from 'app/utils/theme'

const { getGatedContentStatusMap } = gatedContentSelectors
const { setLockedContentId } = gatedContentActions

const messages = {
  unlocking: 'Unlocking',
  locked: 'Locked',
  price: (price: string) => `$${price}`
}

const useStyles = makeStyles(({ palette, spacing, typography }) => ({
  root: {
    ...flexRowCentered(),
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(3),
    backgroundColor: palette.accentBlue,
    borderRadius: spacing(1),
    gap: spacing(1)
  },
  text: {
    fontFamily: typography.fontByWeight.bold,
    fontSize: typography.fontSize.small,
    color: palette.staticWhite
  },
  loadingSpinner: {
    width: spacing(4),
    height: spacing(4)
  },
  usdcPurchase: {
    backgroundColor: palette.specialLightGreen
  }
}))

export const LineupTileAccessStatus = ({
  trackId,
  streamConditions
}: {
  trackId: ID
  streamConditions: AccessConditions
}) => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const isUSDCEnabled = useIsUSDCEnabled()
  const { onOpen: openPremiumContentPurchaseModal } =
    usePremiumContentPurchaseModal()
  const gatedTrackStatusMap = useSelector(getGatedContentStatusMap)
  const gatedTrackStatus = gatedTrackStatusMap[trackId]
  const staticWhite = useColor('staticWhite')
  const isUSDCPurchase =
    isUSDCEnabled && isContentUSDCPurchaseGated(streamConditions)

  const handlePress = useCallback(() => {
    if (isUSDCPurchase) {
      openPremiumContentPurchaseModal(
        { contentId: trackId, contentType: PurchaseableContentType.TRACK },
        { source: ModalSource.TrackTile }
      )
    } else if (trackId) {
      dispatch(setLockedContentId({ id: trackId }))
      dispatch(setVisibility({ drawer: 'LockedContent', visible: true }))
    }
  }, [trackId, isUSDCPurchase, openPremiumContentPurchaseModal, dispatch])

  return (
    <TouchableOpacity onPress={handlePress}>
      <View style={[styles.root, isUSDCPurchase ? styles.usdcPurchase : null]}>
        {gatedTrackStatus === 'UNLOCKING' ? (
          <LoadingSpinner style={styles.loadingSpinner} fill={staticWhite} />
        ) : (
          <IconLock fill={staticWhite} width={spacing(4)} height={spacing(4)} />
        )}
        <Text style={styles.text}>
          {isUSDCPurchase
            ? gatedTrackStatus === 'UNLOCKING'
              ? null
              : messages.price(
                  formatPrice(streamConditions.usdc_purchase.price)
                )
            : gatedTrackStatus === 'UNLOCKING'
            ? messages.unlocking
            : messages.locked}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
