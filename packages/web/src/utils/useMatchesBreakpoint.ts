import { useCallback, useEffect, useState } from 'react'

export const useMatchesBreakpoint = ({
  mediaQuery,
  initialValue = false
}: {
  mediaQuery: MediaQueryList
  initialValue?: boolean
}) => {
  const [value, setValue] = useState(initialValue)
  const handleChange = useCallback(() => {
    setValue(mediaQuery.matches)
  }, [mediaQuery])

  useEffect(() => {
    handleChange()
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [handleChange, mediaQuery])

  return value
}
