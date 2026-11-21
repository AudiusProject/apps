import { useCallback, useState } from 'react'

import type { TransactionData } from './types'

export const useBuySellTransactionData = () => {
  const [transactionData, setTransactionData] = useState<TransactionData>(null)
  const [hasSufficientBalance, setHasSufficientBalance] = useState(true)

  const handleTransactionDataChange = useCallback(
    (
      data: NonNullable<TransactionData> & { isInsufficientBalance: boolean }
    ) => {
      setTransactionData(data)
      setHasSufficientBalance(!data.isInsufficientBalance)
    },
    []
  )

  const resetTransactionData = useCallback(() => {
    setTransactionData(null)
    setHasSufficientBalance(true)
  }, [])

  return {
    transactionData,
    hasSufficientBalance,
    handleTransactionDataChange,
    resetTransactionData
  }
}
