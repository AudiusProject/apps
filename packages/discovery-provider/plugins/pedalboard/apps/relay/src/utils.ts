import { audiusSdk } from '.'

export const isUserCreate = (encodedABI: string): boolean => {
  const decodedAbi = audiusSdk.services.entityManager!.decodeManageEntity(
    encodedABI as `0x${string}`
  )
  return decodedAbi.action === 'Create' && decodedAbi.entityType === 'User'
}

export const isUserDeactivate = (
  isDeactivated: boolean,
  encodedABI: string
): boolean => {
  const decodedAbi = audiusSdk.services.entityManager!.decodeManageEntity(
    encodedABI as `0x${string}`
  )
  return (
    isDeactivated === false &&
    decodedAbi.action === 'Update' &&
    decodedAbi.entityType === 'User' &&
    JSON.parse(decodedAbi.metadata).data.is_deactivated === true
  )
}

export const isTrackDownload = (encodedABI: string) => {
  const decodedAbi = audiusSdk.services.entityManager!.decodeManageEntity(
    encodedABI as `0x${string}`
  )
  return decodedAbi.action === 'Download' && decodedAbi.entityType === 'Track'
}

export const isViewNotification = (encodedABI: string): boolean => {
  const decodedAbi = audiusSdk.services.entityManager!.decodeManageEntity(
    encodedABI as `0x${string}`
  )
  return (
    decodedAbi.action === 'View' && decodedAbi.entityType === 'Notification'
  )
}

export const isViewPlaylistNotification = (encodedABI: string): boolean => {
  const decodedAbi = audiusSdk.services.entityManager!.decodeManageEntity(
    encodedABI as `0x${string}`
  )
  return (
    decodedAbi.action === 'ViewPlaylist' &&
    decodedAbi.entityType === 'Notification'
  )
}

export const unknownToError = (e: unknown): Error => {
  return e instanceof Error ? e : new Error(String(e))
}

export const retryPromise = async <T>(
  task: () => Promise<T>,
  retries = 64
): Promise<T> => {
  let tries = 0
  let error = undefined
  while (tries != retries) {
    try {
      return await task()
    } catch (e) {
      error = e
      await delay(500)
      tries += 1
    }
  }
  // throw original error
  const err = unknownToError(error)
  throw err
}

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
