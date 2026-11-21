import { useContext, useEffect } from 'react'

import { Flex, Paper, Text } from '@audius/harmony'

import Header from 'components/header/mobile/Header'
import { HeaderContext } from 'components/header/mobile/HeaderContextProvider'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import { useSubPageHeader } from 'components/nav/mobile/NavContext'

import styles from '../PayAndEarnPage.module.css'
import { PurchasesTab, usePurchases } from '../components/PurchasesTab'
import { SalesTab, useSales } from '../components/SalesTab'
import { WithdrawalsTab, useWithdrawals } from '../components/WithdrawalsTab'
import { PayAndEarnPageProps, TableType } from '../types'

const messages = {
  title: 'Pay & Earn',
  description: 'Pay & earn with Audius',
  sales: 'Sales',
  purchases: 'Purchases',
  withdrawals: 'Withdrawals'
}

export const PayAndEarnPage = ({ tableView }: PayAndEarnPageProps) => {
  const salesData = useSales()
  const purchasesData = usePurchases()
  const withdrawalsData = useWithdrawals()

  const getTableData = () => {
    switch (tableView) {
      case TableType.SALES:
        return {
          label: messages.sales,
          downloadCSV: salesData.downloadCSV,
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

  useSubPageHeader()

  const { setHeader } = useContext(HeaderContext)
  useEffect(() => {
    setHeader(<Header title={messages.title} />)
  }, [setHeader])

  return (
    <MobilePageContainer
      title={messages.title}
      description={messages.description}
      containerClassName={styles.mobilePageContainer}
    >
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
          </Flex>
          {renderTable()}
        </Flex>
      </Paper>
    </MobilePageContainer>
  )
}
