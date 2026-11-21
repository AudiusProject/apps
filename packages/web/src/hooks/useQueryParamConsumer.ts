import { useEffect, useState } from 'react'

import queryString from 'query-string'
import { useNavigate, useLocation } from 'react-router'

export const useQueryParamConsumer = ({
  replacementRoute,
  paramName
}: {
  replacementRoute?: string
  paramName: string
}) => {
  const [value, setValue] = useState<string | null>(null)
  const [hasConsumed, setHasConsumed] = useState(false)
  const { search, pathname, state: locationState } = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (hasConsumed) return

    const { [paramName]: parsedValue, ...restParams } =
      queryString.parse(search)

    if (parsedValue != null) {
      setHasConsumed(true)
      setValue(Array.isArray(parsedValue) ? parsedValue[0] : parsedValue)

      const newPath = `${replacementRoute ?? pathname}?${queryString.stringify(
        restParams
      )}`
      navigate(newPath, { replace: true, state: locationState })
    }
  }, [
    hasConsumed,
    pathname,
    search,
    locationState,
    navigate,
    paramName,
    replacementRoute
  ])

  return value
}
