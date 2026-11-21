import { useEffect, useState } from 'react'

import { useFormikContext } from 'formik'
import { usePrevious } from 'react-use'

export const useIsWaitingForValidation = () => {
  const { isValidating } = useFormikContext()
  const [isWaitingForValidation, setIsWaitingForValidation] = useState(false)
  const wasValidating = usePrevious(isValidating)

  useEffect(() => {
    if (wasValidating && !isValidating) {
      setIsWaitingForValidation(false)
    }
  }, [isValidating, wasValidating])

  return {
    isWaitingForValidation,
    handleChange: () => {
      setIsWaitingForValidation(true)
    }
  }
}
