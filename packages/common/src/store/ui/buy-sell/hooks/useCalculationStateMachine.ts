/**
 * State machine hook for managing calculation source tracking
 * Prevents infinite loops and race conditions in bidirectional calculations
 */

import { useCallback, useRef, useState } from 'react'

import type { CalculationSource } from '../types/swap.types'

export type CalculationStateMachineResult = {
  source: CalculationSource
  setSource: (source: CalculationSource) => void
  isUpdateInProgress: boolean
  beginUpdate: () => void
  endUpdate: () => void
  reset: () => void
}

/**
 * Hook that manages calculation source state with loop prevention
 */
export const useCalculationStateMachine = (): CalculationStateMachineResult => {
  const [source, setSourceState] = useState<CalculationSource>(null)
  const updateInProgressRef = useRef(false)

  const setSource = useCallback((newSource: CalculationSource) => {
    setSourceState(newSource)
  }, [])

  const beginUpdate = useCallback(() => {
    updateInProgressRef.current = true
  }, [])

  const endUpdate = useCallback(() => {
    updateInProgressRef.current = false
  }, [])

  const reset = useCallback(() => {
    setSourceState(null)
    updateInProgressRef.current = false
  }, [])

  return {
    source,
    setSource,
    isUpdateInProgress: updateInProgressRef.current,
    beginUpdate,
    endUpdate,
    reset
  }
}
