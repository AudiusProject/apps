import { useEffect, useState } from 'react'

import { ChallengeRewardID, SolanaWalletAddress } from '@audius/common/models'
import {
  TransactionType,
  TransactionMethod,
  TransactionDetails,
  isValidSolAddress
} from '@audius/common/store'
import {
  formatCapitalizeString,
  isNullOrUndefined,
  makeSolanaAccountLink,
  makeSolanaTransactionLink
} from '@audius/common/utils'
import { wAUDIO } from '@audius/fixed-decimal'
import {
  IconExternalLink,
  IconLogoLinkByStripe as LogoStripeLink
} from '@audius/harmony'
import cn from 'classnames'

import { AudioTransactionIcon } from 'components/audio-transaction-icon'
import { isChangePositive } from 'components/audio-transactions-table/AudioTransactionsTable'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import { getChallengeConfig } from 'pages/rewards-page/config'

import { Block, BlockContainer } from './Block'
import styles from './TransactionDetailsContent.module.css'
import { TransactionPurchaseMetadata } from './TransactionPurchaseMetadata'

const messages = {
  transaction: 'Transaction',
  method: 'Method',
  date: 'Date',
  dateEarned: 'Date Earned',
  dateTransaction: 'Transaction Date',
  change: 'Change ($AUDIO)',
  balance: 'Balance ($AUDIO)',
  purchaseDescription: 'Purchased $AUDIO',
  trendingRewardDescription: 'Trending Competition Award',
  challengeRewardHeader: 'Challenge Completed',
  challengeRewardDescription: '$AUDIO Reward Earned',
  tipDescription: 'Tip',
  transferDescription: '$AUDIO ',
  transferSentHeader: 'Destination Wallet',
  transferReceivedHeader: 'Origin Wallet',
  unknown: 'Unknown'
}

const transactionDescriptions: Record<TransactionType, string> = {
  [TransactionType.PURCHASE]: messages.purchaseDescription,
  [TransactionType.TRANSFER]: messages.transferDescription,
  [TransactionType.TIP]: messages.tipDescription,
  [TransactionType.TRENDING_REWARD]: messages.trendingRewardDescription,
  [TransactionType.CHALLENGE_REWARD]: messages.challengeRewardDescription
}

const dateAndMetadataBlocks = ({
  transactionDetails,
  isValidSolanaAddress
}: {
  transactionDetails: TransactionDetails
  isValidSolanaAddress: boolean | undefined
}) => {
  switch (transactionDetails.transactionType) {
    case TransactionType.PURCHASE: {
      return (
        <>
          <TransactionPurchaseMetadata metadata={transactionDetails.metadata} />
          <Block header={messages.date}>{transactionDetails.date}</Block>
        </>
      )
    }
    case TransactionType.CHALLENGE_REWARD: {
      const challengeId = transactionDetails.metadata as ChallengeRewardID
      const challengeConfig = getChallengeConfig(challengeId)
      return (
        <>
          <Block
            className={styles.header}
            header={messages.challengeRewardHeader}
          >
            <div className={styles.challengeIcon}>{challengeConfig.icon}</div>
            {challengeConfig.title}
          </Block>
          <Block header={messages.dateEarned}>{transactionDetails.date}</Block>
        </>
      )
    }
    case TransactionType.TRENDING_REWARD: {
      return (
        <>
          <Block header={messages.dateEarned}>{transactionDetails.date}</Block>
        </>
      )
    }
    case TransactionType.TRANSFER: {
      return (
        <>
          <Block header={messages.dateTransaction}>
            {transactionDetails.date}
          </Block>
          <Block
            header={
              <a
                className={styles.link}
                href={
                  isValidSolanaAddress
                    ? makeSolanaAccountLink(transactionDetails.metadata)
                    : makeSolanaTransactionLink(transactionDetails.metadata)
                }
                target='_blank'
                title={transactionDetails.metadata}
                rel='noreferrer'
              >
                {transactionDetails.method === TransactionMethod.SEND
                  ? messages.transferSentHeader
                  : messages.transferReceivedHeader}
                <IconExternalLink />
              </a>
            }
          >
            {transactionDetails.metadata}
          </Block>
        </>
      )
    }
    case TransactionType.TIP: {
      return (
        <>
          <Block header={messages.dateTransaction}>
            {transactionDetails.date}
          </Block>
        </>
      )
    }
    default:
      return <></>
  }
}

export const TransactionDetailsContent = ({
  transactionDetails
}: {
  transactionDetails: TransactionDetails
}) => {
  const [isValidSolanaAddress, setIsValidSolanaAddress] = useState<
    undefined | boolean
  >(undefined)
  useEffect(() => {
    if (
      transactionDetails.metadata &&
      typeof transactionDetails.metadata === 'string'
    ) {
      const isValid = isValidSolAddress(
        transactionDetails.metadata as SolanaWalletAddress
      )
      setIsValidSolanaAddress(isValid)
    }
  }, [transactionDetails.metadata])
  const isLoading =
    transactionDetails.transactionType === TransactionType.PURCHASE
      ? transactionDetails.metadata === undefined
      : false
  const isNegative = !isChangePositive(transactionDetails)
  return (
    <>
      {isLoading ? (
        <div className={styles.spinnerContainer}>
          <LoadingSpinner className={styles.spinner} />
        </div>
      ) : (
        <BlockContainer>
          <div className={styles.flexHorizontal}>
            <Block header={messages.transaction}>
              {transactionDescriptions[transactionDetails.transactionType] +
                (transactionDetails.transactionType ===
                  TransactionType.TRANSFER ||
                transactionDetails.transactionType === TransactionType.TIP
                  ? formatCapitalizeString(transactionDetails.method)
                  : '')}
            </Block>
            <AudioTransactionIcon
              type={transactionDetails.transactionType}
              method={transactionDetails.method}
            />
          </div>
          {dateAndMetadataBlocks({ transactionDetails, isValidSolanaAddress })}

          {transactionDetails.transactionType === TransactionType.PURCHASE ? (
            <Block className={styles.header} header={messages.method}>
              {transactionDetails.method === TransactionMethod.STRIPE ? (
                <LogoStripeLink
                  width={145}
                  height={32}
                  className={styles.stripeLogo}
                />
              ) : (
                messages.unknown
              )}
            </Block>
          ) : null}

          <Block header={messages.change}>
            <span
              className={cn(styles.change, { [styles.negative]: isNegative })}
            >
              {isNegative ? '-' : '+'}
              {wAUDIO(BigInt(transactionDetails.change)).toLocaleString()}
            </span>
          </Block>
          {/* If user's balance is still loading or failed to load, don't show it. */}
          {isNullOrUndefined(transactionDetails.balance) ? null : (
            <Block header={messages.balance}>
              {wAUDIO(BigInt(transactionDetails.balance)).toFixed(2)}
            </Block>
          )}
        </BlockContainer>
      )}
    </>
  )
}
