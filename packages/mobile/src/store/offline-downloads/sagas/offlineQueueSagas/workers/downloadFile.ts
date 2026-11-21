import ReactNativeBlobUtil from 'react-native-blob-util'
import { CANCEL } from 'redux-saga'

export function downloadFile(uri: string, destination: string) {
  const { fetch } = ReactNativeBlobUtil.config({ path: destination })
  const fetchTask = fetch('GET', uri)
  fetchTask[CANCEL] = fetchTask.cancel
  return fetchTask
}
