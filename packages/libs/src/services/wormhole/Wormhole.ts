import type { Hedgehog } from '@audius/hedgehog'
import wormholeSDK, { ChainId } from '@certusone/wormhole-sdk'
import type { GetSignedVAAResponse } from '@certusone/wormhole-sdk/lib/cjs/proto/publicrpc/v1/publicrpc'
import type {
  RpcResponseAndContext,
  SignatureResult,
  Transaction,
  TransactionResponse
} from '@solana/web3.js'
import bs58 from 'bs58'
import { BN, toBuffer } from 'ethereumjs-util'
import type { ContractReceipt } from 'ethers'
import { providers } from 'ethers/lib/index'
import { zeroPad } from 'ethers/lib/utils'

import { Utils, sign, getTransferTokensDigest, Nullable } from '../../utils'
import type { EthContracts } from '../ethContracts'
import type { EthWeb3Manager } from '../ethWeb3Manager'
import type { IdentityService, RelayTransactionData } from '../identity'
import type { SolanaWeb3Manager } from '../solana'
import { SolanaUtils, wAudioFromWeiAudio } from '../solana'

export type WormholeConfig = {
  rpcHosts: string[]
  solBridgeAddress: string
  solTokenBridgeAddress: string
  ethBridgeAddress: string
  ethTokenBridgeAddress: string
}

/** Singleton state-manager for audius wormhole interaction */
export class Wormhole {
  hedgehog: Nullable<Hedgehog>
  ethWeb3Manager: EthWeb3Manager
  ethContracts: EthContracts
  identityService: Nullable<IdentityService>
  solanaWeb3Manager: SolanaWeb3Manager
  rpcHosts: string[]
  solBridgeAddress: string
  solTokenBridgeAddress: string
  ethBridgeAddress: string
  ethTokenBridgeAddress: string
  wormholeSDK: typeof wormholeSDK

  constructor(
    hedgehog: Hedgehog | null,
    ethWeb3Manager: EthWeb3Manager,
    ethContracts: EthContracts,
    identityService: IdentityService | null,
    solanaWeb3Manager: SolanaWeb3Manager,
    rpcHosts: string[],
    solBridgeAddress: string,
    solTokenBridgeAddress: string,
    ethBridgeAddress: string,
    ethTokenBridgeAddress: string
  ) {
    // Wormhole service dependecies
    this.hedgehog = hedgehog
    this.ethWeb3Manager = ethWeb3Manager
    this.ethContracts = ethContracts
    this.identityService = identityService
    this.solanaWeb3Manager = solanaWeb3Manager

    // Wormhole config
    this.rpcHosts = rpcHosts
    this.solBridgeAddress = solBridgeAddress
    this.solTokenBridgeAddress = solTokenBridgeAddress
    this.ethBridgeAddress = ethBridgeAddress
    this.ethTokenBridgeAddress = ethTokenBridgeAddress
    this.wormholeSDK = wormholeSDK
  }

