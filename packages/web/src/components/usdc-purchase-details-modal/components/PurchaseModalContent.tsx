import { useCallback } from 'react'

import { USDCPurchaseDetails } from '@audius/common/models'
import { makeSolanaTransactionLink, dayjs } from '@audius/common/utils'
import {
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalFooter,
  Button,
  Text,
  Flex,
  IconArrowRight,
  IconExternalLink
} from '@audius/harmony'

import DynamicImage from 'components/dynamic-image/DynamicImage'
import { ExternalLink, UserLink } from 'components/link'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { ContentLink } from './ContentLink'
import { DetailSection } from './DetailSection'
import { TransactionSummary } from './TransactionSummary'
import styles from './styles.module.css'

const messages = {
  by: 'by',
  transactionDate: 'Date',
  done: 'Done',
  purchaseDetails: 'Purchase Details',
  visit: 'Visit',
  transaction: 'Explore Transaction'
}

type PurchaseModalContentProps = {
  purchaseDetails: USDCPurchaseDetails
  contentLabel: string
  contentTitle?: string
  link: string
  artwork?: string
  onClose: () => void
}

export const PurchaseModalContent = ({
  purchaseDetails,
  contentLabel,
  contentTitle,
  link,
  artwork,
  onClose
}: PurchaseModalContentProps) => {
  const navigate = useNavigateToPage()
  const onVisitClicked = useCallback(() => {
    navigate(link)
    onClose()
  }, [link, navigate, onClose])
  return (
    <>
      <ModalHeader>
        <ModalTitle title={messages.purchaseDetails} />
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
          <DetailSection label={messages.by}>
            <UserLink
              variant='visible'
              userId={purchaseDetails.sellerUserId}
              popover
              size='l'
              onClick={onClose}
            />
          </DetailSection>
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
          <TransactionSummary transaction={purchaseDetails} />
        </Flex>
      </ModalContent>
      <ModalFooter style={{ paddingTop: 0 }}>
        <Flex w='100%' gap='s'>
          <Button
            onClick={onVisitClicked}
            fullWidth
            variant='secondary'
            iconRight={IconArrowRight}
          >
            {messages.visit} {contentLabel}
          </Button>
          <Button onClick={onClose} fullWidth>
            {messages.done}
          </Button>
        </Flex>
      </ModalFooter>
    </>
  )
}
