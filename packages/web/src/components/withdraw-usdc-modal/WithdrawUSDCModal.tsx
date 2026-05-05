import { useCallback, useEffect, useRef, useState } from 'react'

import { useUSDCBalance } from '@audius/common/api'
import { useFeatureFlag, useRemoteVar } from '@audius/common/hooks'
import { walletMessages } from '@audius/common/messages'
import { Name, Status } from '@audius/common/models'
import {
  IntKeys,
  FeatureFlags,
  registerNiceModalId
} from '@audius/common/services'
import {
  withdrawUSDCActions,
  withdrawUSDCSelectors,
  WithdrawUSDCModalPages,
  useWithdrawUSDCModal,
  WithdrawMethod,
  createWithdrawUSDCFormSchema
} from '@audius/common/store'
import { USDC } from '@audius/fixed-decimal'
import {
  Modal,
  ModalContent,
  ModalHeader,
  IconTransaction,
  ModalTitle
} from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'
import { Formik, FormikProps, useFormikContext } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { make, track } from 'services/analytics'

import styles from './WithdrawUSDCModal.module.css'
import { CoinflowWithdrawPage } from './components/CoinflowWithdrawPage'
import { ConfirmTransferDetails } from './components/ConfirmTransferDetails'
import { EnterTransferDetails } from './components/EnterTransferDetails'
import { ErrorPage } from './components/ErrorPage'
import { PrepareTransfer } from './components/PrepareTransfer'
import { TransferInProgress } from './components/TransferInProgress'
import { TransferSuccessful } from './components/TransferSuccessful'
import { ADDRESS, AMOUNT, CONFIRM, METHOD, WithdrawFormValues } from './types'

const { beginWithdrawUSDC, cleanup } = withdrawUSDCActions
const { getWithdrawStatus } = withdrawUSDCSelectors

const DISABLE_MODAL_CLOSE_PAGES = new Set([
  WithdrawUSDCModalPages.PREPARE_TRANSFER,
  WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS,
  WithdrawUSDCModalPages.COINFLOW_TRANSFER,
  WithdrawUSDCModalPages.CONFIRM_TRANSFER_DETAILS
])

/** Tracks form errors of interest, only sending events the first time
 * each error occurs on a changed value. For example:
 * 1. User enters invalid address: event fired
 * 2. User changes address and still invalid: no event
 * 3. User changes address and it's now valid: no event
 * 4. User changes address and it's invalid again: event fired
 */
const TrackFormErrors = ({ currentBalance }: { currentBalance: number }) => {
  const {
    errors: { [ADDRESS]: addressError },
    values: { [ADDRESS]: address }
  } = useFormikContext<WithdrawFormValues>()
  const [prevAddressError, setPrevAddressError] = useState<string>()
  if (addressError !== prevAddressError) {
    if (addressError === walletMessages.errors.invalidAddress) {
      track(
        make({
          eventName: Name.WITHDRAW_USDC_FORM_ERROR,
          error: addressError,
          value: address,
          currentBalance: currentBalance / 100
        })
      )
    }
    setPrevAddressError(addressError)
  }

  return null
}

export const WithdrawUSDCModal = NiceModal.create(() => {
  const dispatch = useDispatch()
  const modal = useModal()
  const onClose = useCallback(() => modal.hide(), [modal])
  const onClosed = onClose
  const { data, setData } = useWithdrawUSDCModal()
  const { isEnabled: isCoinflowEnabled } = useFeatureFlag(
    FeatureFlags.COINFLOW_OFFRAMP_ENABLED
  )
  const minCashTransferBalanceCents = useRemoteVar(
    IntKeys.MIN_USDC_WITHDRAW_BALANCE_CENTS
  )
  const { page } = data
  const { data: balance } = useUSDCBalance()
  const balanceNumberCents = Math.floor(
    Number(
      USDC(balance ?? 0)
        .floor(2)
        .toString()
    ) * 100
  )
  const withdrawalStatus = useSelector(getWithdrawStatus)

  useEffect(() => {
    if (withdrawalStatus === Status.ERROR) {
      setData({
        page: WithdrawUSDCModalPages.ERROR
      })
    }
  }, [withdrawalStatus, setData])

  const handleSubmit = useCallback(
    ({
      amount,
      address,
      method
    }: {
      amount: number
      address: string
      method: WithdrawMethod
    }) => {
      dispatch(
        beginWithdrawUSDC({
          amount,
          method,
          currentBalance: balanceNumberCents,
          destinationAddress: address
        })
      )
    },
    [balanceNumberCents, dispatch]
  )

  let formPage
  switch (page) {
    case WithdrawUSDCModalPages.ENTER_TRANSFER_DETAILS:
      formPage = <EnterTransferDetails />
      break
    case WithdrawUSDCModalPages.COINFLOW_TRANSFER:
      formPage = <CoinflowWithdrawPage />
      break
    case WithdrawUSDCModalPages.CONFIRM_TRANSFER_DETAILS:
      formPage = <ConfirmTransferDetails />
      break
    case WithdrawUSDCModalPages.PREPARE_TRANSFER:
      formPage = <PrepareTransfer />
      break
    case WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS:
      formPage = <TransferInProgress />
      break
    case WithdrawUSDCModalPages.TRANSFER_SUCCESSFUL:
      formPage = <TransferSuccessful onClickDone={onClose} />
      break
    case WithdrawUSDCModalPages.ERROR:
      formPage = <ErrorPage onClose={onClose} />
      break
  }

  const formRef = useRef<FormikProps<WithdrawFormValues>>(null)

  const handleOnClosed = useCallback(() => {
    dispatch(cleanup())
    onClosed()
    formRef.current?.resetForm()
  }, [dispatch, onClosed, formRef])

  return (
    <Modal
      size='medium'
      isOpen={modal.visible}
      onClose={onClose}
      onClosed={handleOnClosed}
      dismissOnClickOutside={!DISABLE_MODAL_CLOSE_PAGES.has(page)}
      bodyClassName={styles.modal}
    >
      {page !== WithdrawUSDCModalPages.TRANSFER_IN_PROGRESS ? (
        <ModalHeader
          onClose={onClose}
          showDismissButton={!DISABLE_MODAL_CLOSE_PAGES.has(page)}
        >
          <ModalTitle
            icon={<IconTransaction />}
            title={walletMessages.withdrawCash}
          />
        </ModalHeader>
      ) : null}
      <ModalContent>
        <Formik
          innerRef={formRef}
          initialValues={{
            [AMOUNT]: 0,
            [ADDRESS]: '',
            [CONFIRM]: false,
            [METHOD]: isCoinflowEnabled
              ? WithdrawMethod.COINFLOW
              : WithdrawMethod.MANUAL_TRANSFER
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
          <>
            {formPage}
            <TrackFormErrors currentBalance={balanceNumberCents} />
          </>
        </Formik>
      </ModalContent>
    </Modal>
  )
})

NiceModal.register('WithdrawUSDCModal', WithdrawUSDCModal)
registerNiceModalId('WithdrawUSDCModal')
