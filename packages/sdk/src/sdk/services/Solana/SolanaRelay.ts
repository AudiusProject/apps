import {
  PublicKey,
  SendTransactionError,
  TransactionInstruction
} from '@solana/web3.js'

import { BaseAPI } from '../../api/generated/default'
import * as runtime from '../../api/generated/default/runtime'
import { parseParams } from '../../utils/parseParams'

import {
  type RelayRequestBody,
  RelayRequest,
  RelaySchema,
  LaunchCoinRequest,
  LaunchCoinResponse,
  LaunchCoinSchema,
  FirstBuyQuoteResponse,
  FirstBuyQuoteRequest,
  LaunchpadConfigResponse,
  ClaimFeesRequest,
  ClaimFeesResponse,
  ClaimVestedCoinsRequest,
  ClaimVestedCoinsResponse,
  SwapCoinQuoteRequest,
  SwapCoinQuoteResponse,
  SwapCoinRequest,
  SwapCoinResponse
} from './types'

/**
 * Client for the Solana Relay Plugin on Discovery.
 */
export class SolanaRelay extends BaseAPI {
  /**
   * Public key of the currently selected transaction fee payer
   * from the selected Discovery Node.
   */
  private feePayer: PublicKey | null = null

  /**
   * Gets a random fee payer public key from the selected discovery node's
   * Solana relay plugin.
   *
   * Used when relay transactions don't specify a fee payer override.
   */
  public async getFeePayer(
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ) {
    if (this.feePayer !== null) {
      return this.feePayer
    }
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const response = await this.request(
      {
        path: '/feePayer',
        method: 'GET',
        headers: headerParameters
      },
      initOverrides
    )
    const { feePayer } = await new runtime.JSONApiResponse(
      response,
      (json) => ({
        feePayer: !runtime.exists(json, 'feePayer')
          ? undefined
          : new PublicKey(json.feePayer as string)
      })
    ).value()
    if (!feePayer) {
      throw new Error('Failed to get fee payer!')
    }
    this.feePayer = feePayer
    return this.feePayer
  }

  /**
   * Gets a location instruction to be sent along with a transaction.
   */
  public async getLocationInstruction(
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ) {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const response = await this.request(
      {
        path: '/instruction/location',
        method: 'GET',
        headers: headerParameters
      },
      initOverrides
    )
    const { instruction } = await new runtime.JSONApiResponse(
      response,
      (json) => ({
        instruction: new TransactionInstruction({
          keys: json.instruction.keys,
          programId: new PublicKey(json.instruction.programId),
          data: Buffer.from(json.instruction.data)
        })
      })
    ).value()
    if (!instruction) {
      throw new Error('Failed to get instruction!')
    }
    return instruction
  }

  /**
   * Relays a transaction to the selected discovery node's Solana relay plugin.
   */
  public async relay(
    params: RelayRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ) {
    const { transaction, confirmationOptions, sendOptions } = await parseParams(
      'relay',
      RelaySchema
    )(params)

    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const body: RelayRequestBody = {
      transaction: Buffer.from(transaction.serialize()).toString('base64'),
      confirmationOptions,
      sendOptions
    }

    let response: Response
    try {
      response = await this.request(
        {
          path: '/relay',
          method: 'POST',
          headers: headerParameters,
          body
        },
        initOverrides
      )
    } catch (e) {
      // Catch response errors, and if possible, recreate the original
      // SendTransactionError to transparently raise to the caller.
      if (e instanceof Error && e.name === 'ResponseError') {
        const resp = (e as runtime.ResponseError).response.clone()
        const body = await resp.json()
        if (
          'error' in body &&
          'transactionMessage' in body &&
          'signature' in body
        ) {
          throw new SendTransactionError({
            action: body.error.indexOf('Simulation') > -1 ? 'simulate' : 'send',
            signature: body.signature,
            transactionMessage: body.transactionMessage,
            logs: body.transactionLogs
          })
        }
      }
      throw e
    }

    return await new runtime.JSONApiResponse(response, (json) => {
      if (!runtime.exists(json, 'signature')) {
        throw new Error('Signature missing')
      }
      return {
        signature: json.signature as string
      }
    }).value()
  }

