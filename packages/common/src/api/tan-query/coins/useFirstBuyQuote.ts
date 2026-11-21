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
      audioUiInputAmount: string
    }
  | {
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
      TOKEN_LISTING_MAP.AUDIO.decimals
    )
    const audioAmountUiString = audioAmountFD.toLocaleString('en-US', {
      maximumFractionDigits: 8, // 8 decimals is the max precision we allow in the token input field
      roundingMode: 'trunc'
    })

    const usdcAmountFD = new FixedDecimal(
      BigInt(firstBuyQuoteRes.usdcValue),
      TOKEN_LISTING_MAP.USDC.decimals
    )
    const usdcAmountUiString = usdcAmountFD.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      roundingMode: 'trunc'
    })

    const tokenAmountFD = new FixedDecimal(
      BigInt(firstBuyQuoteRes.tokenOutputAmount),
      LAUNCHPAD_TOKEN_DECIMALS
    )
    const tokenAmountUiString = tokenAmountFD.toLocaleString('en-US', {
      maximumFractionDigits: 0,
      roundingMode: 'trunc'
    })

    return {
      usdcAmountUiString,
      tokenAmountUiString,
      audioAmountUiString,
      ...firstBuyQuoteRes
    } as FirstBuyQuoteHookResponse
  }

type FirstBuyQuoteHookResponse = {
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
