import type { AudiusSdkWithServices } from '@audius/sdk'

const PRIORITIZED_BACKDROP_SIZES = ['2000x', '1500x', '1280x', '1000x', '640x']

const getBackdropImageCid = (results: Record<string, string> = {}) => {
  for (const size of PRIORITIZED_BACKDROP_SIZES) {
    if (results[size]) {
      return results[size]
    }
  }
  return Object.values(results)[0]
}

export const uploadBackdropImage = async (
  sdk: AudiusSdkWithServices,
  file: File
): Promise<string> => {
  const uploadResponse = await sdk.services.storage
    .uploadFile({
      file,
      metadata: { template: 'img_backdrop' }
    })
    .start()

  const cid = getBackdropImageCid(uploadResponse.results)
  if (!cid) {
    throw new Error('Failed to process backdrop image upload')
  }

  const validatorNodeEndpoint =
    await sdk.services.storageNodeSelector.getSelectedNode()
  if (!validatorNodeEndpoint) {
    throw new Error('No validator node available')
  }

  return `${validatorNodeEndpoint}/content/${cid}`
}
