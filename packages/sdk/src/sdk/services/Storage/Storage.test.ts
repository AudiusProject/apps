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

// A storage node can answer `done` from an upload row it has not finished
// replicating, with no transcode results on it yet. Accepting that response
// writes a track whose trackCid is undefined: the upload "succeeds" into a
// track that can never be played, with no error raised anywhere.
describe('pollProcessingStatus', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  const statusResponse = (body: unknown) =>
    ({ ok: true, json: async () => body }) as unknown as Response

  const poll = (storage: Storage, template: string) =>
    (
      storage as unknown as {
        pollProcessingStatus: (
          id: string,
          template: string,
          total: number
        ) => Promise<{ results: Record<string, string> }>
      }
    ).pollProcessingStatus('upload-1', template, 1)

  const nodeSelector = {
    getSelectedNode: async () => 'https://node.example.com',
    triedSelectingAllNodes: () => false
  } as unknown as StorageNodeSelectorService

  it('keeps polling when a node reports done with no transcode result', async () => {
    mockFetch
      .mockResolvedValueOnce(
        statusResponse({ id: 'upload-1', status: 'done', results: {} })
      )
      .mockResolvedValueOnce(
        statusResponse({
          id: 'upload-1',
          status: 'done',
          results: { '320': 'QmTranscoded' }
        })
      )

    const storage = new Storage({ storageNodeSelector: nodeSelector })
    const resp = await poll(storage, 'audio')

    expect(resp.results['320']).toBe('QmTranscoded')
    expect(mockFetch).toHaveBeenCalledTimes(2)
  }, 20000)

  it('returns immediately once the transcode result is present', async () => {
    mockFetch.mockResolvedValue(
      statusResponse({
        id: 'upload-1',
        status: 'done',
        results: { '320': 'QmTranscoded' }
      })
    )

    const storage = new Storage({ storageNodeSelector: nodeSelector })
    const resp = await poll(storage, 'audio')

    expect(resp.results['320']).toBe('QmTranscoded')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  // Image resizes have no '320' result to wait for; the gate is audio-only.
  it('does not require a 320 result for image templates', async () => {
    mockFetch.mockResolvedValue(
      statusResponse({ id: 'upload-1', status: 'done', results: {} })
    )

    const storage = new Storage({ storageNodeSelector: nodeSelector })
    const resp = await poll(storage, 'img_square')

    expect(resp.results).toEqual({})
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })
})
