import { useCallback } from 'react'

import { useFormattedAudioBalance } from '@audius/common/hooks'
import { ASSET_DETAIL_PAGE } from '@audius/common/src/utils/route'
import { AUDIO_TICKER, TOKEN_LISTING_MAP } from '@audius/common/store'
import { formatTickerForUrl } from '@audius/common/utils'
import { IconTokenAUDIO } from '@audius/harmony'
import { useDispatch } from 'react-redux'
import { push } from 'redux-first-history'

import { CoinCard } from './CoinCard'

const DIMENSIONS = 64
const COIN_NAME = TOKEN_LISTING_MAP.AUDIO.name

export const AudioCoinCard = () => {
  const dispatch = useDispatch()

  const {
    audioBalanceFormatted,
    audioDollarValue,
    isAudioBalanceLoading,
    isAudioPriceLoading,
    formattedHeldValue
  } = useFormattedAudioBalance()

  const isLoading = isAudioBalanceLoading || isAudioPriceLoading

  const handleCoinClick = useCallback(() => {
    dispatch(
      push(
        ASSET_DETAIL_PAGE.replace(':ticker', formatTickerForUrl(AUDIO_TICKER))
      )
    )
  }, [dispatch])

  return (
    <CoinCard
      icon={<IconTokenAUDIO width={DIMENSIONS} height={DIMENSIONS} hex />}
      symbol={AUDIO_TICKER}
      balance={audioBalanceFormatted ?? ''}
      heldValue={formattedHeldValue}
      dollarValue={audioDollarValue ?? ''}
      loading={isLoading}
      name={COIN_NAME}
      onClick={handleCoinClick}
    />
  )
}
