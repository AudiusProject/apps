import { useCallback } from 'react'

import { launchpadMessages } from '@audius/common/messages'
import {
  TrackMetadataForUpload,
  useCoinSuccessModal
} from '@audius/common/store'
import { route } from '@audius/common/utils'
import {
  Artwork,
  Button,
  Flex,
  IconShare,
  IconX,
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  Paper,
  Text
} from '@audius/harmony'

import { AddressTile } from 'components/address-tile'
import ConnectedMusicConfetti from 'components/music-confetti/ConnectedMusicConfetti'
import { useNavigateToPage } from 'hooks/useNavigateToPage'
import { openXLink } from 'utils/xShare'

export const CoinSuccessModal = () => {
  const { isOpen, data: coinData, onClose, onClosed } = useCoinSuccessModal()
  const navigate = useNavigateToPage()

  const handleUploadCoinGatedTrack = useCallback(() => {
    const state:
      | { initialMetadata: Partial<TrackMetadataForUpload> }
      | undefined = coinData?.mint
      ? {
          initialMetadata: {
            download_conditions: {
              token_gate: {
                token_amount: 1,
                token_mint: coinData.mint
              }
            },
            stream_conditions: {
              token_gate: {
                token_amount: 1,
                token_mint: coinData.mint
              }
            }
          }
        }
      : undefined

    navigate(route.UPLOAD_PAGE, state)
    onClose()
  }, [coinData, navigate, onClose])

  const handleShareToX = useCallback(() => {
    if (!coinData?.ticker || !coinData?.mint) return

    const coinUrl = `https://audius.co${route.coinPage(coinData.ticker)}`
    const shareText = `My artist coin $${coinData.ticker} is live on @Audius. Be the first to buy and unlock my exclusive fan club!\n\n${coinData.mint}\n`
    openXLink(coinUrl, shareText)
  }, [coinData])

  if (!coinData) return null

  const { mint, name, ticker, logoUri, amountUi, amountUsd } = coinData

  const hasFirstBuyAmount = amountUi !== '0' || amountUsd !== '0'

  return (
    <>
      <ConnectedMusicConfetti />
      <Modal isOpen={isOpen} size='small' onClose={onClose} onClosed={onClosed}>
        <ModalHeader showDismissButton>
          <ModalTitle title={launchpadMessages.modal.congratsTitle} />
        </ModalHeader>
        <ModalContent>
          <Flex column gap='2xl' w='100%'>
            {/* Congratulatory Message */}
            <Text variant='body' size='l' color='default'>
              {launchpadMessages.modal.congratsDescription}
            </Text>

            {/* Purchase Summary */}

            <Flex column gap='m' w='100%'>
              <Text variant='label' size='l' color='subdued'>
                {hasFirstBuyAmount
                  ? launchpadMessages.modal.purchaseSummaryTitle
                  : launchpadMessages.modal.yourCoinTitle}
              </Text>
              <Paper
                p='m'
                gap='m'
                w='100%'
                borderRadius='m'
                border='default'
                shadow='flat'
                backgroundColor='surface1'
              >
                <Flex alignItems='center' gap='m' w='100%'>
                  <Artwork
                    src={logoUri}
                    w='48px'
                    h='48px'
                    hex
                    borderWidth={0}
                  />

                  <Flex column gap='xs' flex={1}>
                    <Text variant='title' size='m' color='default'>
                      {name}
                    </Text>
                    {hasFirstBuyAmount ? (
                      <Flex
                        alignItems='center'
                        justifyContent='space-between'
                        w='100%'
                      >
                        <Text variant='title' size='s' strength='weak'>
                          {amountUi} <Text color='subdued'>${ticker}</Text>
                        </Text>
                        <Text variant='title' size='s' strength='weak'>
                          ${amountUsd}
                        </Text>
                      </Flex>
                    ) : (
                      <Text
                        color='subdued'
                        variant='title'
                        size='s'
                        strength='weak'
                      >
                        ${ticker}
                      </Text>
                    )}
                  </Flex>
                </Flex>
              </Paper>
            </Flex>

            {/* Contract Address Section */}
            <Flex column gap='m' w='100%'>
              <Text variant='label' size='l' color='subdued'>
                {launchpadMessages.modal.addressTitle}
              </Text>
              <AddressTile address={mint} shorten shortenLength={16} />
            </Flex>

            {/* Action Buttons */}
            <Flex column gap='s' w='100%'>
              <Button
                variant='primary'
                fullWidth
                onClick={handleUploadCoinGatedTrack}
                iconLeft={IconShare}
              >
                {launchpadMessages.modal.uploadCoinGatedTrack}
              </Button>

              <Button
                variant='secondary'
                fullWidth
                onClick={handleShareToX}
                iconLeft={IconX}
              >
                {launchpadMessages.modal.shareToX}
              </Button>
            </Flex>
          </Flex>
        </ModalContent>
      </Modal>
    </>
  )
}
