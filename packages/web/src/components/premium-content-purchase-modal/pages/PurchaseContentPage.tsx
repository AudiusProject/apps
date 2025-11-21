import { useCallback, useEffect } from 'react'

import { useUSDCBalance } from '@audius/common/api'
import {
  useFeatureFlag,
  useRemoteVar,
  usePayExtraPresets,
  PURCHASE_METHOD,
  PURCHASE_VENDOR,
  usePurchaseMethod,
  PurchaseableContentMetadata,
  isPurchaseableAlbum,
  PURCHASE_METHOD_MINT_ADDRESS
} from '@audius/common/hooks'
import { PurchaseMethod, PurchaseVendor } from '@audius/common/models'
import { IntKeys, FeatureFlags } from '@audius/common/services'
import { PurchaseContentStage } from '@audius/common/store'
import { AUDIO_MATCHING_REWARDS_MULTIPLIER } from '@audius/common/utils'
import { USDC } from '@audius/fixed-decimal'
import { Flex, Box } from '@audius/harmony'
import { useField } from 'formik'

import { PaymentMethod } from 'components/payment-method/PaymentMethod'
import { LockedContentDetailsTile } from 'components/track/LockedContentDetailsTile'
import { useIsMobile } from 'hooks/useIsMobile'

import { PayExtraFormSection } from '../components/PayExtraFormSection'
import { PayToUnlockInfo } from '../components/PayToUnlockInfo'
import { PurchaseSummaryTable } from '../components/PurchaseSummaryTable'
import { PurchaseContentFormState } from '../hooks/usePurchaseContentFormState'
import { usePurchaseSummaryValues } from '../hooks/usePurchaseSummaryValues'

type PurchaseContentPageProps = Pick<
  PurchaseContentFormState,
  'purchaseSummaryValues' | 'stage' | 'isUnlocking'
> & {
  price: number
  metadata: PurchaseableContentMetadata
}

export const PurchaseContentPage = (props: PurchaseContentPageProps) => {
  const { price, purchaseSummaryValues, stage, isUnlocking, metadata } = props
  const payExtraAmountPresetValues = usePayExtraPresets()
  const coinflowMaximumCents = useRemoteVar(IntKeys.COINFLOW_MAXIMUM_CENTS)
  const isMobile = useIsMobile()
  const { isEnabled: isCoinflowEnabled } = useFeatureFlag(
    FeatureFlags.BUY_WITH_COINFLOW
  )

  const [{ value: purchaseMethod }, , { setValue: setPurchaseMethod }] =
    useField(PURCHASE_METHOD)
  const [{ value: purchaseVendor }, , { setValue: setPurchaseVendor }] =
    useField(PURCHASE_VENDOR)

  const [
    { value: purchaseMethodMintAddress },
    ,
    { setValue: setPurchaseMethodMintAddress }
  ] = useField(PURCHASE_METHOD_MINT_ADDRESS)
  const isPurchased = stage === PurchaseContentStage.FINISH

  const { data: balanceWei } = useUSDCBalance({
    isPolling: true,
    commitment: 'confirmed'
  })
  const { extraAmount } = usePurchaseSummaryValues({
    price,
    currentBalance: balanceWei
  })
  const { isExistingBalanceDisabled, totalPriceInCents } = usePurchaseMethod({
    price,
    extraAmount,
    method: purchaseMethod,
    setMethod: setPurchaseMethod
  })

  const handleChangeMethod = useCallback(
    (method: string) => {
      setPurchaseMethod(method as PurchaseMethod)
    },
    [setPurchaseMethod]
  )

  const handleChangeVendor = useCallback(
    (vendor: string) => {
      setPurchaseVendor(vendor as PurchaseVendor)
    },
    [setPurchaseVendor]
  )

  const showCoinflow =
    isCoinflowEnabled && totalPriceInCents <= coinflowMaximumCents

  useEffect(() => {
    if (purchaseVendor === PurchaseVendor.COINFLOW && !showCoinflow) {
      handleChangeVendor(PurchaseVendor.STRIPE)
    }
  }, [handleChangeVendor, showCoinflow, purchaseVendor])

  const isAlbumPurchase = isPurchaseableAlbum(metadata)
  const stemsPurchaseCount =
    'is_download_gated' in metadata && metadata.is_download_gated
      ? (metadata._stems?.length ?? 0)
      : 0
  const downloadPurchaseCount =
    'is_download_gated' in metadata &&
    metadata.is_download_gated &&
    metadata.is_downloadable
      ? 1
      : 0
  const streamPurchaseCount = metadata.is_stream_gated ? 1 : 0

  const isLinkDisabled =
    stage === PurchaseContentStage.START ||
    stage === PurchaseContentStage.PURCHASING ||
    stage === PurchaseContentStage.CONFIRMING_PURCHASE

  return (
    <Flex p={isMobile ? 'l' : 'xl'} pb='m'>
      <Flex direction='column' gap='xl' w='100%'>
        <LockedContentDetailsTile
          showLabel={false}
          metadata={metadata}
          owner={metadata.user}
          disabled={isLinkDisabled}
          earnAmount={USDC((price * AUDIO_MATCHING_REWARDS_MULTIPLIER) / 100)
            .round()
            .toShorthand()}
        />
        {isUnlocking || isPurchased ? null : (
          <Box ph='m'>
            <PayExtraFormSection
              amountPresets={payExtraAmountPresetValues}
              disabled={isUnlocking}
            />
          </Box>
        )}
        <PurchaseSummaryTable
          {...purchaseSummaryValues}
          stemsPurchaseCount={stemsPurchaseCount}
          downloadPurchaseCount={downloadPurchaseCount}
          streamPurchaseCount={streamPurchaseCount}
          totalPriceInCents={totalPriceInCents}
          isAlbumPurchase={isAlbumPurchase}
        />
        {isUnlocking || isPurchased ? null : (
          <PaymentMethod
            selectedMethod={purchaseMethod}
            setSelectedMethod={handleChangeMethod}
            selectedVendor={purchaseVendor}
            setSelectedVendor={handleChangeVendor}
            selectedPurchaseMethodMintAddress={purchaseMethodMintAddress}
            setSelectedPurchaseMethodMintAddress={setPurchaseMethodMintAddress}
            balance={balanceWei}
            isExistingBalanceDisabled={isExistingBalanceDisabled}
            showExistingBalance={!!(balanceWei && balanceWei > BigInt(0))}
            isCoinflowEnabled={showCoinflow}
            showVendorChoice={false}
            totalPriceInCents={totalPriceInCents}
          />
        )}
        {isUnlocking || isPurchased ? null : <PayToUnlockInfo />}
      </Flex>
    </Flex>
  )
}
