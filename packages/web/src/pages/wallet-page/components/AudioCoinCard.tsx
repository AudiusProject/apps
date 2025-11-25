import { useCallback } from 'react'

import { useFormattedAudioBalance } from '@audius/common/hooks'
import { AUDIO_TICKER, TOKEN_LISTING_MAP } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { IconTokenAUDIO } from '@audius/harmony'
import { useNavigate } from 'react-router-dom'

import { CoinRow } from './CoinCard'

const DIMENSIONS = 64
const COIN_NAME = TOKEN_LISTING_MAP.AUDIO.name

export const AudioCoinCard = () => {
  const navigate = useNavigate()

  const {
    audioBalanceFormatted,
    audioDollarValue,
    isAudioBalanceLoading,
    isAudioPriceLoading,
    formattedHeldValue
  } = useFormattedAudioBalance()

  const isLoading = isAudioBalanceLoading || isAudioPriceLoading

  const handleCoinClick = useCallback(() => {
    navigate(route.coinPage(AUDIO_TICKER))
  }, [navigate])

  return (
    <CoinRow
      icon={<IconTokenAUDIO width={DIMENSIONS} height={DIMENSIONS} hex />}
      symbol={AUDIO_TICKER}
      balance={audioBalanceFormatted ?? ''}
      heldValue={formattedHeldValue}
      dollarValue={audioDollarValue ?? ''}
      loading={isLoading}
      name={COIN_NAME}
      noDollarSignPrefix
      onClick={handleCoinClick}
    />
  )
}
