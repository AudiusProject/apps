const ContractClient = require('../contracts/ContractClient')
const signatureSchemas = require('../../../data-contracts/signatureSchemas')

class UserReplicaSetManagerClient extends ContractClient {
  async addOrUpdateCreatorNode (newCnodeId, newCnodeDelegateOwnerWallet, proposerSpId) {
    const contractAddress = await this.getAddress()
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()

    let signatureData = signatureSchemas.generators.getAddOrUpdateCreatorNodeRequestData(
      chainId,
      contractAddress,
      newCnodeId,
      newCnodeDelegateOwnerWallet,
      proposerSpId,
      nonce
    )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod('addOrUpdateCreatorNode',
      newCnodeId,
      newCnodeDelegateOwnerWallet,
      proposerSpId,
      nonce,
      sig
    )
    return this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async updateReplicaSet (userId, primary, secondaries, oldPrimary, oldSecondaries) {
    const contractAddress = await this.getAddress()
    const nonce = signatureSchemas.getNonce()
    const chainId = await this.getEthNetId()
    let web3 = this.web3Manager.getWeb3()
    let secondariesHash = web3.utils.soliditySha3(web3.eth.abi.encodeParameter('uint[]', secondaries))
    let oldSecondariesHash = web3.utils.soliditySha3(web3.eth.abi.encodeParameter('uint[]', oldSecondaries))
    let signatureData = signatureSchemas.generators.getUpdateReplicaSetRequestData(
      chainId,
      contractAddress,
      userId,
      primary,
      secondariesHash,
      oldPrimary,
      oldSecondariesHash,
      nonce
    )
    const sig = await this.web3Manager.signTypedData(signatureData)
    const method = await this.getMethod('updateReplicaSet',
      userId,
      primary,
      secondaries,
      oldPrimary,
      oldSecondaries,
      nonce,
      sig
    )
    return this.web3Manager.sendTransaction(
      method,
      this.contractRegistryKey,
      contractAddress
    )
  }

  async getArtistReplicaSet (userId) {
    const method = await this.getMethod('getArtistReplicaSet', userId)
    return method.call()
  }

  async getCreatorNodeWallet (spId) {
    const method = await this.getMethod('getCreatorNodeWallet', spId)
    return method.call()
  }
}

module.exports = UserReplicaSetManagerClient
