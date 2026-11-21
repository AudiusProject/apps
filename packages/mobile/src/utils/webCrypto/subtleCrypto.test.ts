import { subtle } from './subtleCrypto'

const reference: SubtleCrypto = require('crypto').webcrypto.subtle
const bytes = (n: number, seed = 1) =>
  Uint8Array.from({ length: n }, (_, i) => (i * 31 + seed * 17) & 0xff)
const hex = (buffer: ArrayBuffer) => Buffer.from(buffer).toString('hex')

describe('SubtleCrypto shim', () => {
  it.each(['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'])(
    'digest %s matches WebCrypto',
    async (hash) => {
      const data = bytes(1000)
      expect(hex(await subtle.digest(hash, data))).toBe(
        hex(await reference.digest(hash, data))
      )
      expect(hex(await subtle.digest({ name: hash }, data.buffer))).toBe(
        hex(await reference.digest(hash, data))
      )
    }
  )

  it('digest SHA-1 of "password" is the known vector', async () => {
    const digest = await subtle.digest(
      'SHA-1',
      new TextEncoder().encode('password')
    )
    expect(hex(digest)).toBe('5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8')
  })

  it('HMAC sign/verify matches WebCrypto', async () => {
    const raw = bytes(32, 2)
    const data = bytes(77, 3)
    const algorithm = { name: 'HMAC', hash: { name: 'SHA-256' } }
    const key = await subtle.importKey('raw', raw, algorithm, false, [
      'sign',
      'verify'
    ])
    const refKey = await reference.importKey('raw', raw, algorithm, false, [
      'sign'
    ])
    const signature = await subtle.sign('HMAC', key, data)
    expect(hex(signature)).toBe(hex(await reference.sign('HMAC', refKey, data)))
    expect(await subtle.verify('HMAC', key, signature, data)).toBe(true)
    expect(await subtle.verify('HMAC', key, signature, bytes(77, 4))).toBe(
      false
    )
  })

  it('AES-GCM interoperates with WebCrypto in both directions', async () => {
    const raw = bytes(32, 5)
    const iv = bytes(12, 6)
    const plaintext = bytes(333, 7)
    const algorithm = { name: 'AES-GCM', length: 256 }
    const key = await subtle.importKey('raw', raw, algorithm, true, [
      'encrypt',
      'decrypt'
    ])
    const refKey = await reference.importKey('raw', raw, algorithm, true, [
      'encrypt',
      'decrypt'
    ])
    const ours = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
    const theirs = await reference.encrypt(
      { name: 'AES-GCM', iv },
      refKey,
      plaintext
    )
    expect(hex(ours)).toBe(hex(theirs))
    expect(
      hex(await subtle.decrypt({ name: 'AES-GCM', iv }, key, theirs))
    ).toBe(hex(plaintext.buffer))
    const tampered = new Uint8Array(ours)
    tampered[0] ^= 1
    await expect(
      subtle.decrypt({ name: 'AES-GCM', iv }, key, tampered)
    ).rejects.toMatchObject({ name: 'OperationError' })
    expect(hex(await subtle.exportKey('raw', key))).toBe(hex(raw.buffer))
  })

  it('PBKDF2 deriveBits matches WebCrypto', async () => {
    const password = new TextEncoder().encode('correct horse')
    const params = {
      name: 'PBKDF2',
      salt: bytes(16, 8),
      iterations: 1000,
      hash: 'SHA-512'
    }
    const key = await subtle.importKey('raw', password, 'PBKDF2', false, [
      'deriveBits'
    ])
    const refKey = await reference.importKey('raw', password, 'PBKDF2', false, [
      'deriveBits'
    ])
    expect(hex(await subtle.deriveBits(params, key, 512))).toBe(
      hex(await reference.deriveBits(params, refKey, 512))
    )
  })

  it('rejects unsupported algorithms', async () => {
    await expect(
      subtle.importKey('raw', bytes(16), 'AES-CBC', false, ['encrypt'])
    ).rejects.toMatchObject({ name: 'NotSupportedError' })
  })
})
