import { useCallback, useEffect } from 'react'

import {
  selectIsAccountComplete,
  useCollection,
  useCurrentAccount,
  useCurrentAccountUser,
  useTrack,
  useUser
} from '@audius/common/api'
import {
  useFeatureFlag,
  usePurchaseContentFormConfiguration,
  usePayExtraPresets,
  isStreamPurchaseable,
  isTrackDownloadPurchaseable,
  PURCHASE_METHOD,
  PurchaseableContentMetadata,
  GUEST_EMAIL
} from '@audius/common/hooks'
import {
  ID,
  PurchaseMethod,
  PurchaseVendor,
  USDCPurchaseConditions
} from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import {
  buyUSDCActions,
  usePremiumContentPurchaseModal,
  purchaseContentActions,
  purchaseContentSelectors,
  PurchaseContentStage,
  PurchaseContentPage as PurchaseContentPageType,
  isContentPurchaseInProgress,
  PurchaseableContentType,
  accountActions
} from '@audius/common/store'
import {
  ModalContentPages,
  ModalHeader,
  ModalFooter,
  IconCart,
  ModalTitle
} from '@audius/harmony'
import cn from 'classnames'
import { Formik, useField, useFormikContext } from 'formik'
import { useDispatch, useSelector } from 'react-redux'
import { useLocalStorage } from 'react-use'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { useHistoryContext } from 'app/HistoryProvider'
import * as signOnActions from 'common/store/pages/signon/actions'
import ModalDrawer from 'components/modal-drawer/ModalDrawer'
import { ModalForm } from 'components/modal-form/ModalForm'
import { USDCManualTransfer } from 'components/usdc-manual-transfer/USDCManualTransfer'
import { useIsMobile } from 'hooks/useIsMobile'
import { useIsUSDCEnabled } from 'hooks/useIsUSDCEnabled'
import { useManagedAccountNotAllowedCallback } from 'hooks/useManagedAccountNotAllowedRedirect'
import { pushUniqueRoute } from 'utils/route'
import zIndex from 'utils/zIndex'

import styles from './PremiumContentPurchaseModal.module.css'
import { PurchaseContentFormFooter } from './components/PurchaseContentFormFooter'
import { usePurchaseContentFormState } from './hooks/usePurchaseContentFormState'
import {
  GuestCheckoutFooter,
  GuestCheckoutPage
} from './pages/GuestCheckoutPage'
import { PurchaseContentPage } from './pages/PurchaseContentPage'
const { startRecoveryIfNecessary, cleanup: cleanupUSDCRecovery } =
  buyUSDCActions
const { cleanup, setPurchasePage, eagerCreateUserBank } = purchaseContentActions
const { getPurchaseContentFlowStage, getPurchaseContentError } =
  purchaseContentSelectors
const { createGuestAccount } = signOnActions

const messages = {
  guestCheckout: 'Guest Checkout',
  completePurchase: 'Complete Purchase'
}

const pageToPageIndex = (page: PurchaseContentPageType) => {
  switch (page) {
    case PurchaseContentPageType.GUEST_CHECKOUT:
      return 0
    case PurchaseContentPageType.PURCHASE:
      return 1
    case PurchaseContentPageType.TRANSFER:
      return 2
  }
}

type PremiumContentPurchaseFormProps = {
  onClose: () => void
  metadata: PurchaseableContentMetadata
  purchaseConditions: USDCPurchaseConditions
  contentId: ID
}

