import React, { useCallback, type ReactNode, useEffect } from 'react'

import {
  useCollection,
  useTrack,
  useUser,
  useUSDCBalance
} from '@audius/common/api'
import type { PurchaseableContentMetadata } from '@audius/common/hooks'
import {
  useRemoteVar,
  usePurchaseContentFormConfiguration,
  usePurchaseContentErrorMessage,
  usePayExtraPresets,
  PURCHASE_METHOD,
  PURCHASE_VENDOR,
  usePurchaseMethod,
  isStreamPurchaseable,
  isTrackDownloadPurchaseable,
  isContentDownloadGated,
  PURCHASE_METHOD_MINT_ADDRESS,
  useFeatureFlag
} from '@audius/common/hooks'
import type { ID, USDCPurchaseConditions } from '@audius/common/models'
import { Name, PurchaseMethod, PurchaseVendor } from '@audius/common/models'
import { IntKeys, FeatureFlags } from '@audius/common/services'
import {
  usePremiumContentPurchaseModal,
  purchaseContentActions,
  purchaseContentSelectors,
  PurchaseContentStage,
  PurchaseContentPage,
  isContentPurchaseInProgress,
  PurchaseableContentType
} from '@audius/common/store'
import type { PurchaseContentError } from '@audius/common/store'
import { AUDIO_MATCHING_REWARDS_MULTIPLIER } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { Formik, useField, useFormikContext } from 'formik'
import { Linking, View, ScrollView, TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  IconCart,
  IconCloseAlt,
  IconError,
  Button
} from '@audius/harmony-native'
import { Text } from 'app/components/core'
import Drawer from 'app/components/drawer'
import { useIsUSDCEnabled } from 'app/hooks/useIsUSDCEnabled'
import { useNavigation } from 'app/hooks/useNavigation'
import { make, track as trackEvent } from 'app/services/analytics'
import { getPurchaseVendor } from 'app/store/purchase-vendor/selectors'
import { flexRowCentered, makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useThemeColors } from 'app/utils/theme'

import LoadingSpinner from '../loading-spinner/LoadingSpinner'
import { PaymentMethod } from '../payment-method/PaymentMethod'
import { TrackDetailsTile } from '../track-details-tile'
import { USDCManualTransfer } from '../usdc-manual-transfer'

import { PayExtraFormSection } from './PayExtraFormSection'
import { PurchaseSuccess } from './PurchaseSuccess'
import { PurchaseSummaryTable } from './PurchaseSummaryTable'
import { PurchaseUnavailable } from './PurchaseUnavailable'
import { usePurchaseContentFormState } from './hooks/usePurchaseContentFormState'
import { usePurchaseSummaryValues } from './hooks/usePurchaseSummaryValues'

const { getPurchaseContentFlowStage, getPurchaseContentError } =
  purchaseContentSelectors
const { setPurchasePage, eagerCreateUserBank } = purchaseContentActions

const messages = {
  buy: 'Buy',
  title: 'Complete Purchase',
  summary: 'Summary',
  price: (price: string) => `$${price}`,
  purchasing: 'Purchasing',
  disclaimer: (termsOfUse: ReactNode) => (
    <>
      {'By proceeding, you agree to our '}
      {termsOfUse}
      {' Additional payment provider fees may apply.'}
    </>
  ),
  termsOfUse: 'Terms of Use.',
  goBack: 'Go Back'
}

const useStyles = makeStyles(({ spacing, typography, palette }) => ({
  root: {
    height: '100%',
    justifyContent: 'space-between'
  },
  formContainer: {
    flex: 1
  },
  formContentContainer: {
    paddingBottom: spacing(6)
  },
  formContentSection: {
    paddingHorizontal: spacing(4),
    gap: spacing(6),
    marginTop: spacing(4)
  },
  formActions: {
    flex: 0,
    paddingTop: spacing(4),
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(6),
    gap: spacing(4)
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: spacing(10),
    paddingHorizontal: spacing(4)
  },
  titleContainer: {
    ...flexRowCentered(),
    gap: spacing(2),
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'center',
    // Matches close icon width
    paddingRight: spacing(6)
  },
  trackTileContainer: {
    ...flexRowCentered(),
    borderColor: palette.neutralLight8,
    borderWidth: 1,
    borderRadius: spacing(2),
    backgroundColor: palette.neutralLight10
  },
  errorContainer: {
    ...flexRowCentered(),
    gap: spacing(2),
    paddingHorizontal: spacing(4)
  },
  spinnerContainer: {
    width: '100%',
    height: '90%',
    justifyContent: 'center',
    ...flexRowCentered()
  },
  disclaimer: {
    lineHeight: typography.fontSize.xs * 1.25
  },
  bottomSection: {
    gap: spacing(6)
  },
  paddingTop: {
    paddingTop: spacing(4)
  }
}))

