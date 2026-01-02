import { useCallback } from 'react'

import { useUser } from '@audius/common/api'
import { useIsManagedAccount } from '@audius/common/hooks'
import { USDCPurchaseDetails } from '@audius/common/models'
import {
  chatSelectors,
  chatActions,
  useInboxUnavailableModal
} from '@audius/common/store'
import { makeSolanaTransactionLink, dayjs } from '@audius/common/utils'
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  Text,
  Flex,
  IconMessage,
  IconExternalLink,
  Hint,
  IconCart
} from '@audius/harmony'
import { useDispatch } from 'react-redux'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { ExternalLink, UserLink } from 'components/link'

import { ContentLink } from './ContentLink'
import { DetailSection } from './DetailSection'
import { TransactionSummary } from './TransactionSummary'
import styles from './styles.module.css'

const { useCanCreateChat } = chatSelectors
const { createChat } = chatActions

const messages = {
  by: 'Purchased By',
  transactionDate: 'Date',
  done: 'Done',
  saleDetails: 'Sale Details',
  messageBuyer: 'Message Buyer',
  transaction: 'Explore Transaction',
  guestCheckoutHint:
    'This purchase was completed using guest checkout. Once they create an account, their profile will be visible here.'
}

type SaleModalContentProps = {
  purchaseDetails: USDCPurchaseDetails
  contentLabel: string
  contentTitle?: string
  link: string
  artwork?: string
  onClose: () => void
}

export const SaleModalContent = ({
  purchaseDetails,
  contentLabel,
  contentTitle,
  link,
  artwork,
  onClose
}: SaleModalContentProps) => {
  const dispatch = useDispatch()
  const isManagedAccount = useIsManagedAccount()
  const { onOpen: openInboxUnavailableModal } = useInboxUnavailableModal()
  const { canCreateChat } = useCanCreateChat(purchaseDetails.buyerUserId)
  const { data: partialUser } = useUser(purchaseDetails.buyerUserId, {
    select: (user) => ({
      handle: user?.handle,
      name: user?.name
    })
  })
  const isGuestUser = !partialUser?.handle && !partialUser?.name

  const handleClickMessageBuyer = useCallback(() => {
    onClose()
    if (canCreateChat) {
      dispatch(createChat({ userIds: [purchaseDetails.buyerUserId] }))
    } else {
      openInboxUnavailableModal({ userId: purchaseDetails.buyerUserId })
    }
  }, [
    canCreateChat,
    onClose,
    openInboxUnavailableModal,
    purchaseDetails,
    dispatch
  ])

  return (
    <>
      <ModalHeader>
        <ModalTitle title={messages.saleDetails} icon={<IconCart />} />
      </ModalHeader>
      <ModalContent>
        <Flex gap='l' direction='column'>
          <DetailSection
            label={contentLabel}
            actionButton={
              <DynamicImage
                image={artwork}
                wrapperClassName={styles.artworkContainer}
              />
            }
          >
            <ContentLink
              variant='visible'
              onClick={onClose}
              title={contentTitle}
              link={link}
            />
          </DetailSection>
          {isGuestUser ? (
            <Hint>{messages.guestCheckoutHint}</Hint>
          ) : (
            <DetailSection label={messages.by}>
              <UserLink
                variant='visible'
                userId={purchaseDetails.buyerUserId}
                popover
                size='l'
                onClick={onClose}
              />
            </DetailSection>
          )}
          <DetailSection
            label={messages.transactionDate}
            actionButton={
              <Button
                iconLeft={IconExternalLink}
                variant='secondary'
                size='small'
                asChild
              >
                <ExternalLink
                  to={makeSolanaTransactionLink(purchaseDetails.signature)}
                >
                  {messages.transaction}
                </ExternalLink>
              </Button>
            }
          >
            <Text variant='body' size='l'>
              {dayjs(purchaseDetails.createdAt).format('MMM DD, YYYY')}
            </Text>
          </DetailSection>
          <TransactionSummary isSale transaction={purchaseDetails} />
        </Flex>
      </ModalContent>
      <ModalFooter style={{ paddingTop: 0 }}>
        <Flex w='100%' gap='s'>
          {!isManagedAccount && !isGuestUser ? (
            <Button
              onClick={handleClickMessageBuyer}
              fullWidth
              variant='secondary'
              iconLeft={IconMessage}
            >
              {messages.messageBuyer}
            </Button>
          ) : null}
          <Button onClick={onClose} fullWidth>
            {messages.done}
          </Button>
        </Flex>
      </ModalFooter>
    </>
  )
}
