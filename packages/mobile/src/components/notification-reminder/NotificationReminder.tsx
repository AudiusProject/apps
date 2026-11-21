import { useCallback } from 'react'

import {
  selectIsAccountComplete,
  useCurrentAccountUser
} from '@audius/common/api'
import { MobileOS } from '@audius/common/models'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getStartedAndFinishedSignup } from 'common/store/pages/signon/selectors'
import { Platform } from 'react-native'
import { checkNotifications, RESULTS } from 'react-native-permissions'
import { useDispatch, useSelector } from 'react-redux'
import { useAsync } from 'react-use'

import useSessionCount from 'app/hooks/useSessionCount'
import { setVisibility } from 'app/store/drawers/slice'

const FIRST_REMINDER_SESSION = 10
const REMINDER_FREQUENCY = 10

export const NotificationReminder = () => {
  const { data: hasCompleteAccount } = useCurrentAccountUser({
    select: selectIsAccountComplete
  })
  const hasFinishedSignUp = useSelector(getStartedAndFinishedSignup)
  const hasCompletedAccount = hasCompleteAccount && hasFinishedSignUp

  if (hasCompletedAccount) {
    return <NotificationReminderInternal />
  }
  return null
}

const NotificationReminderInternal = () => {
  const dispatch = useDispatch()

  const remindUserToTurnOnNotifications = useCallback(async () => {
    try {
      const { status } = await checkNotifications()
      switch (status) {
        case RESULTS.UNAVAILABLE:
          return
        case RESULTS.LIMITED:
          return
        case RESULTS.GRANTED:
          return
        case RESULTS.BLOCKED:
          return
        case RESULTS.DENIED:
          dispatch(
            setVisibility({ drawer: 'EnablePushNotifications', visible: true })
          )
      }
    } catch (error) {
      console.error(error)
    }
  }, [dispatch])

  useAsync(async () => {
    const hasRetriggeredNotifs = await AsyncStorage.getItem('RETRIGGER_NOTIFS')
    const isAndroid = Platform.OS === MobileOS.ANDROID

    if (hasRetriggeredNotifs === null && isAndroid) {
      await AsyncStorage.setItem('RETRIGGER_NOTIFS', 'false')
    } else {
      if (hasRetriggeredNotifs !== 'true') {
        remindUserToTurnOnNotifications()
        await AsyncStorage.setItem('RETRIGGER_NOTIFS', 'true')
      }
    }
  })

  useSessionCount(
    remindUserToTurnOnNotifications,
    REMINDER_FREQUENCY,
    FIRST_REMINDER_SESSION
  )

  return null
}
