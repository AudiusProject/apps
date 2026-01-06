import { ReactNode, useEffect, useState } from 'react'
import { WagmiProvider } from 'wagmi'

import { getReownConfig } from './reownConfig'
import { initializeReownSync } from './reownSyncInit'

type ReownProviderProps = {
  children: ReactNode
}

/**
 * Lazy-loaded provider that initializes Reown AppKit and wraps children with WagmiProvider.
 * This ensures @reown packages are only loaded when this component is rendered.
 */
export const ReownProvider = ({ children }: ReownProviderProps) => {
  const [wagmiConfig, setWagmiConfig] = useState<any>(null)

  useEffect(() => {
    // Eagerly initialize Reown config when provider mounts
    // This ensures appkitModal and wagmiAdapter are available synchronously
    getReownConfig().then((config) => {
      initializeReownSync(config)
      setWagmiConfig(config.wagmiAdapter.wagmiConfig)
    })
  }, [])

  if (!wagmiConfig) {
    return null
  }

  return <WagmiProvider config={wagmiConfig}>{children}</WagmiProvider>
}

