import { describe, it, expect } from 'vitest'

import { ALLOWED_AUDIO_FILE_MIME } from './uploadConstants'

describe('ALLOWED_AUDIO_FILE_MIME', () => {
  it('accepts standard audio/* mime types', () => {
    expect(ALLOWED_AUDIO_FILE_MIME.test('audio/mpeg')).toBe(true)
    expect(ALLOWED_AUDIO_FILE_MIME.test('audio/ogg')).toBe(true)
    expect(ALLOWED_AUDIO_FILE_MIME.test('audio/wav')).toBe(true)
  })

  it('accepts the browser-sniffed Ogg mime types some browsers report', () => {
    expect(ALLOWED_AUDIO_FILE_MIME.test('video/ogg')).toBe(true)
    expect(ALLOWED_AUDIO_FILE_MIME.test('application/ogg')).toBe(true)
  })

  it('rejects non-audio, non-Ogg mime types', () => {
    expect(ALLOWED_AUDIO_FILE_MIME.test('text/plain')).toBe(false)
    expect(ALLOWED_AUDIO_FILE_MIME.test('video/mp4')).toBe(false)
    expect(ALLOWED_AUDIO_FILE_MIME.test('application/pdf')).toBe(false)
  })
})
