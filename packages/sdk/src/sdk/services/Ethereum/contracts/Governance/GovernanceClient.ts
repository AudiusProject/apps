import { Governance } from '@audius/eth'

import { EthereumContract } from '../EthereumContract'

import type { GovernanceConfig } from './types'

export class GovernanceClient extends EthereumContract {
  contract: typeof Governance

  constructor(config: GovernanceConfig) {
    super(config)

    this.contract = new Governance()
  }
}