const PremiumContentPurchaseForm = (props: PremiumContentPurchaseFormProps) => {
  const { onClose, metadata, purchaseConditions, contentId } = props
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const { permalink } = metadata
  const {
    usdc_purchase: { price }
  } = purchaseConditions
  const { error, isUnlocking, purchaseSummaryValues, stage, page } =
    usePurchaseContentFormState({ price })
  const [, , { setValue: setPurchaseMethod }] = useField(PURCHASE_METHOD)
  const currentPageIndex = pageToPageIndex(page)

  const { submitForm, resetForm } = useFormikContext()
  const { history } = useHistoryContext()
  const { data: isAccountComplete = false } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })

  // Reset form on track change
  useEffect(() => {
    resetForm()
  }, [contentId, resetForm])

  // Navigate to track on successful purchase behind the modal
  useEffect(() => {
    if (stage === PurchaseContentStage.FINISH && permalink) {
      dispatch(pushUniqueRoute(history.location, permalink))
    }
  }, [stage, permalink, dispatch, history])

  const handleUSDCManualTransferClose = useCallback(() => {
    dispatch(setPurchasePage({ page: PurchaseContentPageType.PURCHASE }))
  }, [dispatch])

  const handleUSDCManualTransferPurchase = useCallback(() => {
    setPurchaseMethod(PurchaseMethod.BALANCE)
    submitForm()
  }, [submitForm, setPurchaseMethod])
  return (
    <ModalForm className={cn(styles.modalRoot, { [styles.mobile]: isMobile })}>
      <ModalHeader
        className={cn(styles.modalHeader, { [styles.mobile]: isMobile })}
        onClose={onClose}
        showDismissButton={!isMobile}
      >
        <ModalTitle
          icon={<IconCart />}
          title={
            page === PurchaseContentPageType.GUEST_CHECKOUT
              ? messages.guestCheckout
              : messages.completePurchase
          }
        />
      </ModalHeader>
      <ModalContentPages
        contentClassName={styles.content}
        className={styles.content}
        currentPage={
          isAccountComplete ? currentPageIndex - 1 : currentPageIndex
        }
      >
        {!isAccountComplete ? (
          <GuestCheckoutPage
            metadata={metadata}
            price={price}
            onClickSignIn={onClose}
          />
        ) : null}
        <PurchaseContentPage
          stage={stage}
          isUnlocking={isUnlocking}
          purchaseSummaryValues={purchaseSummaryValues}
          price={price}
          metadata={metadata}
        />
        <USDCManualTransfer
          onClose={handleUSDCManualTransferClose}
          amountInCents={price}
          onPurchase={handleUSDCManualTransferPurchase}
        />
      </ModalContentPages>
      <ModalFooter className={styles.footer}>
        {page === PurchaseContentPageType.GUEST_CHECKOUT ? (
          <GuestCheckoutFooter />
        ) : page === PurchaseContentPageType.PURCHASE ? (
          <PurchaseContentFormFooter
            error={error}
            isUnlocking={isUnlocking}
            onViewContentClicked={onClose}
            purchaseSummaryValues={purchaseSummaryValues}
            stage={stage}
            metadata={metadata}
          />
        ) : null}
      </ModalFooter>
    </ModalForm>
  )
}

