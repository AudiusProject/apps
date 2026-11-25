import { describe, expect, it } from 'vitest'

import { fetchRemoteFile, isPublicAddress } from './remoteFile.js'

describe('isPublicAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
    'not-an-ip'
  ])('blocks %s', (address) => {
    expect(isPublicAddress(address)).toBe(false)
  })

  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '::ffff:8.8.8.8'])(
    'allows %s',
    (address) => {
      expect(isPublicAddress(address)).toBe(true)
    }
  )
})

describe('fetchRemoteFile', () => {
  const options = { maxBytes: 1024, accept: () => true }

  it('refuses plain http', async () => {
    await expect(
      fetchRemoteFile({ url: 'http://example.com/a.mp3', ...options })
    ).rejects.toThrow('https')
  })

  it('refuses URLs that point at internal addresses', async () => {
    for (const url of [
      'https://127.0.0.1/a.mp3',
      'https://169.254.169.254/latest/meta-data',
      'https://[::1]/a.mp3',
      'https://localhost/a.mp3'
    ]) {
      await expect(fetchRemoteFile({ url, ...options })).rejects.toThrow(
        'public host'
      )
    }
  })

  it('refuses URLs with embedded credentials', async () => {
    await expect(
      fetchRemoteFile({ url: 'https://user:pw@example.com/a.mp3', ...options })
    ).rejects.toThrow('credentials')
  })
})
