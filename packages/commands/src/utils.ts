import {
  sdk,
  SolanaRelay,
  Configuration,
  createHedgehogWalletClient,
  type AudiusSdk,
  encodeHashId,
  decodeHashId,
  ResponseError,
  type LoggerService
} from '@audius/sdk'

import {
  Hedgehog,
  type GetFn,
  type SetAuthFn,
  type SetUserFn
} from '@audius/hedgehog'

import { PublicKey } from '@solana/web3.js'

import { LocalStorage } from 'node-localstorage'
const localStorage = new LocalStorage('./local-storage')

export const parseUserId = async (arg: string) => {
  if (arg.startsWith('@')) {
    // @handle
    const audiusSdk = await initializeAudiusSdk()
    const { data } = await audiusSdk.users.getUserByHandle({
      handle: arg.slice(1)
    })
    const id = data!.id
    return decodeHashId(id)!
  } else if (arg.startsWith('#')) {
    // #userId
    return Number(arg.slice(1))
  } else {
    // encoded user id
    return decodeHashId(arg)!
  }
}

let audiusSdk: AudiusSdk | undefined
let currentHandle: string | undefined

let hedgehog: Hedgehog | undefined
export const getHedgehog = () => {
  const getFn: GetFn = async (args) => {
    const res = await fetch(
      `http://audius-identity-service-1/authentication?lookupKey=${args.lookupKey}`,
      {
        method: 'GET'
      }
    )
    if (!res.ok) {
      throw new ResponseError(res)
    }
    return (await res.json()) as { iv: string; cipherText: string }
  }

  const setAuthFn: SetAuthFn = async (args) => {
    args.email = args.username
    const res = await fetch('http://audius-identity-service-1/authentication', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(args)
    })
    if (!res.ok) {
      throw new ResponseError(res)
    }
  }

  const setUserFn: SetUserFn = async (args) => {
    args.email = args.username
    const res = await fetch('http://audius-identity-service-1/user', {
      headers: {
        'Content-Type': 'application/json'
      },
      method: 'POST',
      body: JSON.stringify(args)
    })
    if (!res.ok) {
      throw new ResponseError(res)
    }
  }

  if (!hedgehog) {
    hedgehog = new Hedgehog(
      getFn,
      setAuthFn,
      setUserFn,
      /* useLocalStorage */ true,
      localStorage
    )
  }
  return hedgehog
}

class ErrorLogger implements LoggerService {
  private logPrefix = '[audius-sdk]'

  constructor(config?: { logPrefix?: string }) {
    this.logPrefix = config?.logPrefix ?? '[audius-sdk]'
  }

  public createPrefixedLogger(logPrefix: string) {
    return new ErrorLogger({
      logPrefix: `${this.logPrefix}${logPrefix}`
    })
  }

  public debug(...args: any[]) {
    console.error('[DEBUG]', this.logPrefix, ...args)
  }

  public info(...args: any[]) {
    console.error('[INFO]', this.logPrefix, ...args)
  }

  public warn(...args: any[]) {
    console.error('[WARN]', this.logPrefix, ...args)
  }

  public error(...args: any[]) {
    console.error('[ERROR]', this.logPrefix, ...args)
  }
}

export const initializeAudiusSdk = async ({
  handle
}: { handle?: string } = {}) => {
  const solanaRelay = new SolanaRelay(
    new Configuration({
      basePath: '/solana',
      headers: {
        'Content-Type': 'application/json'
      },
      middleware: [
        {
          pre: async (context) => {
            const endpoint = 'http://audius-api'
            const url = `${endpoint}${context.url}`
            return { url, init: context.init }
          }
        }
      ]
    })
  )

  if (!audiusSdk || (handle && currentHandle !== handle)) {
    // If handle was provided, unset current entropy and replace with the entropy
    // for the given user before initializing UserAuth
    if (handle) {
      localStorage.removeItem('hedgehog-entropy-key')
      const handleEntropy = localStorage.getItem(`handle-${handle}`)
      if (!handleEntropy) {
        throw new Error(`Failed to find entropy for handle ${handle}`)
      }
      localStorage.setItem('hedgehog-entropy-key', handleEntropy)
    }

    const audiusWalletClient = createHedgehogWalletClient(getHedgehog())

    audiusSdk = sdk({
      appName: 'audius-cmd',
      environment: 'development',
      services: {
        audiusWalletClient,
        solanaRelay,
        logger: new ErrorLogger()
      }
    })

    currentHandle = handle
  }

  return audiusSdk
}

