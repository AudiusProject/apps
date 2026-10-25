import { readFileSync } from 'fs'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { resizeImage } from 'utils/imageProcessingUtil'

import { processFiles } from './processFiles'

vi.mock('@audius/common/schemas', () => ({
  newTrackMetadata: vi.fn((metadata) => metadata)
}))
vi.mock(
  '@audius/common/utils',
  () => import('@audius/common/src/utils/uploadConstants')
)
vi.mock('utils/imageProcessingUtil', () => ({ resizeImage: vi.fn() }))

// Original 440 Hz tones generated with FFmpeg. cover.mp3 contains an ID3v2.3
// front cover and title; cover.opus contains METADATA_BLOCK_PICTURE artwork.
const fixtureDirectory = 'src/pages/upload-page/store/utils/fixtures'
const fixture = (name: string, type: string) =>
  new File([readFileSync(`${fixtureDirectory}/${name}`)], name, {
    type
  })

const upload = async (file: File) => {
  const handleInvalid = vi.fn()
  const [track] = await Promise.all(processFiles([file], handleInvalid))
  expect(handleInvalid).not.toHaveBeenCalled()
  return track!
}

describe('processFiles artwork', () => {
  beforeEach(() => {
    vi.mocked(resizeImage).mockReset()
    vi.mocked(resizeImage).mockResolvedValue(
      new File(['resized artwork'], 'resized.png', { type: 'image/png' })
    )
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:artwork')
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it.each([
    ['cover.opus', 'audio/ogg'],
    ['cover.mp3', 'audio/mpeg']
  ])(
    'extracts embedded artwork from %s through the resize pipeline',
    async (name, type) => {
      const file = fixture(name, type)
      const track = await upload(file)

      expect(resizeImage).toHaveBeenCalledOnce()
      const image = vi.mocked(resizeImage).mock.calls[0][0]
      expect(image.type).toBe('image/png')
      expect(new Uint8Array(await image.arrayBuffer())).toEqual(
        new Uint8Array(readFileSync(`${fixtureDirectory}/cover.png`))
      )
      expect(track.file).toBe(file)
      expect(track.metadata.title).toBe(name.replace(/\.[^.]+$/, ''))
      expect(track.metadata.orig_filename).toBe(name)
      expect(track.metadata.artwork.url).toBe('blob:artwork')
      expect(await track.metadata.artwork.file!.text()).toBe('resized artwork')
      expect(console.warn).not.toHaveBeenCalled()
    }
  )

  it('continues without artwork when the audio has no cover', async () => {
    const track = await upload(fixture('no-cover.wav', 'audio/wav'))

    expect(track.metadata.artwork).toEqual({ file: null, url: '' })
    expect(resizeImage).not.toHaveBeenCalled()
    expect(console.warn).not.toHaveBeenCalled()
  })

  it('continues uploading when metadata parsing fails', async () => {
    const file = new File(['not audio'], 'broken.tsv', {
      type: 'audio/unknown'
    })
    const track = await upload(file)

    expect(track.file).toBe(file)
    expect(track.metadata.artwork).toEqual({ file: null, url: '' })
    expect(resizeImage).not.toHaveBeenCalled()
    expect(console.warn).toHaveBeenCalledOnce()
  })

  it('continues uploading when resizing the embedded cover fails', async () => {
    vi.mocked(resizeImage).mockRejectedValue(
      new Error('Unable to resize image')
    )
    const track = await upload(fixture('cover.opus', 'audio/ogg'))

    expect(track.metadata.artwork).toEqual({ file: null, url: '' })
    expect(console.warn).toHaveBeenCalledOnce()
  })
})
