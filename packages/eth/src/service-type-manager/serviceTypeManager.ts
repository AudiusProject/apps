import { abi } from './abi'

/** bytes32-encoded "validator" service type for use with ServiceTypeManager and ServiceProviderFactory. */
export const VALIDATOR_SERVICE_TYPE =
  '0x76616c696461746f720000000000000000000000000000000000000000000000' as const

/**
 * Manages the registry of valid service types (e.g. "validator")
 * and their versioning. Each service type has min/max stake
 * bounds. Only governance can add/remove service types or publish new versions.
 */
export const ServiceTypeManager = {
  abi,
  address: '0x9EfB0f4F38aFbb4b0984D00C126E97E21b8417C5' as const
}
