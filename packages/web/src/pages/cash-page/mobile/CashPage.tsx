import { useCallback, useContext, useEffect, useState } from 'react'

import {
  selectIsGuestAccount,
  useCurrentAccount,
  useCurrentAccountUser
} from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { FeatureFlags } from '@audius/common/services'
import {
  Button,
  Flex,
  IconCloudDownload,
  Paper,
  SelectablePill
} from '@audius/harmony'

import { useMobileHeader } from 'components/header/mobile/hooks'
import MobilePageContainer from 'components/mobile-page-container/MobilePageContainer'
import NavContext, { LeftPreset } from 'components/nav/mobile/NavContext'
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
  const { data: accountData } = useCurrentAccountUser({
    select: (user) => ({
      handle: user?.handle,
      userId: user?.user_id,
      isGuest: selectIsGuestAccount(user)
    })
  })
  const { isGuest } = accountData ?? {}
  const [tableOptions, setTableOptions] = useState<TableType[] | null>(null)
  const [selectedTable, setSelectedTable] = useState<TableType | null>(null)

  const { setLeft } = useContext(NavContext)!
  useEffect(() => {
    setLeft(LeftPreset.BACK)
  }, [setLeft])

  // Set up mobile header
  useMobileHeader({
    title: messages.title
  })

  // Initialize table options based on account type
  useState(() => {
    if (isArtist || isGuest) {
      const tableOptions = isArtist
        ? [TableType.SALES, TableType.PURCHASES, TableType.WITHDRAWALS]
        : [TableType.PURCHASES, TableType.WITHDRAWALS]
      setTableOptions(tableOptions)
      setSelectedTable(tableOptions[0])
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
    <MobilePageContainer title={messages.title} fullHeight>
      <Flex direction='column' gap='l' p='l' w='100%'>
        <CashWallet />
        <Paper w='100%'>
          <Flex direction='column' w='100%'>
            <Flex ph='l' pt='l' direction='column' gap='s' w='100%'>
              <Flex
                gap='xs'
                justifyContent='space-between'
                alignItems='center'
                w='100%'
              >
                <Flex gap='xs' style={{ overflowX: 'auto' }} pb='xs'>
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
                    selectedTable
                      ? tables[selectedTable].downloadCSV
                      : undefined
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
    </MobilePageContainer>
  )
}
