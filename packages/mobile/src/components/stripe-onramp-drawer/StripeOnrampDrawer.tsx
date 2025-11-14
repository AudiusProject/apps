import { useCallback } from 'react'

import {
  stripeModalUIActions,
  stripeModalUISelectors
} from '@audius/common/store'
import { Portal } from '@gorhom/portal'
import { TouchableOpacity, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { IconCloseAlt } from '@audius/harmony-native'
import { makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'
import { zIndex } from 'app/utils/zIndex'

import { AppDrawer } from '../drawer/AppDrawer'

import { StripeOnrampEmbed } from './StripeOnrampEmbed'

const { cancelStripeOnramp } = stripeModalUIActions
const { getStripeModalState } = stripeModalUISelectors

export const MODAL_NAME = 'StripeOnRamp'

const useStyles = makeStyles(({ spacing, palette }) => ({
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLight8,
    height: spacing(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: spacing(4)
  },
  contentContainer: {
    paddingTop: spacing(6),
    flex: 1
  },
  exitContainer: {
    justifyContent: 'flex-start',
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(2)
  }
}))

const StripeOnrampDrawerHeader = ({ onClose }: { onClose: () => void }) => {
  const styles = useStyles()
  const { neutralLight4 } = useThemeColors()
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
        <IconCloseAlt
          width={spacing(6)}
          height={spacing(6)}
          fill={neutralLight4}
        />
      </TouchableOpacity>
    </View>
  )
}

export const StripeOnrampDrawer = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const { stripeSessionStatus, portalHostName } =
    useSelector(getStripeModalState)

  const handleClose = useCallback(() => {
    dispatch(cancelStripeOnramp())
  }, [dispatch])

  const drawer = (
    <AppDrawer
      blockClose={stripeSessionStatus === 'fulfillment_processing'}
      drawerHeader={StripeOnrampDrawerHeader}
      zIndex={zIndex.STRIPE_ONRAMP_DRAWER}
      modalName={MODAL_NAME}
      isGestureSupported={false}
      isFullscreen
      onClose={handleClose}
    >
      <View style={styles.contentContainer}>
        <StripeOnrampEmbed />
      </View>
    </AppDrawer>
  )

  return portalHostName ? (
    <Portal hostName={portalHostName}>{drawer}</Portal>
  ) : (
    drawer
  )
}
