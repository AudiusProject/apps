import { useEffect } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useDispatch } from 'react-redux'
import { useAsync } from 'react-use'

import type { Drawer as DrawerName } from 'app/store/drawers/slice'
import { setVisibility } from 'app/store/drawers/slice'

type UseOneTimeDrawerProps = {
  key: string
  name: DrawerName
  disabled?: boolean
}

export const useOneTimeDrawer = ({
  key,
  name,
  disabled = false
}: UseOneTimeDrawerProps) => {
  const dispatch = useDispatch()
  const { value: seen, loading } = useAsync(() => AsyncStorage.getItem(key))

  useEffect(() => {
    if (disabled) return

    const shouldOpen = !loading && !seen
    if (shouldOpen) {
      dispatch(setVisibility({ drawer: name, visible: true }))
      AsyncStorage.setItem(key, 'true')
    }
  }, [disabled, loading, seen, dispatch, name, key])
}
