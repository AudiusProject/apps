import { useCallback, useEffect, useRef } from 'react'

import { useUSDCBalance } from '@audius/common/api'
import { useFeatureFlag, useRemoteVar } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { Status } from '@audius/common/models'
import { IntKeys, FeatureFlags } from '@audius/common/services'
import {
  useWithdrawUSDCModal,
  WithdrawMethod,
  withdrawUSDCActions,
  WithdrawUSDCModalPages,
  withdrawUSDCSelectors,
  buyUSDCSelectors,
  createWithdrawUSDCFormSchema
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import { BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet'
import type { BottomSheetScrollViewMethods } from '@gorhom/bottom-sheet/lib/typescript/components/bottomSheetScrollable/types'
import BN from 'bn.js'
import type { FormikProps } from 'formik'
import { Formik, useFormikContext } from 'formik'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { Divider, Flex, Text } from '@audius/harmony-native'

import { CoinflowConfirmTransfer } from './components/CoinflowConfirmTransfer'
import { CryptoConfirmTransfer } from './components/CryptoConfirmTransfer'
import { EnterTransferDetails } from './components/EnterTransferDetails'
import { ErrorPage } from './components/ErrorPage'
import { PrepareTransfer } from './components/PrepareTransfer'
import { TransferInProgress } from './components/TransferInProgress'
import { TransferSuccessful } from './components/TransferSuccessful'
import {
  AMOUNT,
  METHOD,
  ADDRESS,
  CONFIRM,
  type WithdrawFormValues
} from './types'

const { beginWithdrawUSDC, cleanup } = withdrawUSDCActions
const { getWithdrawStatus } = withdrawUSDCSelectors
const { getRecoveryStatus } = buyUSDCSelectors

const DISABLE_DRAWER_CLOSE_PAGES = new Set([
  WithdrawUSDCModalPages.PREPARE_TRANSFER,
  WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS,
  WithdrawUSDCModalPages.COINFLOW_TRANSFER
])

const WithdrawUSDCForm = ({
  onClose,
  scrollViewRef,
  balanceNumberCents
}: {
  onClose: () => void
  scrollViewRef: React.RefObject<BottomSheetScrollViewMethods>
  balanceNumberCents: number
}) => {
  const { data } = useWithdrawUSDCModal()
  const { page } = data
  const { values } = useFormikContext<WithdrawFormValues>()
  const insets = useSafeAreaInsets()

  let formPage
  switch (page) {
    case WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS:
      formPage = (
        <EnterTransferDetails
          scrollViewRef={scrollViewRef}
          balanceNumberCents={balanceNumberCents}
        />
      )
      break
    case WithdrawUSDCModalPages.CONFIRM_TRANSFER_DETAILS:
      formPage =
        values.method === WithdrawMethod.COINFLOW ? (
          <CoinflowConfirmTransfer />
        ) : (
          <CryptoConfirmTransfer />
        )
      break
    case WithdrawUSDCModalPages.PREPARE_TRANSFER:
      formPage = <PrepareTransfer />
      break
    case WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS:
      formPage = <TransferInProgress />
      break
    case WithdrawUSDCModalPages.TRANSFER_SUCCESSFUL:
      formPage = <TransferSuccessful onDone={onClose} />
      break
    case WithdrawUSDCModalPages.ERROR:
      formPage = <ErrorPage onClose={onClose} />
      break
    default:
      formPage = (
        <EnterTransferDetails
          scrollViewRef={scrollViewRef}
          balanceNumberCents={balanceNumberCents}
        />
      )
      break
  }

  return (
    <BottomSheetScrollView
      ref={scrollViewRef}
      style={{ flex: 1 }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: insets.bottom + 20
      }}
      keyboardShouldPersistTaps='handled'
      showsVerticalScrollIndicator={false}
    >
      <Flex gap='xl' pb='xl' ph='l'>
        <Flex gap='l'>
          <Flex row justifyContent='center' pt='xl'>
            <Text variant='label' strength='strong' size='xl' color='default'>
              {walletMessages.withdrawCash}
            </Text>
          </Flex>
          <Divider orientation='horizontal' />
        </Flex>
        {formPage}
      </Flex>
    </BottomSheetScrollView>
  )
}

export const WithdrawUSDCDrawer = () => {
  const dispatch = useDispatch()
  const { isOpen, onClose, onClosed, setData, data } = useWithdrawUSDCModal()
  const { isEnabled: isCoinflowEnabled } = useFeatureFlag(
    FeatureFlags.COINFLOW_OFFRAMP_ENABLED
  )
  const minCashTransferBalanceCents = useRemoteVar(
    IntKeys.MIN_USDC_WITHDRAW_BALANCE_CENTS
  )
  const { data: balance } = useUSDCBalance()
  const balanceNumberCents = Math.floor(
    Number(
      USDC(balance ?? new BN(0))
        .floor(2)
        .toString()
    ) * 100
  )

  const bottomSheetRef = useRef<BottomSheetModal>(null)
  const scrollViewRef = useRef<BottomSheetScrollViewMethods>(null)

  const withdrawalStatus = useSelector(getWithdrawStatus)
  const recoveryStatus = useSelector(getRecoveryStatus)

  const formRef = useRef<FormikProps<WithdrawFormValues>>(null)

  useEffect(() => {
    if (withdrawalStatus === Status.ERROR) {
      setData({
        page: WithdrawUSDCModalPages.ERROR
      })
    }
  }, [withdrawalStatus, setData])

  const isClosable =
    !DISABLE_DRAWER_CLOSE_PAGES.has(data.page) &&
    withdrawalStatus !== Status.LOADING &&
    recoveryStatus !== Status.LOADING

  const handleClose = useCallback(() => {
    if (isClosable) {
      onClose()
      formRef.current?.resetForm()
      setData({ page: WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS })
      dispatch(cleanup())
      bottomSheetRef.current?.dismiss()
    }
  }, [onClose, setData, isClosable, dispatch])

  const handleClosed = useCallback(() => {
    onClosed()
  }, [onClosed])

  const handleSubmit = useCallback(
    ({ amount, method, address }: WithdrawFormValues) => {
      dispatch(
        beginWithdrawUSDC({
          amount,
          method,
          currentBalance: balanceNumberCents,
          destinationAddress: address ?? ''
        })
      )
    },
    [dispatch, balanceNumberCents]
  )

  // Open/close the bottom sheet based on modal state
  useEffect(() => {
    if (isOpen && bottomSheetRef.current) {
      bottomSheetRef.current.present()
    } else if (!isOpen && bottomSheetRef.current) {
      bottomSheetRef.current.dismiss()
    }
  }, [isOpen])

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={['85%', '95%']}
      onDismiss={handleClosed}
      android_keyboardInputMode='adjustResize'
      enablePanDownToClose={isClosable}
      enableContentPanningGesture={isClosable}
    >
      <Formik
        innerRef={formRef}
        initialValues={{
          [AMOUNT]: 0,
          [METHOD]: isCoinflowEnabled
            ? WithdrawMethod.COINFLOW
            : WithdrawMethod.MANUAL_TRANSFER,
          [ADDRESS]: '',
          [CONFIRM]: false
        }}
        validationSchema={toFormikValidationSchema(
          createWithdrawUSDCFormSchema(
            balanceNumberCents,
            minCashTransferBalanceCents
          )
        )}
        validateOnChange
        onSubmit={handleSubmit}
      >
        <WithdrawUSDCForm
          onClose={handleClose}
          scrollViewRef={scrollViewRef}
          balanceNumberCents={balanceNumberCents}
        />
      </Formik>
    </BottomSheetModal>
  )
}
