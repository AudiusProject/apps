import type { AudiusSdkWithServices } from '@audius/sdk'
import { call, getContext } from 'typed-redux-saga'

type AudiusSDKContext = () => Promise<AudiusSdkWithServices>

export function* getSDK() {
  const audiusSdk = yield* getContext<AudiusSDKContext>('audiusSdk')
  return yield* call(audiusSdk)
}
