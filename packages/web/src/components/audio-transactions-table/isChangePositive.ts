import {
  TransactionDetails,
  TransactionMethod,
  TransactionType
} from '@audius/common/store'

/**
 * Whether a transaction increases the user's balance.
 *
 * Lives in its own module rather than in `AudioTransactionsTable` so that
 * consumers needing only this predicate don't pull in the table — which imports
 * `components/table` and, through it, `react-virtualized` (~638 KB of source).
 * `TransactionDetailsContent` is reachable from the eagerly-registered
 * TransactionDetails modal, so that edge landed the whole table in the entry chunk.
 */
export const isChangePositive = (tx: TransactionDetails) => {
  return (
    tx.transactionType === TransactionType.PURCHASE ||
    tx.method === TransactionMethod.RECEIVE
  )
}
