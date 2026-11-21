import { gcm } from '@noble/ciphers/aes'
import { hmac } from '@noble/hashes/hmac'
import { pbkdf2Async } from '@noble/hashes/pbkdf2'
import { sha1 } from '@noble/hashes/sha1'
import { sha256 } from '@noble/hashes/sha256'
import { sha384, sha512 } from '@noble/hashes/sha512'

type AlgorithmInput = string | { name: string; [key: string]: unknown }
type BytesInput = ArrayBuffer | ArrayBufferView

type ShimKey = {
  type: 'secret'
  extractable: boolean
  algorithm: { name: string; hash?: { name: string }; length?: number }
  usages: string[]
  raw: Uint8Array
}

const HASHES = {
  'SHA-1': sha1,
  'SHA-256': sha256,
  'SHA-384': sha384,
  'SHA-512': sha512
}

const notSupported = (what: string) => {
  const error = new Error(`${what} is not supported by the SubtleCrypto shim`)
  error.name = 'NotSupportedError'
  return error
}

const algorithmName = (algorithm: AlgorithmInput) =>
  (typeof algorithm === 'string' ? algorithm : algorithm.name).toUpperCase()

const toBytes = (data: BytesInput) =>
  data instanceof ArrayBuffer
    ? new Uint8Array(data)
    : new Uint8Array(data.buffer, data.byteOffset, data.byteLength)

const toArrayBuffer = (bytes: Uint8Array) => bytes.slice().buffer

const getHash = (algorithm: AlgorithmInput | undefined) => {
  const name = algorithm ? algorithmName(algorithm) : ''
  const hash = HASHES[name as keyof typeof HASHES]
  if (!hash) throw notSupported(`Hash ${name}`)
  return { name, hash }
}

const assertKey = (key: ShimKey, name: string, usage: string) => {
  if (key.algorithm.name !== name || !key.usages.includes(usage)) {
    const error = new Error(`Key cannot be used for ${name} ${usage}`)
    error.name = 'InvalidAccessError'
    throw error
  }
}

const aesGcm = (algorithm: AlgorithmInput, key: ShimKey, usage: string) => {
  if (typeof algorithm === 'string' || algorithmName(algorithm) !== 'AES-GCM') {
    throw notSupported(`${algorithmName(algorithm)} ${usage}`)
  }
  assertKey(key, 'AES-GCM', usage)
  const { iv, additionalData, tagLength } = algorithm as unknown as {
    iv: BytesInput
    additionalData?: BytesInput
    tagLength?: number
  }
  if (tagLength !== undefined && tagLength !== 128) {
    throw notSupported(`AES-GCM tagLength ${tagLength}`)
  }
  return gcm(
    key.raw,
    toBytes(iv),
    additionalData ? toBytes(additionalData) : undefined
  )
}

const hmacSign = (key: ShimKey, data: BytesInput) => {
  const { hash } = getHash(key.algorithm.hash)
  return hmac(hash, key.raw, toBytes(data))
}

export const subtle = {
  async digest(algorithm: AlgorithmInput, data: BytesInput) {
    return toArrayBuffer(getHash(algorithm).hash(toBytes(data)))
  },

  async importKey(
    format: string,
    keyData: BytesInput,
    algorithm: AlgorithmInput,
    extractable: boolean,
    usages: string[]
  ): Promise<ShimKey> {
    if (format !== 'raw') throw notSupported(`Key format ${format}`)
    const raw = toBytes(keyData).slice()
    const name = algorithmName(algorithm)
    if (name === 'HMAC') {
      const hash =
        typeof algorithm === 'string'
          ? undefined
          : (algorithm.hash as AlgorithmInput)
      return {
        type: 'secret',
        extractable,
        algorithm: { name, hash: { name: getHash(hash).name } },
        usages,
        raw
      }
    }
    if (name === 'AES-GCM') {
      if (![16, 24, 32].includes(raw.length)) {
        throw new Error('AES key data must be 128, 192 or 256 bits')
      }
      return {
        type: 'secret',
        extractable,
        algorithm: { name, length: raw.length * 8 },
        usages,
        raw
      }
    }
    if (name === 'PBKDF2') {
      return { type: 'secret', extractable, algorithm: { name }, usages, raw }
    }
    throw notSupported(`Algorithm ${name}`)
  },

  async exportKey(format: string, key: ShimKey) {
    if (format !== 'raw') throw notSupported(`Key format ${format}`)
    if (!key.extractable) {
      const error = new Error('Key is not extractable')
      error.name = 'InvalidAccessError'
      throw error
    }
    return toArrayBuffer(key.raw)
  },

  async sign(algorithm: AlgorithmInput, key: ShimKey, data: BytesInput) {
    if (algorithmName(algorithm) !== 'HMAC') {
      throw notSupported(`${algorithmName(algorithm)} sign`)
    }
    assertKey(key, 'HMAC', 'sign')
    return toArrayBuffer(hmacSign(key, data))
  },

  async verify(
    algorithm: AlgorithmInput,
    key: ShimKey,
    signature: BytesInput,
    data: BytesInput
  ) {
    if (algorithmName(algorithm) !== 'HMAC') {
      throw notSupported(`${algorithmName(algorithm)} verify`)
    }
    assertKey(key, 'HMAC', 'verify')
    const expected = hmacSign(key, data)
    const actual = toBytes(signature)
    if (expected.length !== actual.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i]
    return diff === 0
  },

  async encrypt(algorithm: AlgorithmInput, key: ShimKey, data: BytesInput) {
    return toArrayBuffer(
      aesGcm(algorithm, key, 'encrypt').encrypt(toBytes(data))
    )
  },

  async decrypt(algorithm: AlgorithmInput, key: ShimKey, data: BytesInput) {
    try {
      return toArrayBuffer(
        aesGcm(algorithm, key, 'decrypt').decrypt(toBytes(data))
      )
    } catch (e) {
      if ((e as Error).name === 'NotSupportedError') throw e
      if ((e as Error).name === 'InvalidAccessError') throw e
      const error = new Error(
        'The operation failed for an operation-specific reason'
      )
      error.name = 'OperationError'
      throw error
    }
  },

  async deriveBits(algorithm: AlgorithmInput, key: ShimKey, length: number) {
    if (
      typeof algorithm === 'string' ||
      algorithmName(algorithm) !== 'PBKDF2'
    ) {
      throw notSupported(`${algorithmName(algorithm)} deriveBits`)
    }
    assertKey(key, 'PBKDF2', 'deriveBits')
    const { salt, iterations, hash } = algorithm as unknown as {
      salt: BytesInput
      iterations: number
      hash: AlgorithmInput
    }
    if (length % 8 !== 0) throw notSupported('PBKDF2 length not divisible by 8')
    const bits = await pbkdf2Async(getHash(hash).hash, key.raw, toBytes(salt), {
      c: iterations,
      dkLen: length / 8
    })
    return toArrayBuffer(bits)
  }
}

export const installSubtleCrypto = () => {
  const g = global as unknown as { crypto?: { subtle?: unknown } }
  if (!g.crypto) g.crypto = {}
  if (!g.crypto.subtle) g.crypto.subtle = subtle
}