const RenderError = ({ error: { code } }: { error: PurchaseContentError }) => {
  const styles = useStyles()
  const { accentRed } = useThemeColors()
  return (
    <View style={styles.errorContainer}>
      <IconError fill={accentRed} width={spacing(5)} height={spacing(5)} />
      <Text weight='medium' color='accentRed'>
        {usePurchaseContentErrorMessage(code)}
      </Text>
    </View>
  )
}

const PremiumContentPurchaseDrawerHeader = ({
  onClose
}: {
  onClose: () => void
}) => {
  const styles = useStyles()
  const { neutralLight2, neutralLight4 } = useThemeColors()
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity activeOpacity={0.7} onPress={onClose}>
        <IconCloseAlt
          width={spacing(6)}
          height={spacing(6)}
          fill={neutralLight4}
        />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <IconCart width={spacing(6)} height={spacing(6)} fill={neutralLight2} />
        <Text
          variant='label'
          fontSize='large'
          color='neutralLight2'
          weight='heavy'
          textTransform='uppercase'
          noGutter
        >
          {messages.title}
        </Text>
      </View>
    </View>
  )
}

const getButtonText = (isUnlocking: boolean, amountDue: number) =>
  isUnlocking
    ? messages.purchasing
    : amountDue > 0
      ? `${messages.buy} $${USDC(amountDue / 100).toLocaleString()}`
      : messages.buy

