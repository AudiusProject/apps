import { FixedDecimal } from '@audius/fixed-decimal'
import {
  FirstBuyQuoteRequest,
  FirstBuyQuoteResponse as FirstBuyQuoteApiResponse
} from '@audius/sdk'
import { useMutation, UseMutationOptions } from '@tanstack/react-query'

import { TOKEN_LISTING_MAP } from '~/store'

import { useQueryContext } from '../utils'

const LAUNCHPAD_TOKEN_DECIMALS = 9

export type UseFirstBuyQuoteParams =
  | {
      /** The amount of AUDIO in  to get a quote for */
      audioUiInputAmount: string
    }
  | {
      /** The amount of the launchpad token to get a quote for */
      tokenUiOutputAmount: string
    }

type FetchFirstBuyQuoteContext = Pick<
  ReturnType<typeof useQueryContext>,
  'audiusSdk'
>

const getFirstBuyQuoteMutationFn =
  (context: FetchFirstBuyQuoteContext) =>
  async (params: UseFirstBuyQuoteParams) => {
    const { audiusSdk } = context

    const sdk = await audiusSdk()
    const audioInputAmount =
      'audioUiInputAmount' in params
        ? new FixedDecimal(
            params.audioUiInputAmount,
            TOKEN_LISTING_MAP.AUDIO.decimals
          ).trunc(TOKEN_LISTING_MAP.AUDIO.decimals)
        : undefined
    const tokenOutputAmount =
      'tokenUiOutputAmount' in params
        ? new FixedDecimal(
            params.tokenUiOutputAmount,
            LAUNCHPAD_TOKEN_DECIMALS
          ).trunc(LAUNCHPAD_TOKEN_DECIMALS)
        : undefined

    const firstBuyQuoteParams: FirstBuyQuoteRequest = audioInputAmount
      ? {
          audioInputAmount: audioInputAmount.value.toString()
        }
      : {
          tokenOutputAmount: tokenOutputAmount!.value.toString()
        }

    const firstBuyQuoteRes =
      await sdk.services.solanaRelay.getFirstBuyQuote(firstBuyQuoteParams)

    const audioAmountFD = new FixedDecimal(
      BigInt(firstBuyQuoteRes.audioInputAmount),
      TOKEN_LISTING_MAP.AUDIO.decimals // 8 decimals for AUDIO
    )
    const audioAmountUiString = audioAmountFD.toLocaleString('en-US', {
      maximumFractionDigits: 8, // 8 decimals is the max precision we allow in the token input field
      roundingMode: 'trunc'
    })

    const usdcAmountFD = new FixedDecimal(
      BigInt(firstBuyQuoteRes.usdcValue),
      TOKEN_LISTING_MAP.USDC.decimals // 6 decimals for USDC
    )
    const usdcAmountUiString = usdcAmountFD.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      roundingMode: 'trunc'
    })

    const tokenAmountFD = new FixedDecimal(
      BigInt(firstBuyQuoteRes.tokenOutputAmount),
      LAUNCHPAD_TOKEN_DECIMALS // 9 decimals for the launchpad token
    )
    const tokenAmountUiString = tokenAmountFD.toLocaleString('en-US', {
      maximumFractionDigits: 0,
      roundingMode: 'trunc'
    })

    return {
      // ui formatted values
      usdcAmountUiString,
      tokenAmountUiString,
      audioAmountUiString,
      // raw API repsonse values
      ...firstBuyQuoteRes
    } as FirstBuyQuoteHookResponse
  }

type FirstBuyQuoteHookResponse = {
  // Same response as API but adds UI friendly values
  usdcAmountUiString: string
  tokenAmountUiString: string
  audioAmountUiString: string
} & FirstBuyQuoteApiResponse

export const useFirstBuyQuote = (
  options?: UseMutationOptions<
    FirstBuyQuoteHookResponse,
    Error,
    UseFirstBuyQuoteParams
  >
) => {
  const context = useQueryContext()

  return useMutation({
    mutationFn: getFirstBuyQuoteMutationFn(context),
    ...options
  })
}
