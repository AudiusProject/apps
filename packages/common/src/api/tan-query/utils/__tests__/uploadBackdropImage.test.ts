import type { AudiusSdkWithServices } from '@audius/sdk'
import { describe, it, expect, vi } from 'vitest'

import { uploadBackdropImage } from '../uploadBackdropImage'

const makeSdk = ({
  results,
  node = 'https://validator.example.com'
}: {
  results: Record<string, string>
  node?: string | null
}) => {
  const uploadFile = vi.fn(() => ({
    start: vi.fn(async () => ({ results }))
  }))
  const sdk = {
    services: {
      storage: { uploadFile },
      storageNodeSelector: { getSelectedNode: vi.fn(async () => node) }
    }
  } as unknown as AudiusSdkWithServices
  return { sdk, uploadFile }
}

const file = new File(['x'], 'banner.png', { type: 'image/png' })

describe('uploadBackdropImage', () => {
  it('uploads with the img_backdrop template and returns the largest variant URL', async () => {
    const { sdk, uploadFile } = makeSdk({
      results: { '640x': 'cid640', '2000x': 'cid2000', '1000x': 'cid1000' }
    })

    const url = await uploadBackdropImage(sdk, file)

    expect(uploadFile).toHaveBeenCalledWith({
      file,
      metadata: { template: 'img_backdrop' }
    })
    expect(url).toBe('https://validator.example.com/content/cid2000')
  })

  it('falls back to any variant when no prioritized size is present', async () => {
    const { sdk } = makeSdk({ results: { original: 'cidOriginal' } })
    await expect(uploadBackdropImage(sdk, file)).resolves.toBe(
      'https://validator.example.com/content/cidOriginal'
    )
  })

  it('throws when the upload returns no CID', async () => {
    const { sdk } = makeSdk({ results: {} })
    await expect(uploadBackdropImage(sdk, file)).rejects.toThrow()
  })

  it('throws when no validator node is available', async () => {
    const { sdk } = makeSdk({ results: { '2000x': 'cid' }, node: null })
    await expect(uploadBackdropImage(sdk, file)).rejects.toThrow(
      'No validator node available'
    )
  })
})
