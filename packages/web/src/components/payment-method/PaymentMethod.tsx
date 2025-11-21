import { CSSProperties, ChangeEvent, useCallback } from 'react'

import { useCurrentUserId, useUserCoins } from '@audius/common/api'
import { PurchaseMethod, PurchaseVendor } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { USDC, UsdcWei } from '@audius/fixed-decimal'
import {
  FilterButton,
  Flex,
  IconArtistCoin,
  IconCreditCard,
  IconQrCode,
  IconReceive,
  Radio,
  RadioGroup,
  Text
} from '@audius/harmony'

import { MobileFilterButton } from 'components/mobile-filter-button/MobileFilterButton'
import { SummaryTable, SummaryTableItem } from 'components/summary-table'
import { useIsMobile } from 'hooks/useIsMobile'
import zIndex from 'utils/zIndex'

import { TokenPicker } from './TokenPicker'

const messages = {
  paymentMethod: 'Payment Method',
  withExistingBalance: 'Balance (USDC)',
  withCard: 'Card/Bank Account',
  withCrypto: 'USDC Transfer',
  withAnything: 'Pay with Anything',
  withAnythingHelperText: 'Pay with any Solana (SPL) token',
  showAdvanced: 'Advanced Payment Options',
  hideAdvanced: 'Advanced Payment Options',
  withArtistCoin: 'Balance (Artist Coin)'
}

type PaymentMethodProps = {
  selectedMethod: Nullable<PurchaseMethod>
  setSelectedMethod: (method: PurchaseMethod) => void
  selectedVendor: Nullable<PurchaseVendor>
  setSelectedVendor: (vendor: PurchaseVendor) => void
  selectedPurchaseMethodMintAddress?: string
  setSelectedPurchaseMethodMintAddress?: (address: string) => void
  balance?: Nullable<UsdcWei>
  isExistingBalanceDisabled?: boolean
  isCoinflowEnabled?: boolean
  isPayWithAnythingEnabled?: boolean
  showExistingBalance?: boolean
  showVendorChoice?: boolean
  totalPriceInCents?: number
}

