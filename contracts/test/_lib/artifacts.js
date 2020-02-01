/* global artifacts */

/**
 * Contains all the contracts referenced in Audius unit tests
 */

// Registry contract
export const Registry = artifacts.require('./contract/Registry')

// Storage contracts
export const UserStorage = artifacts.require('./contract/storage/UserStorage')
export const TrackStorage = artifacts.require('./contract/storage/TrackStorage')
export const DiscoveryProviderStorage = artifacts.require('./contract/storage/DiscoveryProviderStorage')
export const PlaylistStorage = artifacts.require('./contract/storage/PlaylistStorage')
export const SocialFeatureStorage = artifacts.require('./contract/storage/SocialFeatureStorage')

// Factory contracts
export const UserFactory = artifacts.require('./contract/UserFactory')
export const TrackFactory = artifacts.require('./contract/TrackFactory')
export const DiscoveryProviderFactory = artifacts.require('./contract/DiscoveryProviderFactory')
export const SocialFeatureFactory = artifacts.require('./contract/SocialFeatureFactory')
export const PlaylistFactory = artifacts.require('./contract/PlaylistFactory')
export const UserLibraryFactory = artifacts.require('./contract/UserLibraryFactory')

// Test contract artifacts
export const TestStorage = artifacts.require('./contract/storage/test/TestStorage')
export const TestContract = artifacts.require('./contract/test/TestContract')
export const TestContractWithStorage = artifacts.require('./contract/test/TestContractWithStorage')
