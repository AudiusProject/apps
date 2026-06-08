import { abi } from './abi'

/**
 * Central directory for the Audius protocol. Stores name-to-address mappings
 * for all protocol contracts, enabling upgradability and external lookups.
 */
export const Registry = {
  abi,
  address: '0xd976d3b4f4e22a238c1A736b6612D22f17b6f64C' as const
}
