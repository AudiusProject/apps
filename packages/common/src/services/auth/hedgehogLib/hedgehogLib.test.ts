/**
 * Equivalence suite: the vendored hedgehog must derive the same keys, produce
 * the same ciphertexts and signatures, and read the same stored state as
 * @audius/hedgehog 3.0.0-alpha.1 + eth-sig-util. If any of these fail, users
 * get locked out of their accounts.
 */
import { randomBytes as nodeRandomBytes } from 'crypto'

import * as old from '@audius/hedgehog'
import { Keypair } from '@solana/web3.js'
import * as bip39 from 'bip39'
import sigUtil from 'eth-sig-util'
import { recoverMessageAddress } from 'viem'
import { signMessage } from 'viem/accounts'
import { describe, expect, it } from 'vitest'

import { createKeyAsync, createKeySync } from './scrypt'
import { hexToBytesLikeBuffer, waitUntil } from './utils'

import {
  Authentication,
  Hedgehog,
  WalletManager,
  entropyToMnemonic,
  getPlatformCreateKey
} from '.'
import type { CreateKey, EthWallet, LocalStorage } from '.'

const PATH = "m/44'/60'/0'/0/0"

const hex = (n: number) => nodeRandomBytes(n).toString('hex')

const randomString = (n: number) => {
  const chars =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*() ñé漢字🎵'
  const arr = Array.from(chars)
  let s = ''
  for (let i = 0; i < n; i++) s += arr[Math.floor(Math.random() * arr.length)]
  return s
}

const expectSameWallet = (
  oldWallet: {
    getPrivateKey: () => Buffer
    getPrivateKeyString: () => string
    getPublicKey: () => Buffer
    getPublicKeyString: () => string
    getAddress: () => Buffer
    getAddressString: () => string
    getChecksumAddressString: () => string
  },
  newWallet: EthWallet
) => {
  expect(Buffer.from(newWallet.getPrivateKey())).toEqual(
    Buffer.from(oldWallet.getPrivateKey())
  )
  expect(newWallet.getPrivateKeyString()).toBe(oldWallet.getPrivateKeyString())
  expect(Buffer.from(newWallet.getPublicKey())).toEqual(
    Buffer.from(oldWallet.getPublicKey())
  )
  expect(newWallet.getPublicKeyString()).toBe(oldWallet.getPublicKeyString())
  expect(Buffer.from(newWallet.getAddress())).toEqual(
    Buffer.from(oldWallet.getAddress())
  )
  expect(newWallet.getAddressString()).toBe(oldWallet.getAddressString())
  expect(newWallet.getChecksumAddressString()).toBe(
    oldWallet.getChecksumAddressString()
  )
}

const outcome = <T>(fn: () => T): { ok: true; value: T } | { ok: false } => {
  try {
    return { ok: true, value: fn() }
  } catch {
    return { ok: false }
  }
}

// Fast deterministic stand-in for scrypt so the flow tests run quickly. The
// real scrypt createKey is compared separately below.
const fakeCreateKey: CreateKey = async (encryptStr, ivHex) => {
  const { sha256 } = await import('@noble/hashes/sha256')
  const keyBuffer = sha256(new TextEncoder().encode(`${encryptStr}|${ivHex}`))
  return { keyBuffer, keyHex: Buffer.from(keyBuffer).toString('hex') }
}

const memoryStorage = (): LocalStorage & { data: Map<string, string> } => {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      data.set(k, v)
    },
    removeItem: (k) => {
      data.delete(k)
    }
  }
}

const fakeIdentity = () => {
  const records = new Map<string, { iv: string; cipherText: string }>()
  const users: Array<{ username: string; walletAddress: string }> = []
  return {
    records,
    users,
    getFn: async ({ lookupKey }: { lookupKey: string }) =>
      records.get(lookupKey) as { iv: string; cipherText: string },
    setAuthFn: async (params: {
      iv: string
      cipherText: string
      lookupKey: string
      oldLookupKey?: string
    }) => {
      if (params.oldLookupKey) records.delete(params.oldLookupKey)
      records.set(params.lookupKey, {
        iv: params.iv,
        cipherText: params.cipherText
      })
    },
    setUserFn: async (params: { username: string; walletAddress: string }) => {
      users.push(params)
    }
  }
}

