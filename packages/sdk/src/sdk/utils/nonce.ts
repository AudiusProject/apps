import { bytesToHex as toHex, randomBytes } from '@noble/hashes/utils'
import type { Hex } from 'viem'

/**
 * Generates a cryptographically secure nonce, in node or the browser, for
 * EIP-712 signed messages that need replay protection.
 */
export const getNonce = async () => {
  return ('0x' + toHex(randomBytes(32))) as Hex
}
