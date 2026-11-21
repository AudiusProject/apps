import AsyncStorage from '@react-native-async-storage/async-storage'
import Reactotron from 'reactotron-react-native'

Reactotron.setAsyncStorageHandler(AsyncStorage)
  .configure({
    name: 'Audius Mobile',
    host: 'localhost', // server ip for remote debugging
    port: 9090
  })
  .useReactNative({
    asyncStorage: false, // there are more options to the async storage.
    networking: {
      ignoreUrls: /symbolicate/
    },
    editor: false, // there are more options to editor
    errors: { veto: (stackFrame) => false }, // or turn it off with false
    overlay: false
  })
  .connect()
