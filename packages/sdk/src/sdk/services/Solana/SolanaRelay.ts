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
  LaunchpadConfigResponse
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
   */
  public async launchCoin(
    params: LaunchCoinRequest
  ): Promise<LaunchCoinResponse> {
    const {
      name,
      symbol,
      description,
      walletPublicKey,
      initialBuyAmountSolLamports,
      image
    } = await parseParams('launchCoin', LaunchCoinSchema)(params)

    const headerParameters: runtime.HTTPHeaders = {}

    // API uses multipart/form-data for the upload
    const formData = new FormData()
    formData.append('name', name)
    formData.append('symbol', symbol)
    formData.append('description', description)
    formData.append('walletPublicKey', walletPublicKey.toBase58())
    if (initialBuyAmountSolLamports) {
      formData.append(
        'initialBuyAmountSolLamports',
        initialBuyAmountSolLamports.toString()
      )
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

      return {
        mintPublicKey: json.mintPublicKey,
        createPoolTx: json.createPoolTx,
        firstBuyTx: json.firstBuyTx,
        solToAudioTx: json.solToAudioTx,
        metadataUri: json.metadataUri,
        imageUri: json.imageUri
      } as LaunchCoinResponse
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
}
