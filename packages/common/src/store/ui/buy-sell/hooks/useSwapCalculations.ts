/**
 * Simplified hook for managing bidirectional swap calculations
 * Orchestrates smaller, focused hooks for better maintainability
 */

import { useCallback, useEffect } from 'react'

import type { SwapCalculationsHookResult } from '../types/swap.types'
import { isValidNumericInput } from '../utils/tokenCalculations'

import { useBidirectionalCalculator } from './useBidirectionalCalculator'
import { useCalculationStateMachine } from './useCalculationStateMachine'
import { useCoinChangeHandler } from './useCoinChangeHandler'

export type UseSwapCalculationsProps = {
  exchangeRate: number | null
  onInputValueChange?: (value: string) => void
  inputCoinAddress?: string
  outputCoinAddress?: string
  inputCoinDecimals: number
  outputCoinDecimals: number
}

/**
 * Main hook that orchestrates bidirectional swap calculations
 * Now simplified by using focused sub-hooks
 */
export const useSwapCalculations = ({
  exchangeRate,
  onInputValueChange,
  inputCoinAddress,
  outputCoinAddress,
  inputCoinDecimals,
  outputCoinDecimals
}: UseSwapCalculationsProps): SwapCalculationsHookResult => {
  // Validate that decimals are provided
  if (inputCoinDecimals == null || outputCoinDecimals == null) {
    throw new Error('Coin decimals must be provided for accurate calculations')
  }
  // State machine for tracking calculation source
  const stateMachine = useCalculationStateMachine()

  // Calculator for handling bidirectional calculations
  const calculator = useBidirectionalCalculator({
    exchangeRate,
    source: stateMachine.source, // either input or output
    isUpdateInProgress: stateMachine.isUpdateInProgress,
    inputDecimals: inputCoinDecimals,
    outputDecimals: outputCoinDecimals
  })
  const { setOutputAmount } = calculator

  // Token change handler for managing token switches
  const coinHandler = useCoinChangeHandler({
    inputCoinAddress,
    outputCoinAddress,
    currentInputAmount: calculator.numericInputAmount,
    currentOutputAmount: calculator.numericOutputAmount,
    currentSource: stateMachine.source
  })

  // Handle token changes with recalculation
  useEffect(() => {
    coinHandler.onCoinsChanged(() => {
      const { preservedValues } = coinHandler

      if (
        preservedValues.source === 'input' &&
        preservedValues.inputAmount > 0
      ) {
        // Recalculate output based on preserved input
        stateMachine.setSource('input')
        calculator.setInputAmount(preservedValues.inputAmount.toString())
      } else if (
        preservedValues.source === 'output' &&
        preservedValues.outputAmount > 0
      ) {
        // Recalculate input based on preserved output
        stateMachine.setSource('output')
        calculator.setOutputAmount(preservedValues.outputAmount.toString())
        // Don't call onInputValueChange here since we're focused on output field
      }

      // Clear output for visual feedback on token change
      if (preservedValues.source === 'input') {
        calculator.setOutputAmount('')
      }
    })
  }, [stateMachine, calculator, onInputValueChange, coinHandler])

  // Clear output when exchange rate becomes unavailable
  useEffect(() => {
    if (!exchangeRate || exchangeRate <= 0) {
      if (stateMachine.source !== 'output') {
        setOutputAmount('')
      }
    }
  }, [exchangeRate, stateMachine.source, setOutputAmount])

  // Handle input changes from user
  const handleInputChange = useCallback(
    (value: string) => {
      if (!isValidNumericInput(value)) {
        return
      }

      stateMachine.beginUpdate()
      stateMachine.setSource('input')
      stateMachine.endUpdate()
      calculator.setInputAmount(value)
      onInputValueChange?.(value)
    },
    [stateMachine, calculator, onInputValueChange]
  )

  // Handle output changes from user
  const handleOutputChange = useCallback(
    (value: string) => {
      if (!isValidNumericInput(value)) {
        return
      }

      stateMachine.beginUpdate()
      stateMachine.setSource('output')
      stateMachine.endUpdate()
      calculator.setOutputAmount(value)
    },
    [stateMachine, calculator]
  )

  // Reset calculations
  const resetCalculations = useCallback(() => {
    stateMachine.reset()
    calculator.clearAmounts()
  }, [stateMachine, calculator])

  return {
    // Form values
    inputAmount: calculator.inputAmount,
    outputAmount: calculator.outputAmount,
    numericInputAmount: calculator.numericInputAmount,
    numericOutputAmount: calculator.numericOutputAmount,

    // State
    calculationSource: stateMachine.source,
    isCalculating: calculator.isCalculating,

    // Handlers
    handleInputChange,
    handleOutputChange,
    resetCalculations
  }
}
