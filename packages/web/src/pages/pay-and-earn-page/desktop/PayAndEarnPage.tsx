import { Button, Flex, IconCloudDownload, Paper, Text } from '@audius/harmony'

import { Header } from 'components/header/desktop/Header'
import Page from 'components/page/Page'

import styles from '../PayAndEarnPage.module.css'
import { PayoutWalletCard } from '../components/PayoutWalletCard'
import { PurchasesTab, usePurchases } from '../components/PurchasesTab'
import { SalesTab, useSales } from '../components/SalesTab'
import { WithdrawalsTab, useWithdrawals } from '../components/WithdrawalsTab'
import { PayAndEarnPageProps, TableType } from '../types'

export const messages = {
  title: 'USDC Wallet',
  description: 'Pay & earn with Audius',
  sales: 'Sales',
  purchases: 'Your Purchases',
  withdrawals: 'Withdrawal History',
  downloadCSV: 'Download CSV'
}

export const PayAndEarnPage = ({ tableView }: PayAndEarnPageProps) => {
  const salesData = useSales()
  const purchasesData = usePurchases()
  const withdrawalsData = useWithdrawals()

  const header = <Header primary={messages.title} />

  const getTableData = () => {
    switch (tableView) {
      case TableType.SALES:
        return {
          label: messages.sales,
          downloadCSV: salesData.downloadSalesAsCSVFromJSON,
          isDownloadCSVButtonDisabled: salesData.isLoading || salesData.isEmpty
        }
      case TableType.PURCHASES:
        return {
          label: messages.purchases,
          downloadCSV: purchasesData.downloadCSV,
          isDownloadCSVButtonDisabled:
            purchasesData.isLoading || purchasesData.isEmpty
        }
      case TableType.WITHDRAWALS:
        return {
          label: messages.withdrawals,
          downloadCSV: withdrawalsData.downloadCSV,
          isDownloadCSVButtonDisabled:
            withdrawalsData.isLoading || withdrawalsData.isEmpty
        }
    }
  }

  const tableData = getTableData()
  const renderTable = () => {
    switch (tableView) {
      case TableType.WITHDRAWALS:
        return (
          <WithdrawalsTab
            data={withdrawalsData.data}
            count={withdrawalsData.count}
            isEmpty={withdrawalsData.isEmpty}
            isLoading={withdrawalsData.isLoading}
            onSort={withdrawalsData.onSort}
            onClickRow={withdrawalsData.onClickRow}
            fetchMore={withdrawalsData.fetchMore}
          />
        )
      case TableType.PURCHASES:
        return (
          <PurchasesTab
            data={purchasesData.data}
            count={purchasesData.count}
            isEmpty={purchasesData.isEmpty}
            isLoading={purchasesData.isLoading}
            onSort={purchasesData.onSort}
            onClickRow={purchasesData.onClickRow}
            fetchMore={purchasesData.fetchMore}
          />
        )
      case TableType.SALES:
        return (
          <SalesTab
            data={salesData.data}
            count={salesData.count}
            isEmpty={salesData.isEmpty}
            isLoading={salesData.isLoading}
            onSort={salesData.onSort}
            onClickRow={salesData.onClickRow}
            fetchMore={salesData.fetchMore}
          />
        )
    }
  }

  return (
    <Page
      title={messages.title}
      description={messages.description}
      contentClassName={styles.pageContainer}
      header={header}
    >
      <PayoutWalletCard />
      <Paper w='100%'>
        <Flex direction='column' w='100%'>
          <Flex
            ph='xl'
            pt='xl'
            direction='row'
            justifyContent='space-between'
            w='100%'
          >
            <Text variant='heading' size='l'>
              {tableData.label}
            </Text>
            <Button
              onClick={tableData.downloadCSV}
              variant='secondary'
              size='small'
              iconLeft={IconCloudDownload}
              disabled={tableData.isDownloadCSVButtonDisabled}
            >
              {messages.downloadCSV}
            </Button>
          </Flex>
          {renderTable()}
        </Flex>
      </Paper>
    </Page>
  )
}