export const PremiumContentPurchaseModal = () => {
  const dispatch = useDispatch()
  const isMobile = useIsMobile()
  const {
    isOpen,
    onClose,
    onClosed,
    data: { contentId, contentType }
  } = usePremiumContentPurchaseModal()
  const { isEnabled: isCoinflowEnabled, isLoaded: isCoinflowEnabledLoaded } =
    useFeatureFlag(FeatureFlags.BUY_WITH_COINFLOW)
  const isUSDCEnabled = useIsUSDCEnabled()
  const stage = useSelector(getPurchaseContentFlowStage)
  const error = useSelector(getPurchaseContentError)
  const isUnlocking = !error && isContentPurchaseInProgress(stage)
  const presetValues = usePayExtraPresets()
  const { data: currentUser } = useCurrentAccountUser()
  const [, setGuestEmailInLocalStorage] = useLocalStorage(GUEST_EMAIL, '')

  const { data: guestEmail } = useCurrentAccount({
    select: (account) => account?.guestEmail
  })

  const isAlbum = contentType === PurchaseableContentType.ALBUM
  const { data: track } = useTrack(contentId, { enabled: !isAlbum })

  const { data: album } = useCollection(contentId, {
    enabled: isAlbum
  })

  const { data: user } = useUser(track?.owner_id ?? album?.playlist_owner_id)

  const metadata = {
    ...(isAlbum ? album : track),
    user
  } as PurchaseableContentMetadata

  const isValidStreamGated = !!metadata && isStreamPurchaseable(metadata)
  const isValidDownloadGated =
    !!metadata && isTrackDownloadPurchaseable(metadata)

  const purchaseConditions = isValidStreamGated
    ? metadata.stream_conditions
    : isValidDownloadGated
      ? metadata.download_conditions
      : null

  const price = purchaseConditions ? purchaseConditions?.usdc_purchase.price : 0

  const { initialValues, validationSchema, onSubmit } =
    usePurchaseContentFormConfiguration({
      metadata,
      price,
      presetValues,
      purchaseVendor: isCoinflowEnabled
        ? PurchaseVendor.COINFLOW
        : PurchaseVendor.STRIPE
    })
  const handleFormSubmit = useCallback(
    (values: z.input<typeof validationSchema>) => {
      if (values.guestEmail && guestEmail !== values.guestEmail) {
        // only create guest account if email has changed
        // enable multiple purchases with same guest email
        dispatch(createGuestAccount(values.guestEmail))
        setGuestEmailInLocalStorage(values.guestEmail)
        dispatch(
          accountActions.setGuestEmail({ guestEmail: values.guestEmail })
        )
      }
      onSubmit(values)
    },
    [dispatch, guestEmail, onSubmit, setGuestEmailInLocalStorage]
  )

  const showGuestCheckout =
    (!currentUser || (currentUser && !currentUser.handle)) &&
    initialValues.guestEmail === ''

  useEffect(() => {
    if (showGuestCheckout) {
      dispatch(
        setPurchasePage({ page: PurchaseContentPageType.GUEST_CHECKOUT })
      )
    }
  }, [showGuestCheckout, dispatch])

  // On form mount, pre-create user bank if needed and check for any usdc stuck
  // in root wallet from an aborted withdrawal
  useEffect(() => {
    if (showGuestCheckout) return
    dispatch(eagerCreateUserBank())
    dispatch(startRecoveryIfNecessary())
  }, [dispatch, showGuestCheckout])

  const handleClose = useCallback(() => {
    // Don't allow closing if we're in the middle of a purchase
    if (!isUnlocking || stage === PurchaseContentStage.START) {
      onClose()
    }
  }, [isUnlocking, stage, onClose])

  const handleClosed = useCallback(() => {
    onClosed()
    dispatch(cleanup())
    dispatch(cleanupUSDCRecovery())
  }, [onClosed, dispatch])

  useManagedAccountNotAllowedCallback({
    trigger: isOpen,
    callback: handleClose
  })

  if (
    !metadata ||
    !purchaseConditions ||
    !(isValidDownloadGated || isValidStreamGated)
  ) {
    console.error('PremiumContentPurchaseModal: Content is not purchasable')
    return null
  }

  return (
    <ModalDrawer
      isOpen={isOpen}
      onClose={handleClose}
      onClosed={handleClosed}
      bodyClassName={styles.modal}
      isFullscreen
      dismissOnClickOutside
      zIndex={zIndex.PREMIUM_CONTENT_PURCHASE_MODAL}
      wrapperClassName={isMobile ? styles.mobileWrapper : undefined}
    >
      {isCoinflowEnabledLoaded && isUSDCEnabled ? (
        <Formik
          initialValues={initialValues}
          enableReinitialize
          validationSchema={toFormikValidationSchema(validationSchema)}
          validateOnBlur={false}
          validateOnChange={false}
          onSubmit={handleFormSubmit}
        >
          <PremiumContentPurchaseForm
            contentId={contentId}
            metadata={metadata}
            onClose={handleClose}
            purchaseConditions={purchaseConditions}
          />
        </Formik>
      ) : null}
    </ModalDrawer>
  )
}
