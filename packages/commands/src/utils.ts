import {
  createSdkWithServices,
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
    const audiusSdk = await initializeAudiusSdk()
    const { data } = await audiusSdk.users.getUserByHandle({
      handle: arg.slice(1)
    })
    const id = data!.id
    return decodeHashId(id)!
  } else if (arg.startsWith('#')) {
    return Number(arg.slice(1))
  } else {
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
    hedgehog = new Hedgehog(getFn, setAuthFn, setUserFn, true, localStorage)
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
    if (handle) {
      localStorage.removeItem('hedgehog-entropy-key')
      const handleEntropy = localStorage.getItem(`handle-${handle}`)
      if (!handleEntropy) {
        throw new Error(`Failed to find entropy for handle ${handle}`)
      }
      localStorage.setItem('hedgehog-entropy-key', handleEntropy)
    }

    const audiusWalletClient = createHedgehogWalletClient(getHedgehog())

    audiusSdk = createSdkWithServices({
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
    return new PublicKey(arg)
  }
}

export const getCurrentUserId = async () => {
  if (!audiusSdk) {
    throw new Error('sdk not initialized')
  }
  const [address] = await audiusSdk.services.audiusWalletClient.getAddresses()
  const { data } = await audiusSdk.users.getUserAccount({
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
  const { data } = await audiusSdk.users.getUserAccount({
    wallet: address
  })
  if (!data?.user) {
    throw new Error('not signed in')
  }
  return data.user.handle
}

export const createRandomImage = () => {
  const width = 100
  const height = 100
  const headerSize = 54
  const rowPadding = (4 - ((width * 3) % 4)) % 4

  const buffer = Buffer.alloc(
    headerSize + width * height * 3 + rowPadding * height
  )
  buffer.write('BM', 0)
  buffer.writeUInt32LE(buffer.length, 2)
  buffer.writeUInt32LE(0, 6)
  buffer.writeUInt32LE(headerSize, 10)

  buffer.writeUInt32LE(40, 14)
  buffer.writeInt32LE(width, 18)
  buffer.writeInt32LE(height, 22)
  buffer.writeUInt16LE(1, 26)
  buffer.writeUInt16LE(24, 28)
  buffer.writeUInt32LE(0, 30)
  buffer.writeUInt32LE(width * height * 3 + rowPadding * height, 34)
  buffer.writeInt32LE(0, 38)
  buffer.writeInt32LE(0, 42)
  buffer.writeUInt32LE(0, 46)
  buffer.writeUInt32LE(0, 50)

  let offset = headerSize
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const r = (x / width) * 255
      const g = (y / height) * 255
      const b = ((x + y) / (width + height)) * 255
      buffer.writeUInt8(b, offset++)
      buffer.writeUInt8(g, offset++)
      buffer.writeUInt8(r, offset++)
    }
    for (let p = 0; p < rowPadding; p++) {
      buffer.writeUInt8(0, offset++)
    }
  }
  return buffer
}

export const parseBoolean = (arg: string | true) => {
  return arg === true || arg === 'true'
}