export const PaymentMethod = ({
  selectedMethod,
  setSelectedMethod,
  selectedVendor,
  setSelectedVendor,
  selectedPurchaseMethodMintAddress,
  setSelectedPurchaseMethodMintAddress,
  balance,
  isExistingBalanceDisabled,
  showExistingBalance,
  isCoinflowEnabled,
  showVendorChoice,
  totalPriceInCents
}: PaymentMethodProps) => {
  const isMobile = useIsMobile()
  const balanceFormatted = USDC(balance ?? 0).toShorthand()
  const vendorOptions = [
    ...(isCoinflowEnabled ? [{ value: PurchaseVendor.COINFLOW }] : []),
    { value: PurchaseVendor.STRIPE }
  ]

  const handleSelectVendor = useCallback(
    (label: string) => {
      setSelectedVendor(label as PurchaseVendor)
    },
    [setSelectedVendor]
  )

  const handleOpenTokenPicker = useCallback(() => {
    setSelectedMethod(PurchaseMethod.ARTIST_COIN)
  }, [setSelectedMethod])

  const { data: currentUserId } = useCurrentUserId()
  const { data: userCoins } = useUserCoins({ userId: currentUserId })
  const hasCoinBalanceAbovePrice = userCoins?.some(
    (coin) => coin.balanceUsd * 100 >= (totalPriceInCents ?? 0)
  )

  const options = [
    showExistingBalance
      ? {
          id: PurchaseMethod.BALANCE,
          label: messages.withExistingBalance,
          icon: IconReceive,
          disabled: isExistingBalanceDisabled,
          value: (
            <Text
              tag='span' // Needed to avoid <p> inside <p> warning
              variant='title'
              color={
                selectedMethod === PurchaseMethod.BALANCE ? 'accent' : undefined
              }
            >
              ${balanceFormatted}
            </Text>
          )
        }
      : null,
    selectedPurchaseMethodMintAddress && setSelectedPurchaseMethodMintAddress
      ? {
          id: PurchaseMethod.ARTIST_COIN,
          disabled: !hasCoinBalanceAbovePrice,
          label: messages.withArtistCoin,
          icon: IconArtistCoin,
          value:
            selectedMethod === PurchaseMethod.ARTIST_COIN ? (
              <TokenPicker
                selectedTokenAddress={selectedPurchaseMethodMintAddress}
                onChange={setSelectedPurchaseMethodMintAddress}
                onOpen={handleOpenTokenPicker}
                minUsdValue={
                  totalPriceInCents ? totalPriceInCents / 100 : undefined
                }
              />
            ) : null
        }
      : null,
    {
      id: PurchaseMethod.CARD,
      label: messages.withCard,
      icon: IconCreditCard,
      value:
        vendorOptions.length > 1 && showVendorChoice ? (
          isMobile ? (
            <MobileFilterButton
              onSelect={handleSelectVendor}
              selection={selectedVendor?.toString()}
              options={vendorOptions}
              zIndex={zIndex.ADD_FUNDS_VENDOR_SELECTION_DRAWER}
            />
          ) : (
            <FilterButton
              onChange={handleSelectVendor}
              value={selectedVendor?.toString()}
              variant='replaceLabel'
              options={vendorOptions}
              menuProps={{ zIndex: zIndex.USDC_ADD_FUNDS_FILTER_BUTTON_POPUP }}
            />
          )
        ) : null
    },
    {
      id: PurchaseMethod.CRYPTO,
      label: messages.withCrypto,
      icon: IconQrCode
    }
  ].filter(Boolean) as SummaryTableItem[]

  const handleRadioChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setSelectedMethod(e.target.value as PurchaseMethod)
    },
    [setSelectedMethod]
  )

  const renderBody = (items: SummaryTableItem[]) => {
    const getFlexProps = (id: PurchaseMethod) => {
      if (isMobile && id === PurchaseMethod.CARD) {
        return {
          direction: 'column' as CSSProperties['flexDirection'],
          justifyContent: 'center',
          justifySelf: 'stretch',
          alignItems: 'flex-start'
        }
      }
      return {
        direction: 'row' as CSSProperties['flexDirection'],
        alignItems: 'center',
        alignSelf: 'stretch',
        justifyContent: 'space-between'
      }
    }

    return (
      <RadioGroup
        name={`summaryTable-label-${messages.paymentMethod}`}
        value={selectedMethod}
        onChange={handleRadioChange}
        style={{ width: '100%' }}
      >
        {items.map(({ id, label, icon: Icon, value, disabled }) => (
          <Flex
            key={id}
            {...getFlexProps(id as PurchaseMethod)}
            pv='s'
            ph='xl'
            css={{
              opacity: disabled ? 0.5 : 1,
              pointerEvents: disabled ? 'none' : 'auto'
            }}
            borderTop='default'
          >
            <Flex
              onClick={() => setSelectedMethod(id as PurchaseMethod)}
              css={{ cursor: 'pointer' }}
              h={32}
              alignItems='center'
              justifyContent='space-between'
              gap='s'
            >
              <Radio value={id} disabled={disabled} />
              {Icon ? (
                <Flex alignItems='center' ml='s'>
                  <Icon color='default' />
                </Flex>
              ) : null}
              <Text variant='body' strength='default' size='m'>
                {label}
              </Text>
            </Flex>
            <Text
              variant='body'
              css={{
                width: isMobile && id === PurchaseMethod.CARD ? '100%' : 'auto'
              }}
            >
              {value}
            </Text>
          </Flex>
        ))}
      </RadioGroup>
    )
  }

  return (
    <SummaryTable
      title={messages.paymentMethod}
      items={options}
      renderBody={renderBody}
    />
  )
}
