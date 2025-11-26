import { InAppAudioPurchaseMetadata } from '@audius/common/store'
import { makeSolanaTransactionLink, Nullable } from '@audius/common/utils'
import { IconExternalLink } from '@audius/harmony'

import { IconUSD, IconSOL, IconAUDIO } from 'components/shared-icons/Icons'

import { BlockContainer, Block } from './Block'
import styles from './TransactionPurchaseMetadata.module.css'

const messages = {
  cost: 'Cost',
  purchased: 'Purchased',
  convertedTo: 'Converted To',
  viewOnExplorer: 'View on Solana Explorer',
  usd: 'USD',
  sol: 'SOL',
  audio: '$AUDIO'
}

export const TransactionPurchaseMetadata = ({
  metadata
}: {
  metadata?: Nullable<InAppAudioPurchaseMetadata>
}) => {
  return (
    <BlockContainer>
      <Block header={messages.cost}>
        <IconUSD />
        <span className={styles.amount}>
          {metadata?.usd
            ? Number(metadata.usd).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })
            : '?'}
        </span>
        <span className={styles.label}>{messages.usd}</span>
      </Block>
      <Block
        header={
          metadata?.purchaseTransactionId ? (
            <a
              className={styles.link}
              href={makeSolanaTransactionLink(metadata.purchaseTransactionId)}
              target='_blank'
              title={messages.viewOnExplorer}
              rel='noreferrer'
            >
              {messages.purchased} <IconExternalLink />
            </a>
          ) : (
            messages.purchased
          )
        }
      >
        <IconSOL />
        <span className={styles.amount}>
          {metadata?.sol
            ? Number(metadata.sol).toLocaleString(undefined, {
                maximumFractionDigits: 2
              })
            : '?'}
        </span>
        <span className={styles.label}>{messages.sol}</span>
      </Block>
      <Block
        header={
          metadata?.swapTransactionId ? (
            <a
              className={styles.link}
              href={makeSolanaTransactionLink(metadata.swapTransactionId)}
              target='_blank'
              title={messages.viewOnExplorer}
              rel='noreferrer'
            >
              {messages.convertedTo} <IconExternalLink />
            </a>
          ) : (
            messages.convertedTo
          )
        }
      >
        <IconAUDIO />
        <span className={styles.amount}>
          {metadata?.audio
            ? Number(metadata.audio).toLocaleString(undefined, {
                maximumFractionDigits: 2
              })
            : '?'}
        </span>
        <span className={styles.label}>{messages.audio}</span>
      </Block>
    </BlockContainer>
  )
}