describe('hedgehogLib known vectors', () => {
  it('derives the BIP39 "abandon ... about" address', async () => {
    const entropy = '00000000000000000000000000000000'
    expect(entropyToMnemonic(entropy)).toBe(
      'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
    )
    const wallet = await Authentication.generateWalletFromEntropy(entropy, PATH)
    expect(wallet.getChecksumAddressString()).toBe(
      '0x9858EfFD232B4033E47d90003D41EC34EcaEda94'
    )
    const oldWallet = await old.Authentication.generateWalletFromEntropy(
      entropy,
      PATH
    )
    expectSameWallet(oldWallet, wallet)
  })

  it('matches the BIP39 test vector for 7f7f... entropy', () => {
    expect(entropyToMnemonic('7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f7f')).toBe(
      'legal winner thank year wave sausage worth useful legal winner thank yellow'
    )
  })
})

describe('entropy -> mnemonic -> seed -> key', () => {
  it('entropyToMnemonic matches bip39 for random entropy of every valid size', () => {
    for (const size of [16, 20, 24, 28, 32]) {
      for (let i = 0; i < 200; i++) {
        const e = hex(size)
        expect(entropyToMnemonic(e)).toBe(bip39.entropyToMnemonic(e))
        expect(entropyToMnemonic(e.toUpperCase())).toBe(
          bip39.entropyToMnemonic(e.toUpperCase())
        )
      }
    }
  })

  it('handles malformed entropy strings exactly like bip39 + Buffer', () => {
    const cases = [
      '',
      'undefined',
      'null',
      hex(15),
      hex(16) + 'f',
      hex(16) + 'zz',
      hex(16) + 'x' + hex(4),
      'zz' + hex(16),
      hex(17),
      hex(33),
      hex(16).slice(0, 31) + 'g',
      ` ${hex(16)}`,
      `${hex(16)} `,
      `0x${hex(16)}`,
      hex(20) + 'q'
    ]
    for (let i = 0; i < 300; i++) {
      // random mixes of hex and non-hex
      cases.push(
        hex(16 + Math.floor(Math.random() * 4)) +
          randomString(Math.floor(Math.random() * 4))
      )
    }
    for (const c of cases) {
      expect(Buffer.from(hexToBytesLikeBuffer(c))).toEqual(
        Buffer.from(c, 'hex')
      )
      const a = outcome(() => bip39.entropyToMnemonic(c))
      const b = outcome(() => entropyToMnemonic(c))
      expect(b).toEqual(a)
    }
  })

  it('derives identical wallets from random entropy', async () => {
    for (let i = 0; i < 150; i++) {
      const e = hex(16)
      const [oldWallet, newWallet] = await Promise.all([
        old.Authentication.generateWalletFromEntropy(e, PATH),
        Authentication.generateWalletFromEntropy(e, PATH)
      ])
      expectSameWallet(oldWallet, newWallet)
    }
  })

  it('derives identical wallets for longer entropy and other paths', async () => {
    const paths = [PATH, "m/44'/60'/0'/0/1", "m/44'/60'/1'/0/0"]
    for (const size of [20, 24, 32]) {
      for (const path of paths) {
        for (let i = 0; i < 5; i++) {
          const e = hex(size)
          const oldWallet = await old.Authentication.generateWalletFromEntropy(
            e,
            path
          )
          const newWallet = await Authentication.generateWalletFromEntropy(
            e,
            path
          )
          expectSameWallet(oldWallet, newWallet)
        }
      }
    }
  })

  it('derives the same solana keypair from getPrivateKey()', async () => {
    for (let i = 0; i < 20; i++) {
      const e = hex(16)
      const oldWallet = await old.Authentication.generateWalletFromEntropy(
        e,
        PATH
      )
      const newWallet = await Authentication.generateWalletFromEntropy(e, PATH)
      expect(
        Keypair.fromSeed(newWallet.getPrivateKey()).publicKey.toBase58()
      ).toBe(Keypair.fromSeed(oldWallet.getPrivateKey()).publicKey.toBase58())
    }
  })
})

