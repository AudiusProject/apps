import type { PrivateKey } from '@audius/common/src/services/auth/hedgehogLib/types'

/**
 * Runs scrypt in a worker so login doesn't freeze the page. The worker is
 * bundled inline and started from a blob URL, which also works under the
 * desktop app's custom scheme.
 */
export const createKey = async (encryptStr: string, ivHex: string) => {
  const { default: CreateKeyWorker } = await import(
    './createKey.worker?worker&inline'
  )
  const worker = new CreateKeyWorker()
  try {
    return await new Promise<PrivateKey>((resolve, reject) => {
      worker.onmessage = (event: MessageEvent<PrivateKey>) =>
        resolve(event.data)
      worker.onerror = (event) =>
        reject(event.error ?? new Error(event.message))
      worker.postMessage({ encryptStr, ivHex })
    })
  } finally {
    worker.terminate()
  }
}
