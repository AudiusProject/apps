import { useCallback } from 'react'

import { useArtistCreatedCoin, useCurrentUserId } from '@audius/common/api'
import { useAccessAndRemixSettings, useHasNoTokens } from '@audius/common/hooks'
import { priceAndAudienceMessages as messages } from '@audius/common/messages'
import { StreamTrackAvailabilityType } from '@audius/common/models'
import { useField } from 'formik'
import { IconArtistCoin } from '~harmony/icons'

import { TokenIcon } from 'components/buy-sell-modal/TokenIcon'
import { ModalRadioItem } from 'components/modal-radio/ModalRadioItem'

import { AccessAndSaleFormValues, STREAM_CONDITIONS } from '../../types'

import { TokenGatedDescription } from './TokenGatedDescription'

type TokenGatedRadioFieldProps = {
  isRemix: boolean
  isUpload?: boolean
  isAlbum?: boolean
  isInitiallyUnlisted?: boolean
}

export const TokenGatedRadioField = (props: TokenGatedRadioFieldProps) => {
  const { isRemix, isUpload, isInitiallyUnlisted, isAlbum } = props
  const { data: userId } = useCurrentUserId()
  const { data: coin } = useArtistCreatedCoin(userId)

  const [, , { setValue: setStreamConditionsValue }] =
    useField<AccessAndSaleFormValues[typeof STREAM_CONDITIONS]>(
      STREAM_CONDITIONS
    )

  const handleSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (coin && e.target.checked) {
        setStreamConditionsValue({
          token_gate: {
            token_mint: coin.mint,
            token_amount: 1
          }
        })
      }
    },
    [coin, setStreamConditionsValue]
  )

  const hasNoTokens = useHasNoTokens()
  const { disableTokenGate: disabled } = useAccessAndRemixSettings({
    isUpload: !!isUpload,
    isRemix,
    isInitiallyUnlisted: !!isInitiallyUnlisted
  })

  return (
    <ModalRadioItem
      icon={
        coin?.logoUri ? (
          <TokenIcon logoURI={coin.logoUri} hex h={24} w={24} />
        ) : (
          <IconArtistCoin />
        )
      }
      label={messages.tokenGatedRadio.title}
      value={StreamTrackAvailabilityType.TOKEN_GATED}
      disabled={disabled}
      onChange={handleSelect}
      description={
        <TokenGatedDescription
          tokenName={coin?.ticker ?? coin?.mint ?? ''}
          hasTokens={!hasNoTokens}
          isUpload={true}
        />
      }
      tooltipText={
        hasNoTokens
          ? messages.tokenGatedRadio.noCoins
          : disabled
            ? messages.fromFreeHint(isAlbum ? 'album' : 'track', 'premium')
            : undefined
      }
    />
  )
}
