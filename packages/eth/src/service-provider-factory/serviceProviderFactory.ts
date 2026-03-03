import { abi } from './abi'

/**
 * Manages registration and staking for service providers.
 * Tracks endpoints, deployer stake, deployer cut percentage,
 * and min/max stake bounds. Includes lockup periods for stake decreases and
 * deployer cut updates.
 */
export const ServiceProviderFactory = {
  abi,
  address: '0xD17A9bc90c582249e211a4f4b16721e7f65156c8' as const
}
