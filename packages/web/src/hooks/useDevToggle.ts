import { useCallback, useEffect, useState } from 'react'

const CHANGE_EVENT = 'audius:dev-toggle-change'

const read = (key: string, defaultValue: boolean): boolean => {
  if (typeof window === 'undefined') return defaultValue

  try {
    const raw = window.localStorage.getItem(key)
    if (raw === null) return defaultValue
    return raw === 'true'
  } catch {
    return defaultValue
  }
}

export const useDevToggle = (
  key: string,
  defaultValue: boolean
): [boolean, (next: boolean) => void] => {
  const [value, setValue] = useState(() => read(key, defaultValue))

  useEffect(() => {
    const sync = (event: Event) => {
      if (event instanceof CustomEvent && event.detail?.key === key) {
        setValue(read(key, defaultValue))
      }

      if (event instanceof StorageEvent && event.key === key) {
        setValue(read(key, defaultValue))
      }
    }

    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [key, defaultValue])

  const set = useCallback(
    (next: boolean) => {
      try {
        window.localStorage.setItem(key, String(next))
      } catch {}

      setValue(next)
      window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { key } }))
    },
    [key]
  )

  return [value, set]
}

export const REACT_QUERY_DEVTOOLS_KEY = 'audius-react-query-devtools-enabled'
