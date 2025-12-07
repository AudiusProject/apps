import { useCallback } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import {
  tippingActions,
  tippingSelectors,
  TippingSendStatus
} from '@audius/common/store'
import { Nullable } from '@audius/common/utils'
import {
  CompletionCheck,
  Modal,
  ModalHeader,
  ModalTitle
} from '@audius/harmony'
import { useDispatch } from 'react-redux'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { animated, Transition } from 'react-spring/renderprops.cjs'
import { usePrevious } from 'react-use'

import IconGoldBadge from 'assets/img/tokenBadgeGold48@2x.webp'
import { useSelector } from 'common/hooks/useSelector'
import { useManagedAccountNotAllowedCallback } from 'hooks/useManagedAccountNotAllowedRedirect'

import { ConfirmSendTip } from './ConfirmSendTip'
import { SendTip } from './SendTip'
import styles from './TipAudio.module.css'
import { TipSent } from './TipSent'
const animatedAny = animated as any
const { resetSend } = tippingActions
const { getSendStatus, getSendTipData } = tippingSelectors

const messages = {
  sendATip: 'Send Tip',
  confirm: 'Confirm',
  sending: 'Sending',
  tipSent: 'Tip Sent',
  holdOn: '⚠️ Hold On a Moment'
}

const GoldBadgeIconImage = () => (
  <img
    draggable={false}
    alt='Gold badge'
    src={IconGoldBadge}
    width={24}
    height={24}
  />
)

const titleMessagesMap: { [key in TippingSendStatus]?: string } = {
  SEND: messages.sendATip,
  CONFIRM: messages.confirm,
  SENDING: messages.sending,
  CONVERTING: messages.holdOn,
  ERROR: messages.confirm,
  SUCCESS: messages.tipSent
}

const titleIconsMap: { [key in TippingSendStatus]?: Nullable<JSX.Element> } = {
  SEND: <GoldBadgeIconImage />,
  CONFIRM: <GoldBadgeIconImage />,
  SENDING: <GoldBadgeIconImage />,
  CONVERTING: null,
  ERROR: <GoldBadgeIconImage />,
  SUCCESS: (
    <CompletionCheck
      value='complete'
      css={{ svg: { path: { fill: 'var(--harmony-white)' } } }}
    />
  )
}

const renderModalContent = (pageNumber: number) => {
  switch (pageNumber) {
    case 0:
      return <SendTip />
    case 1:
      return <ConfirmSendTip />
    case 2:
      return <TipSent />
    default:
      return null
  }
}

const statusOrder = {
  SEND: 0,
  CONFIRM: 1,
  SENDING: 1,
  CONVERTING: 1,
  ERROR: 1,
  SUCCESS: 2
}

const defaultTransitions = {
  initial: { opacity: 1, transform: 'translate3d(0%, 0, 0)' },
  enter: { opacity: 1, transform: 'translate3d(0%, 0 ,0)' }
}

const nextScreenTransition = {
  ...defaultTransitions,
  // Next screen enters from right
  from: { opacity: 0, transform: 'translate3d(100%, 0, 0)' },
  // Current screen leaves on left
  leave: { opacity: 0, transform: 'translate3d(-100%, 0, 0)' }
}

const previousScreenTransition = {
  ...defaultTransitions,
  // Previous screen enters from left
  from: { opacity: 0, transform: 'translate3d(-100%, 0, 0)' },
  // Current screen leaves on right
  leave: { opacity: 0, transform: 'translate3d(100%, 0, 0)' }
}

export const TipAudioModal = () => {
  const dispatch = useDispatch()
  const sendStatus = useSelector(getSendStatus)
  const previousSendStatus = usePrevious(sendStatus)
  const { user: recipient, onSuccessActions } = useSelector(getSendTipData)
  const { data: currentUserId } = useCurrentUserId()

  const onClose = useCallback(() => {
    // After success + close, take the user to the chat they were
    // attempting to make if they were unlocking DMs by tipping.
    // The saga will create the chat once the tip is confirmed
    if (
      onSuccessActions &&
      sendStatus === 'SUCCESS' &&
      recipient?.user_id &&
      currentUserId
    ) {
      for (const action of onSuccessActions) {
        dispatch(action)
      }
    }
    dispatch(resetSend())
  }, [
    currentUserId,
    dispatch,
    onSuccessActions,
    recipient?.user_id,
    sendStatus
  ])

  const transitions =
    !previousSendStatus ||
    !sendStatus ||
    statusOrder[sendStatus] >= statusOrder[previousSendStatus]
      ? nextScreenTransition
      : previousScreenTransition

  const isOpen = sendStatus !== null

  useManagedAccountNotAllowedCallback({ trigger: isOpen, callback: onClose })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      bodyClassName={styles.modalBody}
      dismissOnClickOutside={
        sendStatus !== 'SENDING' && sendStatus !== 'CONVERTING'
      }
    >
      <ModalHeader
        className={styles.modalHeader}
        onClose={onClose}
        dismissButtonClassName={styles.dismissButton}
        showDismissButton={
          sendStatus !== 'SENDING' && sendStatus !== 'CONVERTING'
        }
      >
        <ModalTitle
          title={sendStatus ? titleMessagesMap[sendStatus] : ''}
          icon={sendStatus ? titleIconsMap[sendStatus] : null}
          iconClassName={styles.modalTitleIcon}
        />
      </ModalHeader>
      <div className={styles.modalContentContainer}>
        <Transition
          items={sendStatus !== null ? statusOrder[sendStatus] : 0}
          initial={transitions.initial}
          from={transitions.from}
          enter={transitions.enter}
          leave={transitions.leave}
          unique={true}
        >
          {(item) => (style) => (
            <animatedAny.div style={{ ...style }}>
              {renderModalContent(item)}
            </animatedAny.div>
          )}
        </Transition>
      </div>
    </Modal>
  )
}
