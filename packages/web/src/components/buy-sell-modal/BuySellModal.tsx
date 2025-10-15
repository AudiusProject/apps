import { useMemo, useState, useEffect } from 'react'

import { buySellMessages } from '@audius/common/messages'
import { useBuySellModal, useAddCashModal } from '@audius/common/store'
import {
  IconJupiterLogo,
  IconQuestionCircle,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  PlainButton,
  Text
} from '@audius/harmony'

import { zIndex } from '../../utils/zIndex'

import { BuySellFlow } from './BuySellFlow'
import { Screen } from './types'

export const WALLET_GUIDE_URL = 'https://help.audius.co/product/wallet-guide'

export const BuySellModal = () => {
  const { isOpen, onClose, data } = useBuySellModal()
  const { ticker, initialTab } = data
  const { onOpen: openAddCashModal } = useAddCashModal()
  const [resetState, setResetState] = useState<(() => void) | null>(null)

  const [modalScreen, setModalScreen] = useState<Screen>('input')
  const [isFlowLoading, setIsFlowLoading] = useState(false)

  // Reset modal state when modal opens
  useEffect(() => {
    if (isOpen) {
      setModalScreen('input')
      setIsFlowLoading(false)
    }
  }, [isOpen])

  const title = useMemo(() => {
    if (isFlowLoading) return ''
    if (modalScreen === 'confirm') return buySellMessages.confirmDetails
    if (modalScreen === 'success') return buySellMessages.modalSuccessTitle
    return buySellMessages.title
  }, [isFlowLoading, modalScreen])

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onClosed={resetState ?? undefined}
      size='medium'
      zIndex={zIndex.BUY_SELL_MODAL}
      dismissOnClickOutside={modalScreen !== 'confirm'}
    >
      <ModalHeader
        onClose={onClose}
        showDismissButton={!isFlowLoading && modalScreen !== 'success'}
        style={{
          borderBottom: !isFlowLoading ? undefined : 'none'
        }}
      >
        <ModalTitle title={title} />
        {modalScreen === 'input' && !isFlowLoading && (
          <PlainButton
            size='default'
            iconLeft={IconQuestionCircle}
            onClick={() => {
              window.open(WALLET_GUIDE_URL, '_blank')
            }}
            css={(theme) => ({
              position: 'absolute',
              top: theme.spacing.xl,
              right: theme.spacing.xl,
              zIndex: zIndex.BUY_SELL_MODAL + 1
            })}
          >
            {buySellMessages.help}
          </PlainButton>
        )}
      </ModalHeader>
      <ModalContent>
        <BuySellFlow
          onClose={onClose}
          openAddCashModal={openAddCashModal}
          onScreenChange={setModalScreen}
          onLoadingStateChange={setIsFlowLoading}
          initialTicker={ticker}
          initialTab={initialTab}
          setResetState={setResetState}
        />
      </ModalContent>
      {modalScreen !== 'success' && !isFlowLoading && (
        <ModalFooter
          gap='s'
          borderTop='strong'
          backgroundColor='surface1'
          pv='m'
        >
          <Text variant='label' size='xs' color='subdued'>
            {buySellMessages.poweredBy}
          </Text>
          <IconJupiterLogo />
        </ModalFooter>
      )}
    </Modal>
  )
}
