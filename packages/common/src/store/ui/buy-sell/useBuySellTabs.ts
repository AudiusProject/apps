import { useCallback, useState } from 'react'

import type { BuySellTab, Screen } from './types'

type UseBuySellTabsProps = {
  setCurrentScreen: (screen: Screen) => void
  resetTransactionData: () => void
  initialTab?: BuySellTab
}

export const useBuySellTabs = (props: UseBuySellTabsProps) => {
  const { setCurrentScreen, resetTransactionData, initialTab = 'buy' } = props
  const [activeTab, setActiveTab] = useState<BuySellTab>(initialTab)

  const handleActiveTabChange = useCallback(
    (newTab: string) => {
      setActiveTab(newTab as BuySellTab)
      setCurrentScreen('input')
      resetTransactionData()
    },
    [setCurrentScreen, resetTransactionData]
  )

  return {
    activeTab,
    handleActiveTabChange,
    resetTransactionData
  }
}
