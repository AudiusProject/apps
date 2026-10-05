import { chatActions } from '@audius/common/store'
import { StackActions } from '@react-navigation/native'
import { takeLatest } from 'redux-saga/effects'

import { navigationRef } from 'app/components/navigation-container/NavigationContainer'

const { goToChat } = chatActions

function* watchGoToChat() {
  yield takeLatest(goToChat, function* (action: ReturnType<typeof goToChat>) {
    const {
      payload: { chatId, presetMessage, replaceNavigation }
    } = action
    if (navigationRef.isReady()) {
      if (!chatId) {
        navigationRef.navigate('ChatList', undefined, { pop: true })
      } else {
        if (replaceNavigation) {
          navigationRef.current?.dispatch(
            StackActions.replace('Chat', { chatId, presetMessage })
          )
        } else {
          // @ts-ignore navigationRef is not parametrized correctly (PAY-1141)
          navigationRef.navigate('Chat', { chatId, presetMessage })
        }
      }
    }
  })
}

export default function sagas() {
  return [watchGoToChat]
}