  /**
   * Launches a new artist coin on the launchpad with bonding curve.
   * Gets back two transactions to sign and send from the client:
   * - createPoolTx: Creates the pool and metadata on-chain
   * - firstBuyTx: Makes an initial purchase of the coin
   */
  public async launchCoin(
    params: LaunchCoinRequest
  ): Promise<LaunchCoinResponse> {
    const {
      name,
      symbol,
      description,
      walletPublicKey,
      initialBuyAmountAudio,
      image
    } = await parseParams('launchCoin', LaunchCoinSchema)(params)

    const headerParameters: runtime.HTTPHeaders = {}

    // API uses multipart/form-data for the upload
    const formData = new FormData()
    formData.append('name', name)
    formData.append('symbol', symbol)
    formData.append('description', description)
    formData.append('walletPublicKey', walletPublicKey.toBase58())
    if (initialBuyAmountAudio) {
      formData.append('initialBuyAmountAudio', initialBuyAmountAudio.toString())
    }
    formData.append('image', image)

    const response = await this.request({
      path: '/launchpad/launch_coin',
      method: 'POST',
      headers: headerParameters,
      body: formData
    })

    return await new runtime.JSONApiResponse(response, (json) => {
      if (!runtime.exists(json, 'mintPublicKey')) {
        throw new Error('mintPublicKey missing from response')
      }
      if (!runtime.exists(json, 'createPoolTx')) {
        throw new Error('createPoolTx missing from response')
      }
      if (!runtime.exists(json, 'imageUri')) {
        throw new Error('imageUri missing from response')
      }
      if (!runtime.exists(json, 'configPublicKey')) {
        throw new Error('configPublicKey missing from response')
      }

      return json as LaunchCoinResponse
    }).value()
  }

  /**
   * Confirms pool creation, then creates reward pool and (optionally) executes the first buy.
   * Receives the createPoolTx and firstBuyTx as base64 encoded VersionedTransactions, fully signed.
   * Launches the reward pool for the coin.
   */
  public async confirmLaunchCoin(params: {
    mintPublicKey: PublicKey
    configPublicKey: PublicKey
    createPoolTx: Uint8Array
    firstBuyTx?: Uint8Array
  }) {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const body = {
      mintPublicKey: params.mintPublicKey.toBase58(),
      configPublicKey: params.configPublicKey.toBase58(),
      createPoolTx: Buffer.from(params.createPoolTx).toString('base64'),
      firstBuyTx: params.firstBuyTx
        ? Buffer.from(params.firstBuyTx).toString('base64')
        : undefined
    }

    const response = await this.request({
      path: '/launchpad/confirm_launch_coin',
      method: 'POST',
      headers: headerParameters,
      body
    })

    return await new runtime.JSONApiResponse(response, (json) => {
      return json as {
        dbcPool: string
        createSignature: string
        rewardPoolSignature: string
        firstBuySignature?: string
      }
    }).value()
  }

