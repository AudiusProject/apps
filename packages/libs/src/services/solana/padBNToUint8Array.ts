import type BN from 'bn.js'
/**
 * Converts a BN to a Uint8Array of length 8, in little endian notation.
 * Useful for when Rust wants a u64 (8 * 8) represented as a byte array.
 * Ex: https://github.com/AudiusProject/apps/blob/main/solana-programs/reward-manager/program/src/processor.rs#L389
 */
export const padBNToUint8Array = (bn: BN): number[] => bn.toArray('le', 8)