// The bulk of the form rendering is in a nested component because we want access
// to the FormikContext, which can only be used in a component which is a descendant
// of the `<Formik />` component
const RenderForm = ({
  onClose,
  content,
  contentId,
  contentType,
  purchaseConditions
}: {
  onClose: () => void
  content: PurchaseableContentMetadata
  contentId: ID
  contentType: PurchaseableContentType
  purchaseConditions: USDCPurchaseConditions
}) => {
  const navigation = useNavigation()
  const styles = useStyles()
  const dispatch = useDispatch()
  const { primaryDark2 } = useThemeColors()
  const presetValues = usePayExtraPresets()
  const { isEnabled: isCoinflowEnabled } = useFeatureFlag(
    FeatureFlags.BUY_WITH_COINFLOW
  )
  const { isEnabled: isUsdcPurchaseEnabled } = useFeatureFlag(
    FeatureFlags.USDC_PURCHASES
  )

  const { submitForm, resetForm } = useFormikContext()

  useEffect(() => {
    resetForm()
  }, [contentId, resetForm])

  // Pre-create user bank if needed so it's ready by purchase time
  useEffect(() => {
    dispatch(eagerCreateUserBank())
  }, [dispatch])

  const {
    usdc_purchase: { price }
  } = purchaseConditions

  const [{ value: purchaseMethod }, , { setValue: setPurchaseMethod }] =
    useField(PURCHASE_METHOD)

  const [, , { setValue: setPurchaseVendor }] = useField(PURCHASE_VENDOR)
  const purchaseVendor = useSelector(getPurchaseVendor)
  useEffect(() => {
    setPurchaseVendor(purchaseVendor)
  }, [purchaseVendor, setPurchaseVendor])

  const [
    { value: purchaseMethodMintAddress },
    ,
    { setValue: setPurchaseMethodMintAddress }
  ] = useField(PURCHASE_METHOD_MINT_ADDRESS)

  const { data: balance } = useUSDCBalance({
    isPolling: true,
    commitment: 'confirmed'
  })
  const { extraAmount, amountDue } = usePurchaseSummaryValues({
    price,
    currentBalance: balance
  })
  const coinflowMaximumCents = useRemoteVar(IntKeys.COINFLOW_MAXIMUM_CENTS)

  const { isExistingBalanceDisabled, totalPriceInCents } = usePurchaseMethod({
    price,
    extraAmount,
    method: purchaseMethod,
    setMethod: setPurchaseMethod
  })

  const { page, stage, error, isUnlocking, purchaseSummaryValues } =
    usePurchaseContentFormState({ price })

  const isPurchaseSuccessful = stage === PurchaseContentStage.FINISH

  // Navigate to track or album screen in the background if purchase is successful
  useEffect(() => {
    if (isPurchaseSuccessful) {
      navigation.navigate(
        contentType === PurchaseableContentType.TRACK ? 'Track' : 'Collection',
        { id: contentId }
      )
    }
  }, [contentType, isPurchaseSuccessful, navigation, contentId])

  const handleTermsPress = useCallback(() => {
    Linking.openURL('https://audius.co/legal/terms-of-use')
    trackEvent(make({ eventName: Name.PURCHASE_CONTENT_TOS_CLICKED }))
  }, [])

  const handleGoBackPress = useCallback(() => {
    dispatch(setPurchasePage({ page: PurchaseContentPage.PURCHASE }))
  }, [dispatch])

  const showCoinflow =
    isCoinflowEnabled && totalPriceInCents <= coinflowMaximumCents

  useEffect(() => {
    if (purchaseVendor === PurchaseVendor.COINFLOW && !showCoinflow) {
      setPurchaseVendor(PurchaseVendor.STRIPE)
    }
  }, [setPurchaseVendor, showCoinflow, purchaseVendor])

  const stemsPurchaseCount = isContentDownloadGated(content)
    ? (content._stems?.length ?? 0)
    : 0
  const downloadPurchaseCount =
    isContentDownloadGated(content) && content.is_downloadable ? 1 : 0
  const streamPurchaseCount = content.is_stream_gated ? 1 : 0

  return (
    <View style={styles.root}>
      {page === PurchaseContentPage.PURCHASE ? (
        <>
          <ScrollView contentContainerStyle={styles.formContentContainer}>
            <View style={styles.formContentSection}>
              <TrackDetailsTile
                trackId={contentId}
                showLabel={false}
                earnAmount={USDC(
                  (price * AUDIO_MATCHING_REWARDS_MULTIPLIER) / 100
                )
                  .round()
                  .toShorthand()}
              />
              {isPurchaseSuccessful ? null : (
                <PayExtraFormSection
                  amountPresets={presetValues}
                  disabled={isUnlocking}
                />
              )}
              <View style={styles.bottomSection}>
                <PurchaseSummaryTable
                  contentType={contentType}
                  {...purchaseSummaryValues}
                  stemsPurchaseCount={stemsPurchaseCount}
                  downloadPurchaseCount={downloadPurchaseCount}
                  streamPurchaseCount={streamPurchaseCount}
                  totalPriceInCents={totalPriceInCents}
                />
                {!isUsdcPurchaseEnabled ||
                isUnlocking ||
                isPurchaseSuccessful ? null : (
                  <PaymentMethod
                    selectedMethod={purchaseMethod}
                    setSelectedMethod={setPurchaseMethod}
                    selectedPurchaseMethodMintAddress={
                      purchaseMethodMintAddress
                    }
                    setSelectedPurchaseMethodMintAddress={
                      setPurchaseMethodMintAddress
                    }
                    balance={balance}
                    isExistingBalanceDisabled={isExistingBalanceDisabled}
                    showExistingBalance={!!(balance && balance !== BigInt(0))}
                    isCoinflowEnabled={showCoinflow}
                    showVendorChoice={false}
                    totalPriceInCents={totalPriceInCents}
                  />
                )}
              </View>
              {!isUsdcPurchaseEnabled ? (
                <PurchaseUnavailable />
              ) : isPurchaseSuccessful ? (
                <PurchaseSuccess
                  onPressViewTrack={onClose}
                  metadata={content}
                />
              ) : isUnlocking ? null : (
                <View>
                  <Text style={styles.disclaimer} fontSize='xs'>
                    {messages.disclaimer(
                      <Text
                        fontSize='xs'
                        colorValue={primaryDark2}
                        onPress={handleTermsPress}
                      >
                        {messages.termsOfUse}
                      </Text>
                    )}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </>
      ) : (
        <View style={styles.paddingTop}>
          <USDCManualTransfer amountInCents={totalPriceInCents} />
        </View>
      )}
      {isPurchaseSuccessful || !isUsdcPurchaseEnabled ? null : (
        <View style={styles.formActions}>
          {error ? <RenderError error={error} /> : null}
          {page === PurchaseContentPage.TRANSFER ? (
            <Button onPress={handleGoBackPress} variant='secondary' fullWidth>
              {messages.goBack}
            </Button>
          ) : null}
          <Button
            onPress={submitForm}
            disabled={
              isUnlocking ||
              (purchaseMethod === PurchaseMethod.CRYPTO &&
                page === PurchaseContentPage.TRANSFER &&
                amountDue > 0)
            }
            variant='primary'
            color='lightGreen'
            isLoading={isUnlocking}
            fullWidth
          >
            {getButtonText(isUnlocking, totalPriceInCents)}
          </Button>
        </View>
      )}
    </View>
  )
}

export const PremiumContentPurchaseDrawer = () => {
  const styles = useStyles()
  const dispatch = useDispatch()
  const isUSDCEnabled = useIsUSDCEnabled()
  const presetValues = usePayExtraPresets()
  const {
    data: { contentId, contentType },
    isOpen,
    onClose,
    onClosed
  } = usePremiumContentPurchaseModal()
  const isAlbum = contentType === PurchaseableContentType.ALBUM
  const { data: track, isPending: isTrackPending } = useTrack(contentId)
  const { data: album } = useCollection(contentId, {
    enabled: isAlbum
  })
  const { data: user } = useUser(track?.owner_id ?? album?.playlist_owner_id)
  const metadata = {
    ...(isAlbum ? album : track),
    user
  } as PurchaseableContentMetadata

  const stage = useSelector(getPurchaseContentFlowStage)
  const error = useSelector(getPurchaseContentError)
  const isUnlocking = !error && isContentPurchaseInProgress(stage)

  const isValidStreamGatedTrack = !!metadata && isStreamPurchaseable(metadata)
  const isValidDownloadGatedTrack =
    !!metadata && isTrackDownloadPurchaseable(metadata)

  const purchaseConditions = isValidStreamGatedTrack
    ? metadata.stream_conditions
    : isValidDownloadGatedTrack
      ? metadata.download_conditions
      : null

  const price = purchaseConditions ? purchaseConditions?.usdc_purchase.price : 0

  const { initialValues, onSubmit, validationSchema } =
    usePurchaseContentFormConfiguration({
      metadata,
      presetValues,
      price
    })

  const handleClosed = useCallback(() => {
    onClosed()
    dispatch(purchaseContentActions.cleanup())
  }, [onClosed, dispatch])

  if (
    !metadata ||
    !purchaseConditions ||
    !isUSDCEnabled ||
    !(isValidStreamGatedTrack || isValidDownloadGatedTrack)
  ) {
    console.error('PremiumContentPurchaseModal: Content is not purchasable')
    return null
  }

  return (
    <Drawer
      blockClose={isUnlocking && stage !== PurchaseContentStage.START}
      isOpen={isOpen}
      onClose={onClose}
      drawerHeader={PremiumContentPurchaseDrawerHeader}
      onClosed={handleClosed}
      isGestureSupported={false}
      isFullscreen
      dismissKeyboardOnOpen
    >
      {isTrackPending ? (
        <View style={styles.spinnerContainer}>
          <LoadingSpinner />
        </View>
      ) : (
        <View style={styles.formContainer}>
          <Formik
            initialValues={initialValues}
            validationSchema={toFormikValidationSchema(validationSchema)}
            onSubmit={onSubmit}
          >
            <RenderForm
              onClose={onClose}
              content={metadata}
              contentId={contentId}
              contentType={contentType}
              purchaseConditions={purchaseConditions}
            />
          </Formik>
        </View>
      )}
    </Drawer>
  )
}
