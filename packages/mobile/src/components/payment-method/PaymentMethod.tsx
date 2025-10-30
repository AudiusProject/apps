import { useCallback, useEffect } from 'react'

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
  withCard: 'Credit/Debit/Bank Account',
  withCrypto: 'USDC Transfer',
  withAnything: 'Pay with Anything',
  withAnyToken: 'Pay with any Solana token',
  showAdvanced: 'Show advanced options',
  hideAdvanced: 'Hide advanced options'
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
  isPayWithAnythingEnabled?: boolean
  showVendorChoice?: boolean
  showExtraItemsToggle?: boolean
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
  isPayWithAnythingEnabled,
  showVendorChoice,
  showExtraItemsToggle = true
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
    setSelectedMethod(PurchaseMethod.WALLET)
  }, [setSelectedMethod])

  const extraItems = [
    {
      id: PurchaseMethod.CRYPTO,
      value: PurchaseMethod.CRYPTO,
      label: <Text size='m'>{messages.withCrypto}</Text>,
      icon: IconQrCode
    }
  ]

  const navigation = useNavigation()

  if (
    isPayWithAnythingEnabled &&
    selectedPurchaseMethodMintAddress &&
    setSelectedPurchaseMethodMintAddress
  ) {
    extraItems.push({
      id: PurchaseMethod.WALLET,
      value: PurchaseMethod.WALLET,
      label: (
        <Flex flex={1} gap='m'>
          <Flex direction='row' justifyContent='space-between'>
            <Text>{messages.withAnything}</Text>
          </Flex>
          {selectedMethod === PurchaseMethod.WALLET ? (
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
                  justifyContent='space-between'
                  alignItems='center'
                >
                  <Text strength='strong'>{messages.withAnyToken}</Text>
                  <IconCaretRight color='subdued' size='m' />
                </Flex>
                <Flex direction='row' justifyContent='space-between'>
                  <TokenPicker
                    selectedTokenAddress={selectedPurchaseMethodMintAddress}
                    onChange={setSelectedPurchaseMethodMintAddress}
                    onOpen={handleOpenTokenPicker}
                  />
                </Flex>
              </Flex>
            </TouchableOpacity>
          ) : null}
        </Flex>
      ),
      icon: IconPhantomPlain
    })
  }

  // NEW: If showExtraItemsToggle is false, append extraItems to items
  const summaryTableItems = showExtraItemsToggle
    ? items
    : [...items, ...extraItems]
  const summaryTableExtraItems = showExtraItemsToggle ? extraItems : undefined

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
      items={summaryTableItems}
      extraItems={summaryTableExtraItems}
      showExtraItemsCopy={messages.showAdvanced}
      disableExtraItemsToggle={
        showExtraItemsToggle &&
        (selectedMethod === PurchaseMethod.WALLET ||
          selectedMethod === PurchaseMethod.CRYPTO)
      }
      hideExtraItemsCopy={messages.hideAdvanced}
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
