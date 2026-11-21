import {
  Blob,
  Layout,
  blob,
  u32,
  uint8ArrayToBuffer
} from '@solana/buffer-layout'

/**
 * Wrapper that makes Ethereum wallet addresses encoded and decoded as 20 byte blobs
 */
export class EthereumAddress extends Layout<string> {
  private blob: Blob
  constructor(property?: string) {
    super(20, property)
    this.blob = blob(20, property)
  }

  /** @override */
  getSpan(b: Uint8Array, offset?: number) {
    return this.blob.getSpan(b, offset)
  }

  /**
   * Proxies the decoding to the underlying Blob, then
   * converts the buffer to hex and prepends '0x'.
   * @override
   * */
  decode(b: Uint8Array, offset = 0) {
    const buffer = this.blob.decode(b, offset)
    return '0x' + Buffer.from(buffer).toString('hex')
  }

  /**
   * Strips the 0x and converts the address to a buffer, then
   * proxies the encoding to the underlying Blob.
   * @override
   * */
  encode(src: string, b: Uint8Array, offset = 0) {
    const strippedEthAddress = src.replace('0x', '')
    const buf = Buffer.from(strippedEthAddress, 'hex')
    const fixedBuf = Buffer.alloc(20, 0)
    buf.copy(fixedBuf, 20 - buf.length)
    return this.blob.encode(buf, b, offset)
  }
}

/**
 * Wrapper that encodes strings the way Borsh does, with the length prepended
 */
export class BorshString extends Layout<string> {
  constructor(
    private readonly maxLength: number,
    property?: string
  ) {
    super(-1, property)
  }

  getSpan(b: Uint8Array, offset = 0): number {
    if (!b) {
      return u32().span + this.maxLength
    }
    const length = u32().decode(b, offset)
    return u32().span + length
  }

  decode(b: Uint8Array, offset = 0): string {
    const length = u32().decode(b, offset)
    const value = blob(length).decode(b, offset + u32().span)
    return uint8ArrayToBuffer(value).toString('utf-8')
  }

  encode(src: string, b: Uint8Array, offset: number): number {
    const srcb = Buffer.from(src, 'utf-8')
    if (srcb.length > this.maxLength) {
      throw new RangeError('text exceeds maxLength')
    }
    if (offset + srcb.length > b.length) {
      throw new RangeError('text length exceeds buffer')
    }
    return (
      u32().encode(srcb.length, b, offset) +
      blob(srcb.length).encode(srcb, b, offset + u32().span)
    )
  }
}

/** Factory for EthereumAddress layouts */
export const ethAddress = (property?: string) => new EthereumAddress(property)
/** Factory for BorshString layouts */
export const borshString = (maxLength: number, property?: string) =>
  new BorshString(maxLength, property)
