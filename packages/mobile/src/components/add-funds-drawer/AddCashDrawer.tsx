import React, { useCallback, useState } from 'react'

import { DEFAULT_PURCHASE_AMOUNT_CENTS } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { PurchaseMethod, PurchaseVendor } from '@audius/common/models'
import { buyUSDCActions, useAddCashModal } from '@audius/common/store'
import { Portal } from '@gorhom/portal'
import { useDispatch, useSelector } from 'react-redux'

import { Button, Flex, Text } from '@audius/harmony-native'
import Drawer from 'app/components/drawer'
import { getPurchaseVendor } from 'app/store/purchase-vendor/selectors'
import { reset as resetPurchaseMethod } from 'app/store/purchase-vendor/slice'

import { PaymentMethod } from '../payment-method/PaymentMethod'
import { USDCManualTransfer } from '../usdc-manual-transfer/USDCManualTransfer'

import { CashBalanceSection } from './CashBalanceSection'
import { StripeSection } from './StripeSection'

enum AddCashDrawerPage {
  MAIN = 'MAIN',
  TRANSFER = 'TRANSFER'
}

const messages = {
  continue: 'Continue'
}

export const AddCashDrawer = () => {
  const dispatch = useDispatch()
  const purchaseVendorState = useSelector(getPurchaseVendor)
  const {
    isOpen,
    onClose,
    onClosed,
    data: { portalHostName }
  } = useAddCashModal()

  const [selectedPurchaseMethod, setSelectedPurchaseMethod] =
    useState<PurchaseMethod>(PurchaseMethod.CARD)
  const [page, setPage] = useState<AddCashDrawerPage>(AddCashDrawerPage.MAIN)

  const openCardFlow = useCallback(() => {
    dispatch(
      buyUSDCActions.onrampOpened({
        vendor: purchaseVendorState ?? PurchaseVendor.STRIPE,
        purchaseInfo: {
          desiredAmount: DEFAULT_PURCHASE_AMOUNT_CENTS
        }
      })
    )
  }, [dispatch, purchaseVendorState])

  const onContinuePress = useCallback(() => {
    if (selectedPurchaseMethod === PurchaseMethod.CARD) {
      openCardFlow()
    } else if (selectedPurchaseMethod === PurchaseMethod.CRYPTO) {
      setPage(AddCashDrawerPage.TRANSFER)
    }
  }, [selectedPurchaseMethod, openCardFlow])

  const handleClose = useCallback(() => {
    dispatch(resetPurchaseMethod())
    onClose()
  }, [dispatch, onClose])

  const content = (
    <Drawer isOpen={isOpen} onClose={handleClose} onClosed={onClosed}>
      <Flex gap='xl' pb='xl'>
        {page === AddCashDrawerPage.MAIN ? (
          <>
            <Flex row justifyContent='center' pt='xl'>
              <Text variant='label' strength='strong' size='xl' color='default'>
                {walletMessages.addCash}
              </Text>
            </Flex>
            <StripeSection />
            <Flex ph='l' gap='xl'>
              <CashBalanceSection />
              <PaymentMethod
                selectedMethod={selectedPurchaseMethod}
                setSelectedMethod={setSelectedPurchaseMethod}
                showVendorChoice
                showExtraItemsToggle={false}
              />
              <Button onPress={onContinuePress} fullWidth>
                {messages.continue}
              </Button>
            </Flex>
          </>
        ) : (
          <>
            <Flex
              row
              justifyContent='center'
              borderBottom='default'
              pt='xl'
              pb='l'
              mh='l'
            >
              <Text variant='label' strength='strong' size='xl' color='default'>
                {walletMessages.usdcTransfer}
              </Text>
            </Flex>
            <USDCManualTransfer />
          </>
        )}
      </Flex>
    </Drawer>
  )

  return portalHostName ? (
    <Portal hostName={portalHostName}>{content}</Portal>
  ) : (
    content
  )
}
