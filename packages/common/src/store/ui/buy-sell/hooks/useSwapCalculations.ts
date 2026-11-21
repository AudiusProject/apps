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

export const useSwapCalculations = ({
  exchangeRate,
  onInputValueChange,
  inputCoinAddress,
  outputCoinAddress,
  inputCoinDecimals,
  outputCoinDecimals
}: UseSwapCalculationsProps): SwapCalculationsHookResult => {
  if (inputCoinDecimals == null || outputCoinDecimals == null) {
    throw new Error('Coin decimals must be provided for accurate calculations')
  }
  const stateMachine = useCalculationStateMachine()

  const calculator = useBidirectionalCalculator({
    exchangeRate,
    source: stateMachine.source, // either input or output
    isUpdateInProgress: stateMachine.isUpdateInProgress,
    inputDecimals: inputCoinDecimals,
    outputDecimals: outputCoinDecimals
  })
  const { setOutputAmount } = calculator

  const coinHandler = useCoinChangeHandler({
    inputCoinAddress,
    outputCoinAddress,
    currentInputAmount: calculator.numericInputAmount,
    currentOutputAmount: calculator.numericOutputAmount,
    currentSource: stateMachine.source
  })

  useEffect(() => {
    coinHandler.onCoinsChanged(() => {
      const { preservedValues } = coinHandler

      if (
        preservedValues.source === 'input' &&
        preservedValues.inputAmount > 0
      ) {
        stateMachine.setSource('input')
        calculator.setInputAmount(preservedValues.inputAmount.toString())
      } else if (
        preservedValues.source === 'output' &&
        preservedValues.outputAmount > 0
      ) {
        stateMachine.setSource('output')
        calculator.setOutputAmount(preservedValues.outputAmount.toString())
        // Don't call onInputValueChange here since we're focused on output field
      }

      if (preservedValues.source === 'input') {
        calculator.setOutputAmount('')
      }
    })
  }, [stateMachine, calculator, onInputValueChange, coinHandler])

  useEffect(() => {
    if (!exchangeRate || exchangeRate <= 0) {
      if (stateMachine.source !== 'output') {
        setOutputAmount('')
      }
    }
  }, [exchangeRate, stateMachine.source, setOutputAmount])

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

  const resetCalculations = useCallback(() => {
    stateMachine.reset()
    calculator.clearAmounts()
  }, [stateMachine, calculator])

  return {
    inputAmount: calculator.inputAmount,
    outputAmount: calculator.outputAmount,
    numericInputAmount: calculator.numericInputAmount,
    numericOutputAmount: calculator.numericOutputAmount,

    calculationSource: stateMachine.source,
    isCalculating: calculator.isCalculating,

    handleInputChange,
    handleOutputChange,
    resetCalculations
  }
}
