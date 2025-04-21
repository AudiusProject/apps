import { useCallback, useState } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import { accountSelectors } from '@audius/common/store'
import {
  Button,
  Flex,
  IconCloudDownload,
  Paper,
  SelectablePill
} from '@audius/harmony'
import { useSelector } from 'react-redux'

import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'

import {
  PurchasesTab,
  usePurchases
} from '../../pay-and-earn-page/components/PurchasesTab'
import { SalesTab, useSales } from '../../pay-and-earn-page/components/SalesTab'
import {
  WithdrawalsTab,
  useWithdrawals
} from '../../pay-and-earn-page/components/WithdrawalsTab'
import { TableType, TransactionHistoryPageProps } from '../types'

const { getAccountHasTracks, getIsGuestAccount } = accountSelectors

export const messages = {
  title: 'Transaction History',
  sales: 'Sales',
  purchases: 'Your Purchases',
  withdrawals: 'Withdrawal History',
  downloadCSV: 'Download CSV'
}

type TableMetadata = {
  label: string
  downloadCSV: () => void
  isDownloadCSVButtonDisabled: boolean
}

export const TransactionHistoryPage = ({
  tableView
}: TransactionHistoryPageProps) => {
  const accountHasTracks = useSelector(getAccountHasTracks)
  const isGuest = useSelector(getIsGuestAccount)
  const [tableOptions, setTableOptions] = useState<TableType[] | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null)

  // Initialize table options based on account type
  useState(() => {
    if (accountHasTracks !== null || isGuest) {
      const tableOptions = accountHasTracks
        ? [TableType.SALES, TableType.PURCHASES, TableType.WITHDRAWALS]
        : [TableType.PURCHASES, TableType.WITHDRAWALS]
      setTableOptions(tableOptions)
      setSelectedTable(tableView ?? tableOptions[0])
    }
  })

  const { isEnabled: isOwnYourFansEnabled } = useFeatureFlag(
    FeatureFlags.OWN_YOUR_FANS
  )

  const {
    count: salesCount,
    data: sales,
    fetchMore: fetchMoreSales,
    onSort: onSalesSort,
    onClickRow: onSalesClickRow,
    isEmpty: isSalesEmpty,
    isLoading: isSalesLoading,
    downloadCSV: downloadSalesCSV,
    downloadSalesAsCSVFromJSON
  } = useSales()
  const {
    count: purchasesCount,
    data: purchases,
    fetchMore: fetchMorePurchases,
    onSort: onPurchasesSort,
    onClickRow: onPurchasesClickRow,
    isEmpty: isPurchasesEmpty,
    isLoading: isPurchasesLoading,
    downloadCSV: downloadPurchasesCSV
  } = usePurchases()
  const {
    count: withdrawalsCount,
    data: withdrawals,
    fetchMore: fetchMoreWithdrawals,
    onSort: onWithdrawalsSort,
    onClickRow: onWithdrawalsClickRow,
    isEmpty: isWithdrawalsEmpty,
    isLoading: isWithdrawalsLoading,
    downloadCSV: downloadWithdrawalsCSV
  } = useWithdrawals()

  const header = <Header primary={messages.title} showBackButton />

  const tables: Record<TableType, TableMetadata> = {
    [TableType.SALES]: {
      label: messages.sales,
      downloadCSV: isOwnYourFansEnabled
        ? downloadSalesAsCSVFromJSON
        : downloadSalesCSV,
      isDownloadCSVButtonDisabled: isSalesLoading || isSalesEmpty
    },
    [TableType.PURCHASES]: {
      label: messages.purchases,
      downloadCSV: downloadPurchasesCSV,
      isDownloadCSVButtonDisabled: isPurchasesLoading || isPurchasesEmpty
    },
    [TableType.WITHDRAWALS]: {
      label: messages.withdrawals,
      downloadCSV: downloadWithdrawalsCSV,
      isDownloadCSVButtonDisabled: isWithdrawalsLoading || isWithdrawalsEmpty
    }
  }

  const handleSelectablePillClick = useCallback(
    (t: TableType) => {
      setSelectedTable(t)
    },
    [setSelectedTable]
  )

  return (
    <Page title={messages.title} header={header}>
      <Paper w='100%'>
        <Flex direction='column' w='100%'>
          <Flex
            ph='xl'
            pt='xl'
            direction='row'
            justifyContent='space-between'
            w='100%'
          >
            <Flex gap='s'>
              {tableOptions?.map((t) => (
                <SelectablePill
                  key={tables[t].label}
                  label={tables[t].label}
                  isSelected={selectedTable === t}
                  onClick={() => handleSelectablePillClick(t)}
                />
              ))}
            </Flex>
            <Button
              onClick={
                selectedTable ? tables[selectedTable].downloadCSV : undefined
              }
              variant='secondary'
              size='small'
              iconLeft={IconCloudDownload}
              disabled={
                selectedTable
                  ? tables[selectedTable].isDownloadCSVButtonDisabled
                  : true
              }
            >
              {messages.downloadCSV}
            </Button>
          </Flex>
          {selectedTable === 'withdrawals' ? (
            <WithdrawalsTab
              data={withdrawals}
              count={withdrawalsCount}
              isEmpty={isWithdrawalsEmpty}
              isLoading={isWithdrawalsLoading}
              onSort={onWithdrawalsSort}
              onClickRow={onWithdrawalsClickRow}
              fetchMore={fetchMoreWithdrawals}
            />
          ) : selectedTable === 'purchases' ? (
            <PurchasesTab
              data={purchases}
              count={purchasesCount}
              isEmpty={isPurchasesEmpty}
              isLoading={isPurchasesLoading}
              onSort={onPurchasesSort}
              onClickRow={onPurchasesClickRow}
              fetchMore={fetchMorePurchases}
            />
          ) : (
            <SalesTab
              data={sales}
              count={salesCount}
              isEmpty={isSalesEmpty}
              isLoading={isSalesLoading}
              onSort={onSalesSort}
              onClickRow={onSalesClickRow}
              fetchMore={fetchMoreSales}
            />
          )}
        </Flex>
      </Paper>
    </Page>
  )
}