  /**
   * Gets a quote for the first buy transaction on the launchpad.
   * Returns quotes for SOL to AUDIO, SOL to USDC, and the bonding curve quote.
   */
  public async getFirstBuyQuote(
    params: FirstBuyQuoteRequest,
    requestInitOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<FirstBuyQuoteResponse> {
    const audioInputAmount =
      'audioInputAmount' in params ? params.audioInputAmount : undefined
    const tokenOutputAmount =
      'tokenOutputAmount' in params ? params.tokenOutputAmount : undefined
    const noAudioInput = !audioInputAmount
    const noTokenInput = !tokenOutputAmount
    if (noAudioInput && noTokenInput) {
      throw new Error(
        'Invalid arguments. Either solInputAmount or tokenOutputAmount must be provided'
      )
    }

    const headerParameters: runtime.HTTPHeaders = {}
    const queryParameters: runtime.HTTPQuery = audioInputAmount
      ? {
          audioInputAmount
        }
      : {
          tokenOutputAmount: tokenOutputAmount!
        }

    const response = await this.request(
      {
        path: '/launchpad/first_buy_quote',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      requestInitOverrides
    )

    return await new runtime.JSONApiResponse(response, (json) => {
      if (!runtime.exists(json, 'audioInputAmount')) {
        throw new Error('audioInputAmount missing from response')
      }
      if (!runtime.exists(json, 'usdcValue')) {
        throw new Error('usdcValue missing from response')
      }
      if (!runtime.exists(json, 'tokenOutputAmount')) {
        throw new Error('tokenOutputAmount missing from response')
      }

      return {
        usdcValue: json.usdcValue,
        tokenOutputAmount: json.tokenOutputAmount,
        audioInputAmount: json.audioInputAmount,
        maxAudioInputAmount: json.maxAudioInputAmount,
        maxTokenOutputAmount: json.maxTokenOutputAmount
      } as FirstBuyQuoteResponse
    }).value()
  }

  /**
   * Gets launchpad config details such as max input/outut amounts & starting price.
   * These values only change if we decide to change our launchpad coin launch params.
   * We pull them from the server just to avoid having to hardcode values in the UI.
   */
  public async getLaunchpadConfig(
    requestInitOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<LaunchpadConfigResponse> {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const queryParameters: runtime.HTTPQuery = {}

    const response = await this.request(
      {
        path: '/launchpad/config',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      requestInitOverrides
    )

    return await new runtime.JSONApiResponse(response, (json) => {
      return json as LaunchpadConfigResponse
    }).value()
  }

  /**
   * Claims creator trading fees from a dynamic bonding curve pool.
   */
  public async claimFees(
    params: ClaimFeesRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<ClaimFeesResponse> {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const queryParameters: runtime.HTTPQuery = {
      tokenMint: params.tokenMint,
      ownerWalletAddress: params.ownerWalletAddress,
      receiverWalletAddress: params.receiverWalletAddress
    }

    const response = await this.request(
      {
        path: '/launchpad/claim_fees',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      initOverrides
    )

    return await new runtime.JSONApiResponse(response, (json) => {
      return json as ClaimFeesResponse
    }).value()
  }

  /**
   * Claims vested/unlocked artist coins from the vesting schedule.
   * After an artist coin graduates, the artist's reserved coins unlock daily over a 5-year period.
   */
  public async claimVestedCoins(
    params: ClaimVestedCoinsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<ClaimVestedCoinsResponse> {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const queryParameters: runtime.HTTPQuery = {
      tokenMint: params.tokenMint,
      ownerWalletAddress: params.ownerWalletAddress,
      receiverWalletAddress: params.receiverWalletAddress,
      rewardsPoolPercentage: params.rewardsPoolPercentage
    }

    const response = await this.request(
      {
        path: '/launchpad/claim_vested_coins',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      initOverrides
    )

    return await new runtime.JSONApiResponse(response, (json) => {
      return json as ClaimVestedCoinsResponse
    }).value()
  }

  /**
   * Gets a quote for swapping AUDIO to/from an artist coin using Meteora's DBC.
   * Returns the expected output amount for a given input amount.
   */
  public async getSwapCoinQuote(
    params: SwapCoinQuoteRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<SwapCoinQuoteResponse> {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const queryParameters: runtime.HTTPQuery = {
      inputAmountUi: params.inputAmountUi,
      coinMint: params.coinMint,
      swapDirection: params.swapDirection
    }

    const response = await this.request(
      {
        path: '/meteora/swap_coin_quote',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      initOverrides
    )

    return await new runtime.JSONApiResponse(response, (json) => {
      if (!runtime.exists(json, 'outputAmount')) {
        throw new Error('outputAmount missing from response')
      }
      return {
        outputAmount: json.outputAmount as string
      }
    }).value()
  }

  /**
   * Creates a swap transaction for swapping AUDIO to/from an artist coin using Meteora's DBC.
   * Returns a base64-encoded transaction ready to be signed by the user.
   */
  public async swapCoin(
    params: SwapCoinRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction
  ): Promise<SwapCoinResponse> {
    const headerParameters: runtime.HTTPHeaders = {
      'Content-Type': 'application/json'
    }
    const queryParameters: runtime.HTTPQuery = {
      inputAmountUi: params.inputAmountUi,
      coinMint: params.coinMint,
      swapDirection: params.swapDirection,
      userPublicKey: params.userPublicKey.toBase58(),
      ...(params.isExternalWallet !== undefined && {
        isExternalWallet: params.isExternalWallet.toString()
      })
    }

    const response = await this.request(
      {
        path: '/meteora/swap_coin',
        method: 'GET',
        headers: headerParameters,
        query: queryParameters
      },
      initOverrides
    )

    return await new runtime.JSONApiResponse(response, (json) => {
      if (!runtime.exists(json, 'transaction')) {
        throw new Error('transaction missing from response')
      }
      if (!runtime.exists(json, 'outputAmount')) {
        throw new Error('outputAmount missing from response')
      }
      return {
        transaction: json.transaction as string,
        outputAmount: json.outputAmount as string
      }
    }).value()
  }
}
