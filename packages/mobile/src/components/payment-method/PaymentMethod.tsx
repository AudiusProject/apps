import { useCallback, useEffect } from 'react'

import { useCurrentUserId, useUserCoins } from '@audius/common/api'
import { PurchaseMethod, PurchaseVendor } from '@audius/common/models'
import { removeNullable } from '@audius/common/utils'
import type { Nullable } from '@audius/common/utils'
import type { UsdcWei } from '@audius/fixed-decimal'
import { USDC } from '@audius/fixed-decimal'
import { FlatList, View, TouchableOpacity } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import {
  IconCreditCard,
  IconReceive,
  Text,
  Flex,
  IconQrCode,
  IconPhantomPlain,
  IconCaretRight,
  Divider
} from '@audius/harmony-native'
import { RadioButton } from 'app/components/core'
import { useNavigation } from 'app/hooks/useNavigation'
import { getPurchaseVendor } from 'app/store/purchase-vendor/selectors'
import { setPurchaseVendor } from 'app/store/purchase-vendor/slice'
import { flexRowCentered, makeStyles } from 'app/styles'
import { spacing } from 'app/styles/spacing'
import { useColor } from 'app/utils/theme'

import { SummaryTable } from '../summary-table'
import type { SummaryTableItem } from '../summary-table/SummaryTable'

import { CardSelectionButton } from './CardSelectionButton'
import { TokenPicker } from './TokenPicker'

const messages = {
  title: 'Payment Options',
  existingBalance: 'Balance (USDC)',
  withCard: 'Card/Bank Account',
  withCrypto: 'USDC Transfer',
  withArtistCoin: 'Balance (Artist Coin)'
}

const useStyles = makeStyles(({ spacing }) => ({
  row: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(6)
  },
  rowTitle: {
    ...flexRowCentered(),
    alignItems: 'flex-start',
    gap: spacing(3)
  },
  rowTitleText: {
    ...flexRowCentered(),
    gap: spacing(2)
  },
  rowContent: {
    marginTop: spacing(3)
  },
  balance: {
    ...flexRowCentered(),
    justifyContent: 'space-between',
    flexGrow: 1
  },
  disabled: {
    opacity: 0.5
  }
}))

type PaymentMethodProps = {
  selectedMethod: Nullable<PurchaseMethod>
  setSelectedMethod: (method: PurchaseMethod) => void
  selectedPurchaseMethodMintAddress?: string
  setSelectedPurchaseMethodMintAddress?: (address: string) => void
  balance?: Nullable<UsdcWei>
  isExistingBalanceDisabled?: boolean
  showExistingBalance?: boolean
  isCoinflowEnabled?: boolean
  showVendorChoice?: boolean
  totalPriceInCents?: number
}

