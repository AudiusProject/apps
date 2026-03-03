import { abi } from './abi'

/**
 * On-chain governance for the Audius protocol. Supports proposal creation,
 * stake-weighted voting, quorum requirements, execution delays, and a
 * guardian veto mechanism. Proposals target registered contracts and can
 * execute arbitrary transactions.
 */
export const Governance = {
  abi,
  address: '0x4DEcA517D6817B6510798b7328F2314d3003AbAC' as const
}
