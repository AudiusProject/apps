import { useCallback } from 'react'

import { USDCContentPurchaseType } from '@audius/common/models'
import { registerNiceModalId } from '@audius/common/services'
import { useUSDCPurchaseDetailsModal } from '@audius/common/store'
import { Modal } from '@audius/harmony'
import NiceModal, { useModal } from '@ebay/nice-modal-react'

import { AlbumPurchaseModalContent } from './components/AlbumPurchaseModalContent'
import { AlbumSaleModalContent } from './components/AlbumSaleModalContent'
import { TrackPurchaseModalContent } from './components/TrackPurchaseModalContent'
import { TrackSaleModalContent } from './components/TrackSaleModalContent'

export const USDCPurchaseDetailsModal = NiceModal.create(() => {
  const modal = useModal()
  const isOpen = modal.visible
  const onClose = useCallback(() => modal.hide(), [modal])
  const onClosed = useCallback(() => modal.remove(), [modal])
  const { data } = useUSDCPurchaseDetailsModal()
  const { variant, purchaseDetails } = data

  if (!purchaseDetails) {
    console.error(
      `USDCPurchaseDetailsModal (${variant}) rendered with empty purchase details`
    )
    return null
  }
  return (
    <Modal isOpen={isOpen} onClose={onClose} onClosed={onClosed} size={'small'}>
      {variant === 'purchase' ? (
        purchaseDetails.contentType === USDCContentPurchaseType.TRACK ? (
          <TrackPurchaseModalContent
            purchaseDetails={purchaseDetails}
            onClose={onClose}
          />
        ) : (
          <AlbumPurchaseModalContent
            purchaseDetails={purchaseDetails}
            onClose={onClose}
          />
        )
      ) : purchaseDetails.contentType === USDCContentPurchaseType.TRACK ? (
        <TrackSaleModalContent
          purchaseDetails={purchaseDetails}
          onClose={onClose}
        />
      ) : (
        <AlbumSaleModalContent
          purchaseDetails={purchaseDetails}
          onClose={onClose}
        />
      )}
    </Modal>
  )
})

NiceModal.register('USDCPurchaseDetailsModal', USDCPurchaseDetailsModal)
registerNiceModalId('USDCPurchaseDetailsModal')
