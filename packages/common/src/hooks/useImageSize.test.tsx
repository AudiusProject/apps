// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SquareSizes } from '~/models'

import { useImageSize } from './useImageSize'

const makeArtwork = (id: string) => ({
  [SquareSizes.SIZE_150_BY_150]: `https://a.test/${id}/150x150.jpg`,
  [SquareSizes.SIZE_480_BY_480]: `https://a.test/${id}/480x480.jpg`,
  [SquareSizes.SIZE_1000_BY_1000]: `https://a.test/${id}/1000x1000.jpg`,
  mirrors: ['https://b.test']
})

describe('useImageSize', () => {
  afterEach(() => {
    cleanup()
    global.IMAGE_CACHE.clear()
  })

  it('does not preload again when re-rendered with a new inline preload function', async () => {
    const artwork = makeArtwork('inline')
    const preload = vi.fn(async (_url: string) => {})
    const { result, rerender } = renderHook(() =>
      useImageSize({
        artwork,
        targetSize: SquareSizes.SIZE_150_BY_150,
        preloadImageFn: async (url: string) => preload(url)
      })
    )
    await waitFor(() =>
      expect(result.current.imageUrl).toBe(artwork['150x150'])
    )
    rerender()
    rerender()
    await waitFor(() => expect(preload).toHaveBeenCalledTimes(1))
  })

  it('falls back to a mirror when the preload fails', async () => {
    const artwork = makeArtwork('mirror')
    const preloadImageFn = vi.fn(async (url: string) => {
      if (url.startsWith('https://a.test')) throw new Error('down')
    })
    const { result } = renderHook(() =>
      useImageSize({
        artwork,
        targetSize: SquareSizes.SIZE_480_BY_480,
        preloadImageFn
      })
    )
    await waitFor(() =>
      expect(result.current.imageUrl).toBe('https://b.test/mirror/480x480.jpg')
    )
  })

  it('uses a cached larger size only when it is not much larger', async () => {
    const artwork = makeArtwork('larger')
    global.IMAGE_CACHE.add(artwork['480x480'])
    global.IMAGE_CACHE.add(artwork['1000x1000'])

    const { result: forThumbnail } = renderHook(() =>
      useImageSize({ artwork, targetSize: SquareSizes.SIZE_150_BY_150 })
    )
    await waitFor(() =>
      expect(forThumbnail.current.imageUrl).toBe(artwork['480x480'])
    )

    global.IMAGE_CACHE.delete(artwork['480x480'])
    const preloadImageFn = vi.fn(async (_url: string) => {})
    const { result: withoutMedium } = renderHook(() =>
      useImageSize({
        artwork,
        targetSize: SquareSizes.SIZE_150_BY_150,
        preloadImageFn
      })
    )
    await waitFor(() =>
      expect(withoutMedium.current.imageUrl).toBe(artwork['150x150'])
    )
    expect(preloadImageFn).toHaveBeenCalledWith(artwork['150x150'])
  })
})
