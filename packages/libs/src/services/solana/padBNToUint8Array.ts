import type BN from 'bn.js'
export const padBNToUint8Array = (bn: BN): number[] => bn.toArray('le', 8)