describe('new mnemonics', () => {
  it('are valid 12-word English bip39 mnemonics with 128-bit entropy', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 300; i++) {
      const { mnemonic, entropy } = Authentication.generateMnemonicAndEntropy()
      expect(entropy).toMatch(/^[0-9a-f]{32}$/)
      expect(mnemonic.split(' ')).toHaveLength(12)
      expect(bip39.validateMnemonic(mnemonic)).toBe(true)
      expect(bip39.mnemonicToEntropy(mnemonic)).toBe(entropy)
      seen.add(entropy)
    }
    expect(seen.size).toBe(300)
  })

  it('creates 16-byte IVs', () => {
    const { ivHex, ivBuffer } = Authentication.createIV()
    expect(ivBuffer).toHaveLength(16)
    expect(ivHex).toBe(Buffer.from(ivBuffer).toString('hex'))
    expect(ivHex).toMatch(/^[0-9a-f]{32}$/)
  })
})

describe('aes-256-cbc entropy encryption', () => {
  it('produces identical ciphertext and round-trips across implementations', () => {
    for (let i = 0; i < 300; i++) {
      const entropy = i % 10 === 0 ? hex(32) : hex(16)
      const iv = nodeRandomBytes(16)
      const key = new Uint8Array(nodeRandomBytes(32))

      const oldCt = old.Authentication.encrypt(entropy, iv, key).cipherTextHex
      const newCt = Authentication.encrypt(
        entropy,
        new Uint8Array(iv),
        key
      ).cipherTextHex
      expect(newCt).toBe(oldCt)

      expect(Authentication.decrypt(new Uint8Array(iv), key, oldCt)).toBe(
        entropy
      )
      expect(old.Authentication.decrypt(new Uint8Array(iv), key, newCt)).toBe(
        entropy
      )
    }
  })

  it('round-trips arbitrary unicode payloads', () => {
    for (let i = 0; i < 100; i++) {
      const payload = randomString(Math.floor(Math.random() * 60))
      const iv = new Uint8Array(nodeRandomBytes(16))
      const key = new Uint8Array(nodeRandomBytes(32))
      const oldCt = old.Authentication.encrypt(
        payload,
        Buffer.from(iv),
        key
      ).cipherTextHex
      expect(Authentication.encrypt(payload, iv, key).cipherTextHex).toBe(oldCt)
      expect(Authentication.decrypt(iv, key, oldCt)).toBe(
        old.Authentication.decrypt(iv, key, oldCt)
      )
    }
  })

  it('fails the same way with the wrong key or corrupted ciphertext', () => {
    for (let i = 0; i < 300; i++) {
      const entropy = hex(16)
      const iv = new Uint8Array(nodeRandomBytes(16))
      const key = new Uint8Array(nodeRandomBytes(32))
      const ct = Authentication.encrypt(entropy, iv, key).cipherTextHex
      const wrongKey = new Uint8Array(nodeRandomBytes(32))
      expect(outcome(() => Authentication.decrypt(iv, wrongKey, ct))).toEqual(
        outcome(() => old.Authentication.decrypt(iv, wrongKey, ct))
      )
      const corrupted = hex(ct.length / 2)
      expect(outcome(() => Authentication.decrypt(iv, key, corrupted))).toEqual(
        outcome(() => old.Authentication.decrypt(iv, key, corrupted))
      )
    }
  })

  it('rejects ciphertext with a partial final block (login fails either way)', async () => {
    // browserify-cipher "decrypts" a trailing partial block into garbage and
    // occasionally passes the padding check; the garbage entropy then fails
    // bip39. The new code throws in decrypt. Both end in a failed login.
    const loginOutcome = async (
      decrypt: typeof Authentication.decrypt,
      derive: typeof Authentication.generateWalletFromEntropy,
      iv: Uint8Array,
      key: Uint8Array,
      ct: string
    ) => {
      try {
        const e = decrypt(iv, key, ct)
        return (await derive(e, PATH)).getAddressString()
      } catch {
        return 'failed'
      }
    }
    for (let i = 0; i < 1000; i++) {
      const entropy = i % 2 ? hex(16) : hex(32)
      const iv = new Uint8Array(nodeRandomBytes(16))
      const key = new Uint8Array(nodeRandomBytes(32))
      const ct = Authentication.encrypt(entropy, iv, key).cipherTextHex
      const truncated = ct.slice(0, ct.length - 2 * (1 + (i % 15)))
      expect(
        await loginOutcome(
          old.Authentication.decrypt as any,
          old.Authentication.generateWalletFromEntropy as any,
          iv,
          key,
          truncated
        )
      ).toBe('failed')
      expect(
        await loginOutcome(
          Authentication.decrypt,
          Authentication.generateWalletFromEntropy,
          iv,
          key,
          truncated
        )
      ).toBe('failed')
    }
  })
})