export const parseSplWallet = async (arg: string) => {
  if (arg.startsWith('@') || arg.startsWith('#') || arg.length < 32) {
    // not splWallet
    const audiusSdk = await initializeAudiusSdk()
    const { data } = await audiusSdk.users.getUser({
      id: encodeHashId(await parseUserId(arg))!
    })

    if (!data?.splWallet) {
      const { userBank } =
        await audiusSdk.services.claimableTokensClient.getOrCreateUserBank({
          ethWallet: data?.ercWallet,
          mint: 'wAUDIO'
        })
      return userBank
    }
    return new PublicKey(data.splWallet)
  } else {
    // splWallet
    return new PublicKey(arg)
  }
}

export const getCurrentUserId = async () => {
  if (!audiusSdk) {
    throw new Error('sdk not initialized')
  }
  const [address] = await audiusSdk.services.audiusWalletClient.getAddresses()
  const { data } = await audiusSdk.full.users.getUserAccount({
    wallet: address
  })
  if (!data?.user) {
    throw new Error('not signed in')
  }
  return data.user.id
}

export const getCurrentUserHandle = async () => {
  if (!audiusSdk) {
    throw new Error('sdk not initialized')
  }
  if (currentHandle) {
    return currentHandle
  }
  const [address] = await audiusSdk.services.audiusWalletClient.getAddresses()
  const { data } = await audiusSdk.full.users.getUserAccount({
    wallet: address
  })
  if (!data?.user) {
    throw new Error('not signed in')
  }
  return data.user.handle
}

export const createRandomImage = () => {
  const width = 100 // Width of the image
  const height = 100 // Height of the image
  const headerSize = 54 // BMP header size
  const rowPadding = (4 - ((width * 3) % 4)) % 4 // Padding to align rows to 4-byte boundary

  // BMP file header
  const buffer = Buffer.alloc(
    headerSize + width * height * 3 + rowPadding * height
  )
  buffer.write('BM', 0) // Signature
  buffer.writeUInt32LE(buffer.length, 2) // File size
  buffer.writeUInt32LE(0, 6) // Reserved
  buffer.writeUInt32LE(headerSize, 10) // Pixel data offset

  // DIB header
  buffer.writeUInt32LE(40, 14) // DIB header size
  buffer.writeInt32LE(width, 18) // Image width
  buffer.writeInt32LE(height, 22) // Image height
  buffer.writeUInt16LE(1, 26) // Color planes
  buffer.writeUInt16LE(24, 28) // Bits per pixel
  buffer.writeUInt32LE(0, 30) // Compression
  buffer.writeUInt32LE(width * height * 3 + rowPadding * height, 34) // Image size
  buffer.writeInt32LE(0, 38) // Horizontal resolution (pixels per meter)
  buffer.writeInt32LE(0, 42) // Vertical resolution (pixels per meter)
  buffer.writeUInt32LE(0, 46) // Number of colors in palette
  buffer.writeUInt32LE(0, 50) // Important colors

  // Pixel data (simple pattern)
  let offset = headerSize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Simple color pattern (red, green, blue)
      const r = (x / width) * 255
      const g = (y / height) * 255
      const b = ((x + y) / (width + height)) * 255
      buffer.writeUInt8(b, offset++)
      buffer.writeUInt8(g, offset++)
      buffer.writeUInt8(r, offset++)
    }
    // Padding
    for (let p = 0; p < rowPadding; p++) {
      buffer.writeUInt8(0, offset++)
    }
  }
  return buffer
}

/**
 * Commander parses args as strings, this will coerce to boolean.
 * The optional args are passed as true, so keep those truthy.
 */
export const parseBoolean = (arg: string | true) => {
  return arg === true || arg === 'true'
}
