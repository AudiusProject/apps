import { useState, useEffect, useCallback } from 'react'

type CreateUseLocalStorageHookArguments<T> = {
  getLocalStorageItem: (key: string) => Promise<T | null>
  setLocalStorageItem: (key: string, value: T) => Promise<void> | void
}

export const createUseLocalStorageHook = ({
  getLocalStorageItem,
  setLocalStorageItem
}: CreateUseLocalStorageHookArguments<Object | string | boolean>) => {
  const useLocalStorage = (key: string, defaultValue: any) => {
    const [state, setState] = useState(defaultValue)
    useEffect(() => {
      const getLocalStorage = async () => {
        const val = await getLocalStorageItem(key)
        setState(val)
      }
      getLocalStorage()
    }, [key])
    const setStateValue = useCallback(
      (value: any) => {
        setState(value)
        setLocalStorageItem(key, value)
      },
      [key]
    )
    return [state, setStateValue]
  }

  return useLocalStorage
}