describe('createKey (scrypt)', () => {
  it('matches the old Node createKey (crypto.scrypt)', async () => {
    const oldCreateKey = old.getPlatformCreateKey()
    const newCreateKey = getPlatformCreateKey()
    const inputs: Array<[string, string]> = [
      ['hunter2', hex(16)],
      ['user@example.com:::Passw0rd!', '0x4f7242b39969c3ac4c6712524d633ce9'],
      ['ñé漢字🎵 pässwörd', hex(16)],
      ['', hex(16)]
    ]
    for (const [str, iv] of inputs) {
      const [a, b] = await Promise.all([
        oldCreateKey(str, iv),
        newCreateKey(str, iv)
      ])
      expect(b.keyHex).toBe(a.keyHex)
      expect(Buffer.from(b.keyBuffer)).toEqual(Buffer.from(a.keyBuffer))
    }
  }, 60_000)
})

describe('createKey (scrypt) vs the old web worker', () => {
  // Outputs of the scrypt-js@2.0.4 + buffer scripts the old web worker loaded
  // from jsdelivr, run with the same inputs and JSON round-trip.
  const vectors: Array<[string, string, string]> = [
    [
      'hunter2',
      '0123456789abcdef0123456789abcdef',
      'e9f55191be7eeaab074726a9860cb95e57eeac613e5b25415655903fc70a25c4'
    ],
    [
      'dylan@audius.example:::correct horse battery staple',
      'a1b2c3d4e5f60718293a4b5c6d7e8f90',
      'aac7f65da104b69fa2e8c95ec4f6a30f43ce4377f55576611f28928a86d93053'
    ],
    [
      'pässwörd ñ 日本語 🎵🎧',
      'ffeeddccbbaa99887766554433221100',
      'd4acf4d5eb6a4828cab6f9e02db11fef876fbfd243e968308fbbe983ab4eec79'
    ],
    [
      '',
      'deadbeefdeadbeefdeadbeefdeadbeef',
      'ad5bfdb843b3788277d9d287ebf5b45c127577c12e585579a0946ad55f1109db'
    ]
  ]

  it('createKeySync and createKeyAsync match', async () => {
    for (const [str, iv, keyHex] of vectors) {
      const sync = createKeySync(str, iv)
      expect(sync.keyHex).toBe(keyHex)
      expect(Buffer.from(sync.keyBuffer).toString('hex')).toBe(keyHex)
      expect((await createKeyAsync(str, iv)).keyHex).toBe(keyHex)
    }
  }, 60_000)
})