export const PaymentMethod = ({
  selectedMethod,
  setSelectedMethod,
  selectedPurchaseMethodMintAddress,
  setSelectedPurchaseMethodMintAddress,
  balance,
  isExistingBalanceDisabled,
  showExistingBalance,
  isCoinflowEnabled,
  showVendorChoice,
  totalPriceInCents
}: PaymentMethodProps) => {
  const styles = useStyles()
  const neutral = useColor('neutral')
  const dispatch = useDispatch()

  const balanceFormatted = USDC(balance ?? 0).toShorthand()
  const purchaseVendor = useSelector(getPurchaseVendor)
  const vendorOptions = [
    isCoinflowEnabled ? PurchaseVendor.COINFLOW : null,
    PurchaseVendor.STRIPE
  ].filter(removeNullable)

  const { data: currentUserId } = useCurrentUserId()
  const { data: userCoins } = useUserCoins({ userId: currentUserId })
  const hasCoinBalanceAbovePrice = userCoins?.some(
    (coin) => coin.balanceUsd * 100 >= (totalPriceInCents ?? 0)
  )

  // Set initial state if coinflow is enabled
  useEffect(() => {
    if (isCoinflowEnabled) {
      dispatch(setPurchaseVendor(PurchaseVendor.COINFLOW))
    }
  }, [dispatch, isCoinflowEnabled])

  const items: SummaryTableItem[] = [
    {
      id: PurchaseMethod.CARD,
      value: PurchaseMethod.CARD,
      label: <Text size='m'>{messages.withCard}</Text>,
      icon: IconCreditCard,
      content:
        vendorOptions.length > 1 && showVendorChoice ? (
          <CardSelectionButton
            selectedVendor={purchaseVendor ?? vendorOptions[0]}
          />
        ) : null
    },
    {
      id: PurchaseMethod.CRYPTO,
      value: PurchaseMethod.CRYPTO,
      label: <Text size='m'>{messages.withCrypto}</Text>,
      icon: IconQrCode
    }
  ]
  if (showExistingBalance) {
    items.unshift({
      id: PurchaseMethod.BALANCE,
      value: PurchaseMethod.BALANCE,
      label: (
        <View
          style={[
            styles.balance,
            isExistingBalanceDisabled ? styles.disabled : null
          ]}
        >
          <Text>{messages.existingBalance}</Text>
          <Text
            size='m'
            strength='strong'
            color={
              selectedMethod === PurchaseMethod.BALANCE ? 'accent' : 'default'
            }
          >
            ${balanceFormatted}
          </Text>
        </View>
      ),
      icon: () => (
        <IconReceive
          style={isExistingBalanceDisabled ? styles.disabled : null}
          width={spacing(6)}
          height={spacing(6)}
          fill={neutral}
        />
      ),
      disabled: isExistingBalanceDisabled
    })
  }

  const handleOpenTokenPicker = useCallback(() => {
    setSelectedMethod(PurchaseMethod.ARTIST_COIN)
  }, [setSelectedMethod])

  const navigation = useNavigation()

  if (
    selectedPurchaseMethodMintAddress &&
    setSelectedPurchaseMethodMintAddress
  ) {
    items.push({
      id: PurchaseMethod.ARTIST_COIN,
      value: PurchaseMethod.ARTIST_COIN,
      disabled: !hasCoinBalanceAbovePrice,
      label: (
        <Flex flex={1} gap='m'>
          <Flex direction='row' justifyContent='space-between'>
            <Text>{messages.withArtistCoin}</Text>
          </Flex>
          {selectedMethod === PurchaseMethod.ARTIST_COIN ? (
            <TouchableOpacity
              onPress={() => {
                navigation.navigate('TokenPicker')
                handleOpenTokenPicker()
              }}
              hitSlop={spacing(6)}
            >
              <Flex gap='s'>
                <Flex
                  direction='row'
                  alignItems='center'
                  justifyContent='flex-end'
                  gap='s'
                >
                  <TokenPicker
                    selectedTokenAddress={selectedPurchaseMethodMintAddress}
                    onChange={setSelectedPurchaseMethodMintAddress}
                    onOpen={handleOpenTokenPicker}
                    minUsdValue={
                      totalPriceInCents ? totalPriceInCents / 100 : undefined
                    }
                  />
                  <IconCaretRight color='subdued' size='m' />
                </Flex>
              </Flex>
            </TouchableOpacity>
          ) : null}
        </Flex>
      ),
      icon: IconPhantomPlain
    })
  }

  const renderItem = ({ item }) => {
    const { label, value, icon: Icon, content, disabled } = item
    const isSelected = value === selectedMethod
    return (
      <TouchableOpacity
        style={styles.row}
        disabled={disabled}
        onPress={() => setSelectedMethod(value)}
      >
        <View style={styles.rowTitle}>
          <RadioButton checked={isSelected} disabled={disabled} />
          <View style={styles.rowTitleText}>
            <Icon color='default' />
          </View>
          {label}
        </View>
        {isSelected && content ? (
          <View style={styles.rowContent}>{content}</View>
        ) : null}
      </TouchableOpacity>
    )
  }

  return (
    <SummaryTable
      title={messages.title}
      items={items}
      renderBody={(items: SummaryTableItem[]) => (
        <FlatList
          renderItem={renderItem}
          ItemSeparatorComponent={Divider}
          data={items}
        />
      )}
    />
  )
}
