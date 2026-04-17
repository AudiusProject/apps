import { useCallback, useState } from 'react'

import {
  DEFAULT_AUDIO_TRANSACTIONS_BATCH_SIZE,
  useAudioTransactions,
  useAudioTransactionsCount
} from '@audius/common/api'
import {
  transactionDetailsActions,
  TransactionDetails
} from '@audius/common/store'
import { Flex, IconCaretRight, Paper, PlainButton, Text } from '@audius/harmony'
import {
  GetAudioTransactionsSortMethodEnum,
  GetAudioTransactionsSortDirectionEnum
} from '@audius/sdk'
import { useDispatch } from 'react-redux'

import { useSetVisibility } from 'common/hooks/useModalState'
import { AudioTransactionsTable } from 'components/audio-transactions-table'
import EmptyTable from 'components/tracks-table/EmptyTable'
import { useMainContentRef } from 'pages/MainContentContext'

const { fetchTransactionDetailsSucceeded } = transactionDetailsActions

const messages = {
  pageTitle: 'Audio Transactions History',
  pageDescription: 'View your transactions history',
  emptyTableText: "You don't have any $AUDIO transactions yet.",
  emptyTableSecondaryText: "Once you have, this is where you'll find them!",
  headerText: '$AUDIO Transactions',
  disclaimer:
    'Transactions history does not include balances from linked wallets',
  moreInfo: 'More Info'
}

const AUDIO_TRANSACTIONS_SHOW_MORE_LIMIT = 5

const Disclaimer = () => {
  const setVisibility = useSetVisibility()
  return (
    <Paper
      shadow='mid'
      ph='xl'
      pv='l'
      alignItems='center'
      justifyContent='space-between'
    >
      <Text size='l' strength='strong'>
        {messages.disclaimer}
      </Text>
      <PlainButton
        variant='subdued'
        iconRight={IconCaretRight}
        onClick={() => setVisibility('AudioBreakdown')(true)}
      >
        {messages.moreInfo}
      </PlainButton>
    </Paper>
  )
}

export const AudioWalletTransactions = () => {
  const [sortMethod, setSortMethod] =
    useState<GetAudioTransactionsSortMethodEnum>(
      GetAudioTransactionsSortMethodEnum.Date
    )
  const [sortDirection, setSortDirection] =
    useState<GetAudioTransactionsSortDirectionEnum>(
      GetAudioTransactionsSortDirectionEnum.Desc
    )
  const mainContentRef = useMainContentRef()
  const dispatch = useDispatch()
  const setVisibility = useSetVisibility()

  const { data: audioTransactionsCount = 0, isPending: isCountLoading } =
    useAudioTransactionsCount()

  const requestedPageSize =
    audioTransactionsCount > 0
      ? audioTransactionsCount
      : DEFAULT_AUDIO_TRANSACTIONS_BATCH_SIZE

  const { data: audioTransactions = [], isPending: isTransactionsLoading } =
    useAudioTransactions(
      {
        page: 0,
        pageSize: requestedPageSize,
        sortMethod,
        sortDirection
      },
      { refetchOnMount: 'always' }
    )

  // Defaults: sort method = date, sort direction = desc
  const onSort = useCallback(
    (sortMethodInner: string, sortDirectionInner: string) => {
      const sortMethodRes =
        sortMethodInner === 'type'
          ? GetAudioTransactionsSortMethodEnum.TransactionType
          : GetAudioTransactionsSortMethodEnum.Date
      setSortMethod(sortMethodRes)
      const sortDirectionRes =
        sortDirectionInner === 'asc'
          ? GetAudioTransactionsSortDirectionEnum.Asc
          : GetAudioTransactionsSortDirectionEnum.Desc
      setSortDirection(sortDirectionRes)
    },
    [setSortMethod, setSortDirection]
  )

  const onClickRow = useCallback(
    (txDetails: TransactionDetails) => {
      dispatch(
        fetchTransactionDetailsSucceeded({
          transactionId: txDetails.signature,
          transactionDetails: txDetails
        })
      )
      setVisibility('TransactionDetails')(true)
    },
    [dispatch, setVisibility]
  )

  const tableLoading = isTransactionsLoading || isCountLoading
  const isEmpty = audioTransactions.length === 0

  return (
    <Flex column gap='2xl' w='100%'>
      <Disclaimer />
      {isEmpty && !tableLoading ? (
        <EmptyTable
          primaryText={messages.emptyTableText}
          secondaryText={messages.emptyTableSecondaryText}
        />
      ) : (
        <AudioTransactionsTable
          data={audioTransactions}
          loading={tableLoading}
          onSort={onSort}
          onClickRow={onClickRow}
          showMoreLimit={AUDIO_TRANSACTIONS_SHOW_MORE_LIMIT}
          scrollRef={mainContentRef}
        />
      )}
    </Flex>
  )
}
