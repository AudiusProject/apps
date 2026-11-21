import type BN from 'bn.js'

import { ContractClient } from '../contracts/ContractClient'
import type { EthWeb3Manager } from '../ethWeb3Manager'

export class ClaimDistributionClient extends ContractClient {
  async isClaimed(index: number) {
    const method = await this.getMethod('isClaimed', index)
    const isClaimed = await method.call()
    return isClaimed
  }

  async claim(
    index: number,
    account: string,
    amount: BN,
    merkleProof: string[]
  ) {
    const method = await this.getMethod(
      'claim',
      index,
      account,
      amount,
      merkleProof
    )
    const contractAddress = await this.getAddress()
    const tx = await (this.web3Manager as EthWeb3Manager).relayTransaction(
      method,
      contractAddress,
      account
    )
    return tx
  }
}
