import type { Hedgehog } from '@audius/hedgehog'
import type { Genre, Mood } from '@audius/sdk'
import { PublicKey } from '@solana/web3.js'
import type { BN } from 'ethereumjs-util'

import { AuthHeaders } from '../constants'
import { Nullable, UserMetadata, Utils } from '../utils'
import { getPermitDigest, sign } from '../utils/signatures'

import type { ServiceProvider } from './ServiceProvider'
import type { Users } from './Users'
import { Base, BaseConstructorArgs, Services } from './base'

export class Account extends Base {
  User: Users
  ServiceProvider: ServiceProvider

  constructor(
    userApi: Users,
    serviceProvider: ServiceProvider,
    ...services: BaseConstructorArgs
  ) {
    super(...services)

    this.User = userApi
    this.ServiceProvider = serviceProvider

    this.login = this.login.bind(this)
    this.logout = this.logout.bind(this)
    this.generateRecoveryLink = this.generateRecoveryLink.bind(this)
    this.confirmCredentials = this.confirmCredentials.bind(this)
    this.changeCredentials = this.changeCredentials.bind(this)
    this.resetPassword = this.resetPassword.bind(this)
    this.checkIfEmailRegistered = this.checkIfEmailRegistered.bind(this)
    this.associateTwitterUser = this.associateTwitterUser.bind(this)
    this.associateInstagramUser = this.associateInstagramUser.bind(this)
    this.associateTikTokUser = this.associateTikTokUser.bind(this)
    this.lookupTwitterHandle = this.lookupTwitterHandle.bind(this)
    this.searchFull = this.searchFull.bind(this)
    this.searchAutocomplete = this.searchAutocomplete.bind(this)
    this.searchTags = this.searchTags.bind(this)
    this.sendTokensFromEthToSol = this.sendTokensFromEthToSol.bind(this)
    this.sendTokensFromSolToEth = this.sendTokensFromSolToEth.bind(this)
    this.userHasClaimedSolAccount = this.userHasClaimedSolAccount.bind(this)
    this.signUpV2 = this.signUpV2.bind(this)
  }

  async login(email: string, password: string, otp?: string) {
    const phases = {
      FIND_WALLET: 'FIND_WALLET',
      FIND_USER: 'FIND_USER'
    }
    let phase = ''

    phase = phases.FIND_WALLET
    if (!this.web3Manager.web3IsExternal()) {
      this.REQUIRES(Services.HEDGEHOG)

      try {
        const ownerWallet = await this.hedgehog.login({
          email,
          username: email,
          password,
          otp
        })
        this.web3Manager.setOwnerWallet(ownerWallet)
      } catch (e) {
        return { error: (e as Error).message, phase }
      }
    }

    phase = phases.FIND_USER
    const walletAddress = this.web3Manager.getWalletAddress()

    if (walletAddress && walletAddress.length > 0) {
      const randomNodes = await this.ServiceProvider.autoSelectStorageV2Nodes(
        1,
        walletAddress
      )
      await this.creatorNode.setEndpoint(randomNodes[0]!)
      return { wallet: walletAddress, error: false, phase }
    }
    return { error: 'No user found', phase }
  }

  async logout() {
    if (!this.web3Manager.web3IsExternal()) {
      this.REQUIRES(Services.HEDGEHOG)
      await this.hedgehog.logout()
    }
  }

