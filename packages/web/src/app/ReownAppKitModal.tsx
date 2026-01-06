// Re-export from lazy-loaded config for backward compatibility
// All new code should import from 'app/reownConfig' instead
// Note: We import audiusChain directly to avoid pulling in @reown packages
import { audiusChain } from './reownConfig'
import { getInitializedConfig } from './reownSyncInit'

export { audiusChain }

// Dynamic import to avoid pulling in @reown packages at module load time
const getReownConfigDynamic = async () => {
  const module = await import('./reownConfig')
  return module.getReownConfig()
}

// Lazy getters for backward compatibility (async version)
export const getWagmiAdapter = async () => {
  const config = await getReownConfigDynamic()
  return config.wagmiAdapter
}

export const getAppkitModal = async () => {
  const config = await getReownConfigDynamic()
  return config.appkitModal
}

export const getReownConfig = getReownConfigDynamic

// For backward compatibility - synchronous access after ReownProvider initializes
// These will throw if accessed before ReownProvider mounts
export const wagmiAdapter = new Proxy({} as any, {
  get(_target, prop) {
    const config = getInitializedConfig()
    return config.wagmiAdapter[prop]
  },
  has(_target, prop) {
    try {
      const config = getInitializedConfig()
      return prop in config.wagmiAdapter
    } catch {
      return false
    }
  },
  ownKeys(_target) {
    const config = getInitializedConfig()
    return Reflect.ownKeys(config.wagmiAdapter)
  },
  getOwnPropertyDescriptor(_target, prop) {
    const config = getInitializedConfig()
    return Reflect.getOwnPropertyDescriptor(config.wagmiAdapter, prop)
  }
})

// Proxy for appkitModal - maintains synchronous API after initialization
export const appkitModal = new Proxy({} as any, {
  get(_target, prop) {
    const config = getInitializedConfig()
    const value = config.appkitModal[prop as keyof typeof config.appkitModal]
    if (typeof value === 'function') {
      return value.bind(config.appkitModal)
    }
    return value
  },
  has(_target, prop) {
    try {
      const config = getInitializedConfig()
      return prop in config.appkitModal
    } catch {
      return false
    }
  },
  ownKeys(_target) {
    const config = getInitializedConfig()
    return Reflect.ownKeys(config.appkitModal)
  },
  getOwnPropertyDescriptor(_target, prop) {
    const config = getInitializedConfig()
    return Reflect.getOwnPropertyDescriptor(config.appkitModal, prop)
  }
})
