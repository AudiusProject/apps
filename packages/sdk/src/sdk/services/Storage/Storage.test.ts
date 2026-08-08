import { beforeEach, describe, expect, it, vi } from 'vitest'

import fetch from '../../utils/fetch'
import type { StorageNodeSelectorService } from '../StorageNodeSelector'

import { Storage } from './Storage'

vi.mock('../../utils/fetch')

const mockFetch = vi.mocked(fetch)

const storageNodeSelector = {
  getSelectedNode: async () => 'https://node.example.com'
} as unknown as StorageNodeSelectorService

const previewResponse = (cid: string) =>
  ({ ok: true, json: async () => ({ cid }) }) as unknown as Response

describe('generatePreview', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  // The user id names who the preview is attested to; the validator refuses
  // users that do not claim the source cid. It travels as a query parameter —
  // an assertion, not a credential.
  it('sends the asserted user id', async () => {
    mockFetch.mockResolvedValue(previewResponse('preview-cid'))
    const storage = new Storage({ storageNodeSelector })

    const result = await storage.generatePreview({
      cid: 'some-cid',
      secondOffset: 30,
      userId: 42
    })

    expect(result).toBe('preview-cid')
    const [url, init] = mockFetch.mock.calls[0]! as [URL, RequestInit]
    expect(init.method).toBe('POST')
    expect(url.pathname).toBe('/generate_preview/some-cid/30')
    expect(url.searchParams.get('userId')).toBe('42')
  })

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 } as Response)
    const storage = new Storage({ storageNodeSelector })

    await expect(
      storage.generatePreview({ cid: 'some-cid', secondOffset: 15, userId: 7 })
    ).rejects.toThrow('status: 401')
  })
})