  async signUpV2(
    email: string,
    password: string,
    metadata: UserMetadata,
    profilePictureFile: Nullable<File> = null,
    coverPhotoFile: Nullable<File> = null,
    hasWallet = false,
    host = (typeof window !== 'undefined' && window.location.origin) || null,
    generateRecoveryLink = true
  ) {
    const phases = {
      CREATE_USER_RECORD: 'CREATE_USER_RECORD',
      HEDGEHOG_SIGNUP: 'HEDGEHOG_SIGNUP',
      SELECT_STORAGE_NODE: 'SELECT_STORAGE_NODE',
      ADD_USER: 'ADD_USER',
      UPLOAD_PROFILE_IMAGES: 'UPLOAD_PROFILE_IMAGES'
    }
    let phase = ''
    try {
      this.REQUIRES(Services.CREATOR_NODE, Services.IDENTITY_SERVICE)

      if (this.web3Manager.web3IsExternal()) {
        phase = phases.CREATE_USER_RECORD
        await this.identityService.createUserRecord(
          email,
          this.web3Manager.getWalletAddress()
        )
      } else {
        this.REQUIRES(Services.HEDGEHOG)
        if (!hasWallet) {
          phase = phases.HEDGEHOG_SIGNUP
          const ownerWallet = await this.hedgehog.signUp({
            username: email,
            password
          })
          this.web3Manager.setOwnerWallet(ownerWallet)
          if (generateRecoveryLink) {
            await this.generateRecoveryLink({
              handle: metadata.handle ?? '',
              host
            })
          }
        }
      }

      phase = phases.SELECT_STORAGE_NODE
      const randomNodes = await this.ServiceProvider.autoSelectStorageV2Nodes(
        1,
        this.web3Manager.getWalletAddress()
      )
      await this.creatorNode.setEndpoint(randomNodes[0]!)

      phase = phases.ADD_USER
      const { newMetadata, blockHash, blockNumber } =
        await this.User.createEntityManagerUserV2({
          metadata,
          profilePictureFile,
          coverPhotoFile
        })

      return { blockHash, blockNumber, userId: newMetadata.user_id }
    } catch (e: any) {
      return {
        error: e.message,
        phase,
        errorStatus: e.response ? e.response.status : null
      }
    }
  }

  async guestSignUp(email: string, metadata: UserMetadata) {
    const phases = {
      CREATE_USER_RECORD: 'CREATE_USER_RECORD',
      HEDGEHOG_SIGNUP: 'HEDGEHOG_SIGNUP',
      SELECT_STORAGE_NODE: 'SELECT_STORAGE_NODE',
      ADD_USER: 'ADD_USER',
      UPLOAD_PROFILE_IMAGES: 'UPLOAD_PROFILE_IMAGES'
    }
    let phase = ''
    try {
      this.REQUIRES(Services.CREATOR_NODE, Services.IDENTITY_SERVICE)
      this.REQUIRES(Services.HEDGEHOG)
      phase = phases.HEDGEHOG_SIGNUP

      const ownerWallet = await this.hedgehog.signUp({
        username: email,
        password: 'TemporaryPassword',
        isGuest: true
      })

      this.web3Manager.setOwnerWallet(ownerWallet)
      phase = phases.ADD_USER
      const { newMetadata, blockHash, blockNumber } =
        await this.User.createEntityManagerGuestUser(metadata)

      return { blockHash, blockNumber, userId: newMetadata.user_id }
    } catch (e: any) {
      return {
        error: e.message,
        phase,
        errorStatus: e.response ? e.response.status : null
      }
    }
  }

