import { useCallback, useEffect, useRef } from 'react'

import type { CalculationSource } from '../types/swap.types'

export type CoinChangeHandlerResult = {
  needsRecalculation: boolean
  preservedValues: {
    inputAmount: number
    outputAmount: number
    source: CalculationSource
  }
  updatePreservedValues: (values: {
    inputAmount: number
    outputAmount: number
    source: CalculationSource
  }) => void
  markForRecalculation: () => void
  clearRecalculationFlag: () => void
  onCoinsChanged: (callback: () => void) => void
}

export const useCoinChangeHandler = ({
  inputCoinAddress,
  outputCoinAddress,
  currentInputAmount,
  currentOutputAmount,
  currentSource
}: {
  inputCoinAddress?: string
  outputCoinAddress?: string
  currentInputAmount: number
  currentOutputAmount: number
  currentSource: CalculationSource
}): CoinChangeHandlerResult => {
  const tokenKeyRef = useRef(`${inputCoinAddress}-${outputCoinAddress}`)
  const needsRecalculation = useRef(false)
  const preservedValuesRef = useRef({
    inputAmount: 0,
    outputAmount: 0,
    source: null as CalculationSource
  })

  useEffect(() => {
    preservedValuesRef.current = {
      inputAmount: currentInputAmount,
      outputAmount: currentOutputAmount,
      source: currentSource
    }
  }, [currentInputAmount, currentOutputAmount, currentSource])

  useEffect(() => {
    if (!inputCoinAddress || !outputCoinAddress) return

    const currentTokenKey = `${inputCoinAddress}-${outputCoinAddress}`
    const tokensChanged = tokenKeyRef.current !== currentTokenKey

    if (tokensChanged) {
      tokenKeyRef.current = currentTokenKey
      needsRecalculation.current = true
    }
  }, [inputCoinAddress, outputCoinAddress])

  const updatePreservedValues = useCallback(
    (values: {
      inputAmount: number
      outputAmount: number
      source: CalculationSource
    }) => {
      preservedValuesRef.current = values
    },
    []
  )

  const markForRecalculation = useCallback(() => {
    needsRecalculation.current = true
  }, [])

  const clearRecalculationFlag = useCallback(() => {
    needsRecalculation.current = false
  }, [])

  const onCoinsChanged = useCallback((callback: () => void) => {
    if (needsRecalculation.current) {
      needsRecalculation.current = false
      callback()
    }
  }, [])

  return {
    needsRecalculation: needsRecalculation.current,
    preservedValues: preservedValuesRef.current,
    updatePreservedValues,
    markForRecalculation,
    clearRecalculationFlag,
    onCoinsChanged
  }
}