  async getSignedVAAWithRetry(
    hosts: string[],
    emitterChain: ChainId,
    emitterAddress: string,
    sequence: string,
    extraGrpcOpts = {},
    retryTimeout = 5000,
    retryAttempts = 60
  ) {
    let currentWormholeRpcHost = -1
    const getNextRpcHost = () => ++currentWormholeRpcHost % hosts.length
    let result: GetSignedVAAResponse | undefined
    let attempts = 0
    while (!result) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, retryTimeout))
      try {
        result = await this.wormholeSDK.getSignedVAA(
          hosts[getNextRpcHost()] as string,
          emitterChain,
          emitterAddress,
          sequence,
          extraGrpcOpts
        )
      } catch (e) {
        if (retryAttempts !== undefined && attempts > retryAttempts) {
          throw e
        }
      }
    }
    return result
  }

  /**
   * Sends `amount` tokens to `solanaAccount` by way of the wormhole
   */
  async attestAndCompleteTransferEthToSol(
    ethTxReceipt: string,
    customSignTransaction?: (transaction: Transaction) => Promise<Transaction>,
    options = {}
  ) {
    const phases = {
      GET_RECEIPT: 'GET_RECEIPT',
      GET_SIGNED_VAA: 'GET_SIGNED_VAA',
      POST_VAA_SOLANA: 'POST_VAA_SOLANA',
      REDEEM_ON_SOLANA: 'REDEEM_ON_SOLANA'
    }
    let phase = phases.GET_RECEIPT
    const logs = [
      `Attest and complete transfer for eth to sol for reciept ${ethTxReceipt}`
    ]
    try {
      const receipt =
        await this.ethWeb3Manager.web3.eth.getTransactionReceipt(ethTxReceipt)
      const sequence = this.wormholeSDK.parseSequenceFromLogEth(
        receipt as unknown as ContractReceipt,
        this.ethBridgeAddress
      )
      const emitterAddress = this.wormholeSDK.getEmitterAddressEth(
        this.ethTokenBridgeAddress
      )
      phase = phases.GET_SIGNED_VAA
      const { vaaBytes } = await this.getSignedVAAWithRetry(
        this.rpcHosts,
        this.wormholeSDK.CHAIN_ID_ETH,
        emitterAddress,
        sequence,
        options
      )

      const connection = this.solanaWeb3Manager.getConnection()
      let signTransaction: (transaction: Transaction) => Promise<Transaction>
      if (customSignTransaction) {
        signTransaction = customSignTransaction
      } else {
        if (!this.identityService) {
          throw new Error('Identity service required to relay raw transaction')
        }
        signTransaction = async (transaction: Transaction) => {
          const { blockhash } = await connection.getLatestBlockhash()
          // Must call serialize message to set the correct signatures on the transaction
          transaction.serializeMessage()
          const transactionData: RelayTransactionData = {
            recentBlockhash: blockhash,
            instructions: transaction.instructions.map(
              SolanaUtils.prepareInstructionForRelay
            ),
            signatures: transaction.signatures.map((sig) => ({
              publicKey: sig.publicKey.toString(),
              signature: sig.signature!
            }))
          }

          const { transactionSignature } =
            await this.identityService!.solanaRelayRaw(transactionData)
          logs.push(
            `Relay sol tx for postVAA with signature ${transactionSignature}`
          )
          const signedTransaction = {
            serialize: () => {}
          }
          return signedTransaction as Transaction
        }
        connection.sendRawTransaction = async () => ''
        connection.confirmTransaction = async () =>
          '' as unknown as RpcResponseAndContext<SignatureResult>
      }
      phase = phases.POST_VAA_SOLANA
      await this.wormholeSDK.postVaaSolana(
        connection,
        signTransaction,
        this.solBridgeAddress,
        this.solanaWeb3Manager.feePayerAddress.toString(), // payerAddress
        vaaBytes as Buffer
      )

      // Finally, redeem on Solana
      phase = phases.REDEEM_ON_SOLANA
      const transaction = await this.wormholeSDK.redeemOnSolana(
        connection,
        this.solBridgeAddress,
        this.solTokenBridgeAddress,
        this.solanaWeb3Manager.feePayerAddress.toString(), // payerAddress,
        vaaBytes
      )

      let finalTxSignature
      // Must call serialize message to set the correct signatures on the transaction
      if (customSignTransaction) {
        const signedTransaction = await signTransaction(transaction)
        const txid = await connection.sendRawTransaction(
          signedTransaction.serialize()
        )
        finalTxSignature = txid

        await connection.confirmTransaction(txid)
      } else {
        if (!this.identityService) {
          throw new Error('Identity service required to relay raw transaction')
        }

        transaction.serializeMessage()

        const { blockhash } = await connection.getLatestBlockhash()
        const transactionData: RelayTransactionData = {
          recentBlockhash: blockhash,
          instructions: transaction.instructions.map(
            SolanaUtils.prepareInstructionForRelay
          ),
          signatures: transaction.signatures.map((sig) => ({
            publicKey: sig.publicKey.toString(),
            signature: sig.signature!
          }))
        }

        const { transactionSignature } =
          await this.identityService.solanaRelayRaw(transactionData)
        finalTxSignature = transactionSignature
      }
      logs.push(`Complete redeem on sol with signature ${finalTxSignature}`)
      return {
        transactionSignature: finalTxSignature,
        error: null,
        phase,
        logs
      }
    } catch (error) {
      return {
        error: (error as Error).message,
        phase,
        logs
      }
    }
  }

  /**
   * Sends `amount` tokens to `solanaAccount` by way of the wormhole
   */
  async sendTokensFromSolToEthViaWormhole(
    amount: BN,
    ethTargetAddress: string,
    options = {}
  ) {
    if (!this.hedgehog) {
      throw new Error('Hedgehog required for sendTokensFromSolToEthViaWormhole')
    }
    if (!this.identityService) {
      throw new Error('Identity service required to relay raw transaction')
    }
    const phases = {
      GENERATE_SOL_ROOT_ACCT: 'GENERATE_SOL_ROOT_ACCT',
      TRANSFER_WAUDIO_TO_ROOT: 'TRANSFER_WAUDIO_TO_ROOT',
      TRANFER_FROM_SOL: 'TRANFER_FROM_SOL',
      GET_SIGNED_VAA: 'GET_SIGNED_VAA',
      GET_EMITTER_ADDR: 'GET_EMITTER_ADDR',
      REDEEM_ON_ETH: 'REDEEM_ON_ETH'
    }
    let phase = phases.GENERATE_SOL_ROOT_ACCT
    const logs = [`Transferring ${amount} WAUDIO to ${ethTargetAddress}`]
    try {
      if (
        typeof window === 'undefined' ||
        window == null ||
        // @ts-expect-error
        window.ethereum == null
      ) {
        throw new Error('Expected a browser/client context with Metamask')
      }
      const wAudioAmount = wAudioFromWeiAudio(amount)
      // Generate a solana keypair derived from the hedgehog private key
      // NOTE: The into to fromSeed is a 32 bytes Uint8Array
      const rootSolanaAccount =
        this.solanaWeb3Manager.solanaWeb3.Keypair.fromSeed(
          this.hedgehog.wallet?.getPrivateKey() as Uint8Array
        )

      const solanaAddress = rootSolanaAccount.publicKey.toString()
      logs.push(`Root Solana Account: ${solanaAddress}`)

      // Find the token account owned by the root solana account and get the token account's info
      const associatedTokenAccount =
        await this.solanaWeb3Manager.findAssociatedTokenAddress(solanaAddress)
      const tokenAccountInfo = await this.solanaWeb3Manager.getTokenAccountInfo(
        associatedTokenAccount.toString()
      )

      // If it's not a valid token account, create the token account
      if (!tokenAccountInfo) {
        logs.push(
          `Creating Associated Token Account: ${associatedTokenAccount.toString()}`
        )
        await this.solanaWeb3Manager.createAssociatedTokenAccount(solanaAddress)
      } else {
        logs.push(
          `Associated Token Account Exits: ${associatedTokenAccount.toString()}`
        )
      }

      phase = phases.TRANSFER_WAUDIO_TO_ROOT
      // Move wrapped audio from then user bank account to the user's token wallet
      await this.solanaWeb3Manager.transferWAudio(
        tokenAccountInfo!.address.toString(),
        amount
      )
      logs.push(
        `Transferred waudio ${wAudioAmount.toString()} balance to associated token account`
      )
      phase = phases.TRANFER_FROM_SOL

      const connection = this.solanaWeb3Manager.getConnection()

      // Submit transaction - results in a Wormhole message being published
      const tx = await this.wormholeSDK.transferFromSolana(
        connection, // solana web3 Connection
        this.solBridgeAddress, // bridge address
        this.solTokenBridgeAddress, // token bridge address
        this.solanaWeb3Manager.feePayerAddress as unknown as string, // payerAddress
        tokenAccountInfo!.address.toString(), // fromAddress
        this.solanaWeb3Manager.mints.audio.toString(), // mintAddress
        wAudioAmount, // BigInt
        zeroPad(toBuffer(ethTargetAddress), 32), // Uint8Array of length 32 targetAddress
        this.wormholeSDK.CHAIN_ID_ETH, // ChainId targetChain
        zeroPad(
          toBuffer(this.ethContracts.AudiusTokenClient.contractAddress),
          32
        ), // Uint8Array of length 32 originAddress
        this.wormholeSDK.CHAIN_ID_ETH, //  ChainId originChain
        solanaAddress // from owner address
      )

      // Must call serialize message to set the correct signatures on the transaction
      tx.serializeMessage()
      tx.partialSign(rootSolanaAccount)

      const { blockhash } = await connection.getLatestBlockhash()
      const transactionData: RelayTransactionData = {
        recentBlockhash: blockhash,
        instructions: tx.instructions.map(
          SolanaUtils.prepareInstructionForRelay
        ),
        signatures: tx.signatures.map((sig) => ({
          publicKey: sig.publicKey.toString(),
          signature: sig.signature!
        }))
      }
      const { transactionSignature } =
        await this.identityService.solanaRelayRaw(transactionData)
      logs.push(
        `Transferred to wormhole with signature: ${transactionSignature}`
      )
      phase = phases.GET_EMITTER_ADDR

      // Get the sequence number and emitter address required to fetch the signedVAA of our message
      // Declare the highest transaction version this client can decode. RPC
      // providers reject getTransaction requests that omit this now that
      // Transaction v1 is live. web3.js 1.x decodes legacy and v0 only, and the
      // transaction relayed above is always legacy, so 0 is correct here.
      const info = (await connection.getTransaction(transactionSignature, {
        maxSupportedTransactionVersion: 0
      })) as TransactionResponse | null
      const sequence = this.wormholeSDK.parseSequenceFromLogSolana(info!)
      const emitterAddress = await this.wormholeSDK.getEmitterAddressSolana(
        this.solTokenBridgeAddress
      )
      // Fetch the signedVAA from the Wormhole Network (this may require retries while you wait for confirmation)
      phase = phases.GET_SIGNED_VAA
      const { vaaBytes } = await this.getSignedVAAWithRetry(
        this.rpcHosts,
        this.wormholeSDK.CHAIN_ID_SOLANA,
        emitterAddress,
        sequence,
        options
      )

      // Redeem on Ethereum
      // NOTE: The signer should be the user's personal wallet
      phase = phases.REDEEM_ON_ETH
      // @ts-expect-error
      const signer = new providers.Web3Provider(window.ethereum).getSigner()
      await this.wormholeSDK.redeemOnEth(
        this.ethTokenBridgeAddress,
        signer,
        vaaBytes
      )
      logs.push('Redeemed on eth')
      return { phase, logs, error: null }
    } catch (error) {
      return {
        error: (error as Error).message,
        phase,
        logs
      }
    }
  }

  /**
   * Locks assets owned by `fromAccount` into the Solana wormhole with a target
   * solanaAccount destination via the provided relayer wallet.
   */
  async _getTransferTokensToEthWormholeParams(
    fromAccount: string,
    amount: BN,
    solanaAccount: string
  ) {
    if (!this.hedgehog) {
      throw new Error(
        'Hedgehog required for _getTransferTokensToEthWormholeParams'
      )
    }
    const web3 = this.ethWeb3Manager.getWeb3()
    const wormholeClientAddress =
      this.ethContracts.WormholeClient.contractAddress

    const chainId = await web3.eth.getChainId()

    const currentBlockNumber = await web3.eth.getBlockNumber()
    const currentBlock = await web3.eth.getBlock(currentBlockNumber)

    // 1 hour, sufficiently far in future
    const deadline = (currentBlock.timestamp as unknown as number) + 60 * 60 * 1
    const solanaB58 = bs58.decode(solanaAccount).toString('hex')
    const recipient = toBuffer(`0x${solanaB58}`)
    const nonce = await this.ethContracts.WormholeClient.nonces(fromAccount)
    const arbiterFee = Utils.toBN('0')

    const digest = getTransferTokensDigest(
      web3,
      'AudiusWormholeClient',
      wormholeClientAddress,
      chainId,
      {
        from: fromAccount,
        amount,
        recipientChain: chainId,
        recipient,
        arbiterFee
      },
      nonce,
      deadline
    )
    const privateKey = this.hedgehog.getWallet()?.getPrivateKey()
    const signedDigest = sign(digest, privateKey!)
    return {
      chainId,
      deadline,
      recipient,
      arbiterFee,
      signedDigest
    }
  }

  /**
   * Locks assets owned by `fromAccount` into the Solana wormhole with a target
   * solanaAccount destination via the provided relayer wallet.
   * @param fromAccount the account holding the ETH AUDIO to transfer
   * @param amount The amount of AUDIO to send in WEI (18 decimals)
   * @param solanaAccount The solana token account
   * @param relayer The eth relayer to permission to aprrove and transfer
   */
  async transferTokensToEthWormhole(
    fromAccount: string,
    amount: BN,
    solanaAccount: string,
    relayer: string
  ) {
    const { chainId, deadline, recipient, arbiterFee, signedDigest } =
      await this._getTransferTokensToEthWormholeParams(
        fromAccount,
        amount,
        solanaAccount
      )
    const tx = await this.ethContracts.WormholeClient.transferTokens(
      fromAccount,
      amount,
      chainId,
      recipient,
      arbiterFee,
      deadline,
      signedDigest,
      relayer
    )
    return tx
  }

  async getTransferTokensToEthWormholeMethod(
    fromAccount: string,
    amount: BN,
    solanaAccount: string
  ) {
    const { chainId, deadline, recipient, arbiterFee, signedDigest } =
      await this._getTransferTokensToEthWormholeParams(
        fromAccount,
        amount,
        solanaAccount
      )
    const method =
      await this.ethContracts.WormholeClient.WormholeContract.methods.transferTokens(
        fromAccount,
        amount,
        chainId,
        recipient,
        arbiterFee,
        deadline,
        signedDigest.v,
        signedDigest.r,
        signedDigest.s
      )
    return method
  }
}