  async generateRecoveryLink({
    host
  }: {
    handle: string
    host?: Nullable<string>
  }) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    try {
      // @ts-expect-error hard to type this hedgehog addon
      const recoveryInfo = await this.hedgehog.generateRecoveryInfo()

      const unixTs = Math.round(new Date().getTime() / 1000)
      const data = `Click sign to authenticate with identity service: ${unixTs}`
      const signature = await this.web3Manager.sign(Buffer.from(data, 'utf-8'))

      const recoveryData = {
        login: recoveryInfo.login,
        host: host ?? recoveryInfo.host,
        data,
        signature
      }

      return await this.identityService.sendRecoveryInfo(recoveryData)
    } catch (e) {
      console.error(e)
      return { status: false }
    }
  }

  async resetPassword(args: Parameters<Hedgehog['resetPassword']>[0]) {
    this.REQUIRES(Services.HEDGEHOG)
    return await this.hedgehog.resetPassword(args)
  }

  async changeCredentials(args: Parameters<Hedgehog['changeCredentials']>[0]) {
    this.REQUIRES(Services.HEDGEHOG)
    return await this.hedgehog.changeCredentials(args)
  }

  async confirmCredentials(
    args: Parameters<Hedgehog['confirmCredentials']>[0] & {
      softCheck?: boolean
    }
  ) {
    this.REQUIRES(Services.HEDGEHOG)
    if (args.softCheck) {
      // @ts-expect-error hard to type this hedgehog addon
      const lookupKey = await this.hedgehog.getLookupKey(args)
      try {
        await this.identityService.checkAuth({ lookupKey })
        return true
      } catch (e) {
        return false
      }
    }
    return await this.hedgehog.confirmCredentials(args)
  }

  async checkIfEmailRegistered(email: string) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.checkIfEmailRegistered(email)
  }

  async associateTwitterUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber: number
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.associateTwitterUser(
      uuid,
      userId,
      handle,
      blockNumber
    )
  }

  async associateInstagramUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber: number
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.associateInstagramUser(
      uuid,
      userId,
      handle,
      blockNumber
    )
  }

  async associateTikTokUser(
    uuid: string,
    userId: number,
    handle: string,
    blockNumber: number
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.associateTikTokUser(
      uuid,
      userId,
      handle,
      blockNumber
    )
  }

  async lookupTwitterHandle(handle: string) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.identityService.lookupTwitterHandle(handle)
  }

  async searchFull(text: string, kind: string, limit = 100, offset = 0) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.searchFull(text, kind, limit, offset)
  }

  async searchAutocomplete(text: string, limit = 100, offset = 0) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.searchAutocomplete(text, limit, offset)
  }

  async searchTags(
    text: string,
    userTagCount = 2,
    kind: string,
    limit = 100,
    offset = 0,
    genre?: Genre,
    mood?: Mood,
    bpmMin?: string,
    bpmMax?: string,
    key?: string,
    isVerified?: boolean,
    hasDownloads?: boolean,
    isPremium?: boolean,
    sortMethod?: 'recent' | 'relevant' | 'popular'
  ) {
    this.REQUIRES(Services.DISCOVERY_PROVIDER)
    return await this.discoveryProvider.searchTags(
      text,
      userTagCount,
      kind,
      limit,
      offset,
      genre,
      mood,
      bpmMin,
      bpmMax,
      key,
      isVerified,
      hasDownloads,
      isPremium,
      sortMethod
    )
  }

  async getHasClaimed(index?: number) {
    this.REQUIRES(Services.COMSTOCK)
    if (index) {
      return await this.ethContracts.ClaimDistributionClient?.isClaimed(index)
    }
    const userWallet = this.web3Manager.getWalletAddress()
    const web3 = this.web3Manager.getWeb3()
    const wallet = web3.utils.toChecksumAddress(userWallet)
    const claim = await this.comstock.getComstock({ wallet })
    return await this.ethContracts.ClaimDistributionClient?.isClaimed(
      claim.index
    )
  }

  async getClaimDistributionAmount() {
    this.REQUIRES(Services.COMSTOCK)
    const userWallet = this.web3Manager.getWalletAddress()
    const web3 = this.web3Manager.getWeb3()
    const wallet = web3.utils.toChecksumAddress(userWallet)
    const claimDistribution = await this.comstock.getComstock({ wallet })
    const amount = Utils.toBN(claimDistribution.amount.replace('0x', ''), 16)
    return amount
  }

  async makeDistributionClaim(
    index: number,
    amount: BN,
    merkleProof: string[]
  ) {
    this.REQUIRES(Services.COMSTOCK, Services.IDENTITY_SERVICE)
    const userWallet = this.web3Manager.getWalletAddress()
    const web3 = this.web3Manager.getWeb3()
    const wallet = web3.utils.toChecksumAddress(userWallet)
    if (index && amount && merkleProof) {
      return await this.ethContracts.ClaimDistributionClient?.claim(
        index,
        userWallet,
        amount,
        merkleProof
      )
    }
    const claim = await this.comstock.getComstock({ wallet })
    return await this.ethContracts.ClaimDistributionClient?.claim(
      claim.index,
      userWallet,
      claim.amount,
      claim.proof
    )
  }

  async permitAndSendTokens(recipientAddress: string, amount: BN) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const myWalletAddress = this.web3Manager.getWalletAddress()
    const { selectedEthWallet } =
      await this.identityService.getEthRelayer(myWalletAddress)
    await this.permitProxySendTokens(myWalletAddress, selectedEthWallet, amount)
    await this.sendTokens(
      myWalletAddress,
      recipientAddress,
      selectedEthWallet,
      amount
    )
  }

  async sendTokensFromEthToSol(amount: BN, solanaAccount: string) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const phases = {
      PERMIT_PROXY_SEND: 'PERMIT_PROXY_SEND',
      TRANSFER_TOKENS: 'TRANSFER_TOKENS',
      ATTEST_AND_COMPLETE_TRANSFER: 'ATTEST_AND_COMPLETE_TRANSFER'
    }
    let phase = phases.PERMIT_PROXY_SEND
    const logs = [
      `Send tokens from eth to sol to ${solanaAccount} for ${amount.toString()}`
    ]
    try {
      const myWalletAddress = this.web3Manager.getWalletAddress()
      const wormholeAddress = this.ethContracts.WormholeClient.contractAddress
      const { selectedEthWallet } =
        await this.identityService.getEthRelayer(myWalletAddress)
      await this.permitProxySendTokens(myWalletAddress, wormholeAddress, amount)

      logs.push('Completed permit proxy send tokens')
      phase = phases.TRANSFER_TOKENS
      const transferTokensTx =
        await this.wormholeClient.transferTokensToEthWormhole(
          myWalletAddress,
          amount,
          solanaAccount,
          selectedEthWallet
        )

      const transferTransactionHash = transferTokensTx?.txHash
      logs.push(`Completed transfer tokens with tx ${transferTransactionHash}`)
      phase = phases.ATTEST_AND_COMPLETE_TRANSFER

      const response =
        await this.wormholeClient.attestAndCompleteTransferEthToSol(
          transferTransactionHash!
        )
      if (response.transactionSignature) {
        logs.push(
          `Receive sol wrapped tokens in tx ${response.transactionSignature}`
        )
      }
      return {
        txSignature: response.transactionSignature,
        phase: response.phase,
        error: response.error ?? null,
        logs: logs.concat(response.logs)
      }
    } catch (error: any) {
      return {
        error: error.message,
        phase,
        logs
      }
    }
  }

  async proxySendTokensFromEthToSol(amount: BN, solanaAccount: string) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const myWalletAddress = this.web3Manager.getWalletAddress()
    const wormholeAddress = this.ethContracts.WormholeClient.contractAddress
    const { selectedEthWallet } =
      await this.identityService.getEthRelayer(myWalletAddress)
    const permitMethod = await this.getPermitProxySendTokensMethod(
      myWalletAddress,
      wormholeAddress,
      amount
    )
    const permit = await this.ethWeb3Manager.getRelayMethodParams(
      this.ethContracts.AudiusTokenClient.contractAddress,
      permitMethod,
      selectedEthWallet
    )
    const transferTokensMethod =
      await this.wormholeClient.getTransferTokensToEthWormholeMethod(
        myWalletAddress,
        amount,
        solanaAccount
      )
    const transferTokens = await this.ethWeb3Manager.getRelayMethodParams(
      this.ethContracts.WormholeClient.contractAddress,
      transferTokensMethod,
      selectedEthWallet
    )
    return await this.identityService.wormholeRelay({
      senderAddress: myWalletAddress,
      permit,
      transferTokens
    })
  }

  async sendTokensFromSolToEth(amount: BN, ethAccount: string) {
    const { error, logs, phase } =
      await this.wormholeClient.sendTokensFromSolToEthViaWormhole(
        amount,
        ethAccount
      )
    return { error, logs, phase }
  }

  async _getPermitProxySendTokensParams(
    owner: string,
    relayerAddress: string,
    amount: BN
  ) {
    const web3 = this.ethWeb3Manager.getWeb3()
    const myPrivateKey = this.web3Manager.getOwnerWalletPrivateKey()
    /* eslint-disable -- some funky promise logic ahead */
    const chainId = await new Promise<number>(
      async (resolve) =>
        await web3.eth.getChainId((_, chainId) => resolve(chainId))
    )
    /* eslint-enable */
    const name = await this.ethContracts.AudiusTokenClient.name()
    const tokenAddress = this.ethContracts.AudiusTokenClient.contractAddress

    const nonce = await this.ethContracts.AudiusTokenClient.nonces(owner)
    const currentBlockNumber = await web3.eth.getBlockNumber()
    const currentBlock = await web3.eth.getBlock(currentBlockNumber)
    const deadline = (currentBlock.timestamp as unknown as number) + 60 * 60 * 1

    const digest = getPermitDigest(
      web3,
      name,
      tokenAddress,
      chainId,
      { owner, spender: relayerAddress, value: amount },
      nonce,
      deadline
    )
    const result = sign(digest, myPrivateKey!)
    return {
      result,
      deadline
    }
  }

  async permitProxySendTokens(
    owner: string,
    relayerAddress: string,
    amount: BN
  ) {
    const { result, deadline } = await this._getPermitProxySendTokensParams(
      owner,
      relayerAddress,
      amount
    )
    const tx = await this.ethContracts.AudiusTokenClient.permit(
      owner,
      relayerAddress,
      amount,
      deadline,
      result.v,
      result.r,
      result.s
    )
    return tx
  }

  async getPermitProxySendTokensMethod(
    owner: string,
    relayerAddress: string,
    amount: BN
  ) {
    const { result, deadline } = await this._getPermitProxySendTokensParams(
      owner,
      relayerAddress,
      amount
    )
    const contractMethod =
      this.ethContracts.AudiusTokenClient.AudiusTokenContract.methods.permit(
        owner,
        relayerAddress,
        amount,
        deadline,
        result.v,
        result.r,
        result.s
      )
    return contractMethod
  }

  async sendTokens(
    owner: string,
    address: string,
    relayer: string,
    amount: BN
  ) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    return await this.ethContracts.AudiusTokenClient.transferFrom(
      owner,
      address,
      relayer,
      amount
    )
  }

  async updateMinimumDelegationAmount(amount: BN) {
    this.REQUIRES(Services.IDENTITY_SERVICE)
    const unixTs = Math.round(new Date().getTime() / 1000)
    const message = `Click sign to authenticate with identity service: ${unixTs}`
    const signature = await this.ethWeb3Manager.sign(
      Buffer.from(message, 'utf-8') as unknown as string
    )
    const wallet = this.ethWeb3Manager.getWalletAddress()
    return await this.identityService.updateMinimumDelegationAmount(
      wallet,
      amount,
      {
        [AuthHeaders.MESSAGE]: message,
        [AuthHeaders.SIGNATURE]: signature
      }
    )
  }

  async userHasClaimedSolAccount(
    {
      account = null,
      wallet = null,
      userId = null
    }: { account: any; wallet: Nullable<string>; userId: Nullable<number> } = {
      account: null,
      wallet: null,
      userId: null
    }
  ) {
    if (!account && !wallet && !userId) {
      throw new Error(
        'Must supply EITHER an `account` OR `wallet` and `userId` to look up whether userHasClaimedSolAccount'
      )
    }
    const userHasClaimedAccount =
      PublicKey.default.toString() !== account?.authority.toString()

    return userHasClaimedAccount
  }
}
