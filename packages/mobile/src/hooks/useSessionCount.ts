import { useEffect, useState } from 'react'

import AsyncStorage from '@react-native-async-storage/async-storage'

import { SESSION_COUNT_KEY } from 'app/constants/storage-keys'

const getSessionCount = async () => {
  const sessionCount = await AsyncStorage.getItem(SESSION_COUNT_KEY)
  return sessionCount ? parseInt(sessionCount, 10) : 0
}

export const incrementSessionCount = async () => {
  const sessionCount = await getSessionCount()
  await AsyncStorage.setItem(SESSION_COUNT_KEY, (sessionCount + 1).toString())
}

const useSessionCount = (
  callback: () => void,
  frequency: number,
  startAt = 1
) => {
  const [calledAtCount, setCalledAtCount] = useState<number | null>(null)

  useEffect(() => {
    const work = async () => {
      const count = await getSessionCount()
      if (
        count &&
        count >= startAt &&
        (count - startAt) % frequency === 0 &&
        count !== calledAtCount
      ) {
        callback()
        setCalledAtCount(count)
      }
    }
    work()
  }, [callback, calledAtCount, setCalledAtCount, frequency, startAt])
}

export default useSessionCount