describe('identity auth signature (personal_sign)', () => {
  it('matches eth-sig-util personalSign byte for byte', async () => {
    for (let i = 0; i < 100; i++) {
      const wallet = await Authentication.generateWalletFromEntropy(
        hex(16),
        PATH
      )
      const unixTs = 1_600_000_000 + Math.floor(Math.random() * 300_000_000)
      const messages = [
        `Click sign to authenticate with identity service: ${unixTs}`,
        randomString(1 + Math.floor(Math.random() * 80))
      ]
      for (const message of messages) {
        const expected = sigUtil.personalSign(
          Buffer.from(wallet.getPrivateKey()),
          { data: message }
        )
        const actual = await signMessage({
          message,
          privateKey: wallet.getPrivateKeyString() as `0x${string}`
        })
        expect(actual).toBe(expected)
        expect(
          (
            await recoverMessageAddress({ message, signature: actual })
          ).toLowerCase()
        ).toBe(wallet.getAddressString())
      }
    }
  })
})

describe('Hedgehog flows across old and new implementations', () => {
  const makeOld = (
    identity: ReturnType<typeof fakeIdentity>,
    storage: LocalStorage,
    useLocalStorage = false
  ) =>
    new old.Hedgehog(
      identity.getFn as any,
      identity.setAuthFn as any,
      identity.setUserFn as any,
      useLocalStorage,
      storage,
      fakeCreateKey
    )
  const makeNew = (
    identity: ReturnType<typeof fakeIdentity>,
    storage: LocalStorage,
    useLocalStorage = false
  ) =>
    new Hedgehog(
      identity.getFn as any,
      identity.setAuthFn as any,
      identity.setUserFn as any,
      useLocalStorage,
      storage,
      fakeCreateKey
    )

  it('old signUp -> new login, and the stored entropy is identical', async () => {
    for (let i = 0; i < 20; i++) {
      const identity = fakeIdentity()
      const email = `User${i}@Example.com`
      const password = randomString(12)

      const oldStorage = memoryStorage()
      const oldWallet = await makeOld(identity, oldStorage).signUp({
        username: email,
        password
      })
      expect(identity.users[0].walletAddress).toBe(oldWallet.getAddressString())

      const newStorage = memoryStorage()
      const hh = makeNew(identity, newStorage)
      // username is lowercased for the lookup key, as before
      const newWallet = await hh.login({
        username: email.toLowerCase(),
        password
      })
      expectSameWallet(oldWallet, newWallet)
      expect([...newStorage.data.entries()]).toEqual([
        ...oldStorage.data.entries()
      ])
      expect(await hh.confirmCredentials({ username: email, password })).toBe(
        true
      )
      expect(
        await hh.confirmCredentials({ username: email, password: 'nope' })
      ).toBe(false)
    }
  })

  it('new signUp -> old login', async () => {
    for (let i = 0; i < 20; i++) {
      const identity = fakeIdentity()
      const email = `user${i}@example.com`
      const password = randomString(12)
      const newStorage = memoryStorage()
      const newWallet = await makeNew(identity, newStorage).signUp({
        username: email,
        password
      })
      expect(identity.users[0].walletAddress).toBe(newWallet.getAddressString())
      const record = [...identity.records.values()][0]
      expect(record.iv).toMatch(/^[0-9a-f]{32}$/)
      // 19-byte prefix + 32 hex chars = 51 bytes -> 4 AES blocks
      expect(record.cipherText).toMatch(/^[0-9a-f]{128}$/)

      const oldStorage = memoryStorage()
      const oldWallet = await makeOld(identity, oldStorage).login({
        username: email,
        password
      })
      expectSameWallet(oldWallet, newWallet)
      expect([...newStorage.data.entries()]).toEqual([
        ...oldStorage.data.entries()
      ])
    }
  })

  it('a session stored by the old library is restored by the new one', async () => {
    const identity = fakeIdentity()
    const storage = memoryStorage()
    const oldWallet = await makeOld(identity, storage).signUp({
      username: 'a@b.co',
      password: 'pw'
    })
    expect([...storage.data.keys()]).toEqual(['hedgehog-entropy-key'])

    const hh = makeNew(identity, storage, true)
    await hh.waitUntilReady()
    expect(hh.isLoggedIn()).toBe(true)
    expectSameWallet(oldWallet, hh.getWallet()!)

    // and the reverse
    const storage2 = memoryStorage()
    const newWallet = await makeNew(identity, storage2).createWalletObj('pw')
    const oldHh = makeOld(identity, storage2, true)
    await oldHh.waitUntilReady()
    expectSameWallet(oldHh.getWallet()!, newWallet)
  })

  it('treats a stored "undefined" entropy as signed out', async () => {
    const storage = memoryStorage()
    storage.data.set('hedgehog-entropy-key', 'undefined')
    const hh = makeNew(fakeIdentity(), storage, true)
    await hh.waitUntilReady()
    expect(hh.isLoggedIn()).toBe(false)
  })

  it('changeCredentials / resetPassword by new are readable by old', async () => {
    const identity = fakeIdentity()
    const storage = memoryStorage()
    const original = await makeOld(identity, storage).signUp({
      username: 'x@y.z',
      password: 'one'
    })

    const hh = makeNew(identity, storage, true)
    await hh.waitUntilReady()
    await hh.changeCredentials({
      newUsername: 'x@y.z',
      newPassword: 'two',
      oldUsername: 'x@y.z',
      oldPassword: 'one'
    })
    expect(identity.records.size).toBe(1)
    const afterChange = await makeOld(identity, memoryStorage()).login({
      username: 'x@y.z',
      password: 'two'
    })
    expectSameWallet(afterChange, hh.getWallet()!)
    expect(afterChange.getAddressString()).toBe(original.getAddressString())

    // recovery link flow: entropy is written to storage, then resetPassword
    const recoveryStorage = memoryStorage()
    recoveryStorage.data.set(
      'hedgehog-entropy-key',
      storage.data.get('hedgehog-entropy-key')!
    )
    const recovering = makeNew(identity, recoveryStorage, true)
    await recovering.waitUntilReady()
    await recovering.resetPassword({ username: 'x@y.z', password: 'three' })
    const afterReset = await makeOld(identity, memoryStorage()).login({
      username: 'x@y.z',
      password: 'three'
    })
    expect(afterReset.getAddressString()).toBe(original.getAddressString())
  })

  it('logout clears the same key', async () => {
    const identity = fakeIdentity()
    const storage = memoryStorage()
    const hh = makeNew(identity, storage)
    await hh.signUp({ username: 'q@q.q', password: 'pw' })
    expect(storage.data.has('hedgehog-entropy-key')).toBe(true)
    await hh.logout()
    expect(storage.data.size).toBe(0)
    expect(hh.isLoggedIn()).toBe(false)
  })

  it('lookup keys match', async () => {
    for (const [u, p] of [
      ['Some@Email.com', 'pw'],
      ['a@b.c', randomString(20)]
    ]) {
      expect(await WalletManager.createAuthLookupKey(u, p, fakeCreateKey)).toBe(
        await old.WalletManager.createAuthLookupKey(u, p, fakeCreateKey)
      )
    }
  })
})

describe('waitUntil', () => {
  it('resolves without waiting for a poll tick when already satisfied', async () => {
    const start = performance.now()
    await waitUntil(() => true)
    expect(performance.now() - start).toBeLessThan(50)
  })

  it('polls until the condition holds', async () => {
    let ready = false
    setTimeout(() => {
      ready = true
    }, 20)
    await waitUntil(() => ready)
    expect(ready).toBe(true)
  })
})
