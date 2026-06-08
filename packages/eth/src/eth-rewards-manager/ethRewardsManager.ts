import { abi } from './abi'

/**
 * Manages transferring AUDIO reward tokens from Ethereum to Solana via the
 * Wormhole bridge for the Solana-based rewards system. Holds anti-abuse
 * oracle addresses. Only governance can modify configuration.
 */
export const EthRewardsManager = {
  abi,
  address: '0x5aa6B99A2B461bA8E97207740f0A689C5C39C3b0' as const
}
