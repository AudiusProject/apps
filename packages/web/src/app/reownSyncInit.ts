// This module provides synchronous access to Reown config after it's been initialized
// It's used to bridge the async initialization with the synchronous API

let initializedConfig: {
  wagmiAdapter: any
  appkitModal: any
  audiusChain: any
} | null = null

export const initializeReownSync = (config: {
  wagmiAdapter: any
  appkitModal: any
  audiusChain: any
}) => {
  initializedConfig = config
}

export const getInitializedConfig = () => {
  if (!initializedConfig) {
    throw new Error(
      'Reown config not initialized. Make sure ReownProvider is mounted.'
    )
  }
  return initializedConfig
}

