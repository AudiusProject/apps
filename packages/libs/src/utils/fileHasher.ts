import fs from 'fs'
import { Stream } from 'stream'
import * as util from 'util'

import type { Blockstore, Options } from 'interface-blockstore'
import type {
  AwaitIterable,
  Pair,
  Batch,
  Query,
  KeyQuery
} from 'interface-store'
import {
  ImportCandidate,
  importer,
  UserImporterOptions
} from 'ipfs-unixfs-importer'
import { CID } from 'multiformats/cid'
import * as json from 'multiformats/codecs/json'
import { sha256 } from 'multiformats/hashes/sha2'

export type Content = ReadableStream | Buffer | string
export interface ImageHasher {
  options: UserImporterOptions
  content: ImportCandidate
}
export interface NonImageHasher {
  options: UserImporterOptions
  content: Uint8Array
}
export interface HashedImage {
  path: string | undefined
  cid: string
  size: number
}

const { promisify } = util

const block: Blockstore = {
  get: async (key: CID, _options?: Options) => {
    throw new Error(`unexpected block API get for ${key}`)
  },
  put: async (_key: CID, _val: Uint8Array, _options?: Options) => {
    throw new Error('unexpected block API put')
  },
  open: async function (): Promise<void> {
    throw new Error('Function not implemented.')
  },
  close: async function (): Promise<void> {
    throw new Error('Function not implemented.')
  },
  has: async function (_key: CID, _options?: Options): Promise<boolean> {
    throw new Error('Function not implemented.')
  },
  delete: async function (_key: CID, _options?: Options): Promise<void> {
    throw new Error('Function not implemented.')
  },
  putMany: function (
    _source: AwaitIterable<Pair<CID, Uint8Array>>,
    _options?: Options
  ): AsyncIterable<Pair<CID, Uint8Array>> {
    throw new Error('Function not implemented.')
  },
  getMany: function (
    _source: AwaitIterable<CID>,
    _options?: Options
  ): AsyncIterable<Uint8Array> {
    throw new Error('Function not implemented.')
  },
  deleteMany: function (
    _source: AwaitIterable<CID>,
    _options?: Options
  ): AsyncIterable<CID> {
    throw new Error('Function not implemented.')
  },
  batch: function (): Batch<CID, Uint8Array> {
    throw new Error('Function not implemented.')
  },
  query: function (
    _query: Query<CID, Uint8Array>,
    _options?: Options
  ): AsyncIterable<Pair<CID, Uint8Array>> {
    throw new Error('Function not implemented.')
  },
  queryKeys: function (
    _query: KeyQuery<CID>,
    _options?: Options
  ): AsyncIterable<CID> {
    throw new Error('Function not implemented.')
  }
}

export const fileHasher = {
  convertNanosToMillis(nanoSeconds: bigint) {
    return nanoSeconds / BigInt(1000000)
  },

  initImageHasher(
    content: ImportCandidate,
    options: UserImporterOptions
  ): ImageHasher {
    options = options || {}
    options.onlyHash = true
    options.cidVersion = 0

    return { options, content }
  },

  initNonImageHasher(
    content: Uint8Array,
    options: UserImporterOptions
  ): NonImageHasher {
    options = options || {}
    options.onlyHash = true
    options.cidVersion = 0

    return { options, content }
  },

  async convertToBuffer(content: Content, logger: any): Promise<Buffer> {
    if (Buffer.isBuffer(content)) return content

    let buffer: any
    try {
      if (content instanceof Stream.Readable) {
        await new Promise((resolve, reject) => {
          content.on('data', (chunk: any) => buffer.push(chunk))
          content.on('end', () => resolve(Buffer.concat(buffer)))
          content.on('error', (err: any) => reject(err))
        })
      } else {
        const fsReadFile = promisify(fs.readFile)
        buffer = await fsReadFile(content as string)
      }
    } catch (e: any) {
      const errMsg = `[fileHasher - convertToBuffer()] Could not convert content into buffer: ${e.toString()}`
      logger.error(errMsg)
      throw new Error(errMsg)
    }

    return buffer
  },

  async hashNonImages(
    content: Uint8Array,
    options: UserImporterOptions = {}
  ): Promise<string> {
    ;({ options, content } = fileHasher.initNonImageHasher(content, options))

    let lastCid: string = ''
    for await (const { cid } of importer([{ content }], block, options)) {
      lastCid = `${cid}`
    }

    return lastCid
  },

  async hashImages(
    content: ImportCandidate,
    options: UserImporterOptions = {}
  ): Promise<HashedImage[]> {
    ;({ options, content } = fileHasher.initImageHasher(content, options))

    const result: HashedImage[] = []
    for await (const file of importer(content, block, options)) {
      result.push({
        path: file.path,
        cid: `${file.cid}`,
        size: file.size
      })
    }

    return result
  },

  async generateNonImageCid(
    content: Content,
    logger: any = console
  ): Promise<string> {
    const buffer = await fileHasher.convertToBuffer(content, logger)
    return await fileHasher.hashNonImages(buffer)
  },

  async generateMetadataCidV1(metadata: {}): Promise<CID> {
    const bytes = json.encode(metadata)
    const hash = await sha256.digest(bytes)
    return CID.create(1, json.code, hash)
  },

  async generateImageCids(
    content: ImportCandidate,
    _: any = console
  ): Promise<HashedImage[]> {
    return await fileHasher.hashImages(content)
  }
}
