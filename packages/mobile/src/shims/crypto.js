const aes = require('browserify-cipher')
const pbkdf2 = require('pbkdf2')

const MAX_RANDOM_CHUNK = 65536

const randomFillSync = (buffer, offset = 0, size) => {
  const view = ArrayBuffer.isView(buffer)
    ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    : new Uint8Array(buffer)
  const end = size === undefined ? view.length : offset + size
  for (let i = offset; i < end; i += MAX_RANDOM_CHUNK) {
    global.crypto.getRandomValues(
      view.subarray(i, Math.min(i + MAX_RANDOM_CHUNK, end))
    )
  }
  return buffer
}

const randomBytes = (size, callback) => {
  const bytes = randomFillSync(Buffer.alloc(size))
  if (typeof callback === 'function') {
    setTimeout(() => callback(null, bytes), 0)
    return undefined
  }
  return bytes
}

const randomFill = (buffer, offset, size, callback) => {
  const cb = [offset, size, callback].find((arg) => typeof arg === 'function')
  const start = typeof offset === 'number' ? offset : 0
  const length = typeof size === 'number' ? size : undefined
  const result = randomFillSync(buffer, start, length)
  setTimeout(() => cb(null, result), 0)
}

const notAvailable = (name) => () => {
  throw new Error(`crypto.${name} is not available on mobile`)
}

module.exports = {
  randomBytes,
  rng: randomBytes,
  pseudoRandomBytes: randomBytes,
  prng: randomBytes,
  randomFill,
  randomFillSync,
  createHash: require('create-hash'),
  Hash: require('create-hash'),
  createHmac: require('create-hmac'),
  Hmac: require('create-hmac'),
  getHashes: () => [
    'sha1',
    'sha224',
    'sha256',
    'sha384',
    'sha512',
    'md5',
    'rmd160'
  ],
  pbkdf2: pbkdf2.pbkdf2,
  pbkdf2Sync: pbkdf2.pbkdf2Sync,
  Cipher: aes.Cipher,
  createCipher: aes.createCipher,
  Cipheriv: aes.Cipheriv,
  createCipheriv: aes.createCipheriv,
  Decipher: aes.Decipher,
  createDecipher: aes.createDecipher,
  Decipheriv: aes.Decipheriv,
  createDecipheriv: aes.createDecipheriv,
  getCiphers: aes.getCiphers,
  listCiphers: aes.listCiphers,
  createSign: notAvailable('createSign'),
  createVerify: notAvailable('createVerify'),
  createECDH: notAvailable('createECDH'),
  createDiffieHellman: notAvailable('createDiffieHellman'),
  getDiffieHellman: notAvailable('getDiffieHellman'),
  publicEncrypt: notAvailable('publicEncrypt'),
  privateDecrypt: notAvailable('privateDecrypt'),
  privateEncrypt: notAvailable('privateEncrypt'),
  publicDecrypt: notAvailable('publicDecrypt')
}
