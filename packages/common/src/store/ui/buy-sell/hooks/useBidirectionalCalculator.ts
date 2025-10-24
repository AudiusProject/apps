/**
 * Hook for managing bidirectional swap calculations
 * Handles the core calculation logic with proper state management
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { FixedDecimal } from '@audius/fixed-decimal'

import type { CalculationSource } from '../types/swap.types'
import { performBidirectionalCalculation } from '../utils/tokenCalculations'

export type BidirectionalCalculatorResult = {
  inputAmount: string
  outputAmount: string
  numericInputAmount: number
  numericOutputAmount: number
  isCalculating: boolean
  setInputAmount: (value: string) => void
  setOutputAmount: (value: string) => void
  clearAmounts: () => void
}

/**
 * Hook that manages bidirectional calculations with exchange rates
 */
export const useBidirectionalCalculator = ({
  exchangeRate,
  source,
  isUpdateInProgress,
  inputDecimals,
  outputDecimals
}: {
  exchangeRate: number | null
  source: CalculationSource
  isUpdateInProgress: boolean
  inputDecimals: number
  outputDecimals: number
}): BidirectionalCalculatorResult => {
  const [inputAmount, setInputAmountState] = useState('')
  const [outputAmount, setOutputAmountState] = useState('')
  const [isCalculating, setIsCalculating] = useState(false)

  // Safely parse numeric values using FixedDecimal
  const numericInputAmount = useMemo(() => {
    if (!inputAmount || inputAmount === '') return 0
    try {
      const fixedDecimal = new FixedDecimal(inputAmount, inputDecimals)
      return Number(fixedDecimal.toString())
    } catch {
      return 0
    }
  }, [inputAmount, inputDecimals])

  const numericOutputAmount = useMemo(() => {
    if (!outputAmount || outputAmount === '') return 0
    try {
      const fixedDecimal = new FixedDecimal(outputAmount, outputDecimals)
      return Number(fixedDecimal.toString())
    } catch {
      return 0
    }
  }, [outputAmount, outputDecimals])

  // Calculate when exchange rate or source changes
  useEffect(() => {
    if (!exchangeRate || exchangeRate <= 0 || isUpdateInProgress || !source) {
      return
    }

    setIsCalculating(true)

    try {
      if (source === 'input' && numericInputAmount > 0) {
        const result = performBidirectionalCalculation({
          amount: numericInputAmount,
          source: 'input',
          exchangeRate
        })

        const newOutputValue =
          result.outputAmount > 0 ? result.outputAmount.toString() : ''
        setOutputAmountState(newOutputValue)
      } else if (source === 'output' && numericOutputAmount > 0) {
        const result = performBidirectionalCalculation({
          amount: numericOutputAmount,
          source: 'output',
          exchangeRate
        })

        const newInputValue =
          result.inputAmount > 0 ? result.inputAmount.toString() : ''
        setInputAmountState(newInputValue)
      }
    } finally {
      setIsCalculating(false)
    }
  }, [
    exchangeRate,
    source,
    numericInputAmount,
    numericOutputAmount,
    isUpdateInProgress
  ])

  // Handle input amount changes
  const setInputAmount = useCallback((value: string) => {
    setInputAmountState(value)
    // Source is managed externally by the state machine
  }, [])

  // Handle output amount changes
  const setOutputAmount = useCallback((value: string) => {
    setOutputAmountState(value)
    // Source is managed externally by the state machine
  }, [])

  // Clear all amounts
  const clearAmounts = useCallback(() => {
    setInputAmountState('')
    setOutputAmountState('')
  }, [])

  return {
    inputAmount,
    outputAmount,
    numericInputAmount,
    numericOutputAmount,
    isCalculating,
    setInputAmount,
    setOutputAmount,
    clearAmounts
  }
}
