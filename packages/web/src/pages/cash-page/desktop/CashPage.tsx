import { useCallback, useState } from 'react'

import { useCurrentAccount } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import {
  Button,
  Flex,
  IconCloudDownload,
  IconWallet,
  Paper,
  SelectablePill
} from '@audius/harmony'

import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'
import { CashWallet } from 'pages/pay-and-earn-page/components/CashWallet'
import {
  PurchasesTab,
  usePurchases
} from 'pages/pay-and-earn-page/components/PurchasesTab'
import { SalesTab, useSales } from 'pages/pay-and-earn-page/components/SalesTab'
import {
  WithdrawalsTab,
  useWithdrawals
} from 'pages/pay-and-earn-page/components/WithdrawalsTab'

const messages = {
  title: 'Cash',
  sales: 'Sales',
  purchases: 'Your Purchases',
  withdrawals: 'Withdrawal History',
  downloadCSV: 'Download CSV'
}

enum TableType {
  SALES = 'sales',
  PURCHASES = 'purchases',
  WITHDRAWALS = 'withdrawals'
}

type TableMetadata = {
  label: string
  downloadCSV: () => void
  isDownloadCSVButtonDisabled: boolean
}

export const CashPage = () => {
  const { data: isArtist } = useCurrentAccount({
    select: (account) => account?.hasTracks
  })
  const [tableOptions, setTableOptions] = useState<TableType[] | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null)

  // Initialize table options based on account type
  useState(() => {
    const tableOptions = isArtist
      ? [TableType.SALES, TableType.PURCHASES, TableType.WITHDRAWALS]
      : [TableType.PURCHASES, TableType.WITHDRAWALS]
    setTableOptions(tableOptions)
    setSelectedTable(tableOptions[0])
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

  const header = <Header primary={messages.title} icon={IconWallet} />

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
      <Flex direction='column' gap='l' w='100%' mb='xl'>
        <CashWallet />
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
      </Flex>
    </Page>
  )
}
