import { createKeySync } from '@audius/common/src/services/auth/hedgehogLib/scrypt'

self.onmessage = (
  event: MessageEvent<{ encryptStr: string; ivHex: string }>
) => {
  const { encryptStr, ivHex } = event.data
  self.postMessage(createKeySync(encryptStr, ivHex))
}
