import { TrustedNotifierManager } from '@audius/eth'

import { EthereumContract } from '../EthereumContract'

import type { TrustedNotifierManagerConfig } from './types'

export class TrustedNotifierManagerClient extends EthereumContract {
  contract: typeof TrustedNotifierManager

  constructor(config: TrustedNotifierManagerConfig) {
    super(config)

    this.contract = new TrustedNotifierManager()
  }
}
