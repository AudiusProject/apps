import { useState, useContext, useEffect } from 'react'

import { full } from '@audius/sdk'

import IconTrophy from '../../assets/img/iconTrophy.svg'
import { isMobileWebTwitter } from '../../util/isMobileWebTwitter'
import Artwork from '../artwork/Artwork'
import ShareButton from '../button/ShareButton'
import Card, { CardDimensionsContext } from '../card/Card'
import { DogEar } from '../dog-ear/DogEar'
import PlayButton from '../playbutton/PlayButton'
import { Preview } from '../preview/Preview'
import BedtimeScrubber from '../scrubber/BedtimeScrubber'
import Titles from '../titles/Titles'

import styles from './TrackPlayerCard.module.css'

const { instanceOfPurchaseGate } = full

const TrackPlayerCard = ({
  title,
  mediaKey,
  handle,
  artistName,
  trackURL,
  playingState,
  onTogglePlay,
  albumArtURL,
  isVerified,
  position,
  duration,
  seekTo,
  backgroundColor,
  isTwitter,
  streamConditions,
  hasPremiumExtras,
  audioPlayer,
  isRemixContest,
  artistCoinLogo,
  balance
}) => {
  const mobileWebTwitter = isMobileWebTwitter(isTwitter)
  const getBottomWrapperStyle = () =>
    mobileWebTwitter ? { flex: '0 0 84px' } : {}
  const [artworkWrapperStyle, setArtworkWrapperStyle] = useState({
    // Need to start the wrapper with 0
    // opacity bc it doesn't have valid
    // size information until the
    // cardDimensionsContext gives us
    // non-zero values post-mount.
    opacity: 0
  })
  const { height, width } = useContext(CardDimensionsContext)

  useEffect(() => {
    if (width === 0) return
    // 124px: 84px bottom component, 18 px bottom margin, 24px top margin
    const desiredHeight = height - 124
    // 48 width to account for horizontal margins
    const maxWidth = width - 48
    const side = Math.min(desiredHeight, maxWidth)
    const newStyle = {
      width: `${side}px`,
      height: `${side}px`,
      marginLeft: 'auto',
      marginRight: 'auto',
      opacity: 1
    }
    setArtworkWrapperStyle(newStyle)
  }, [height, width])
  const isGated = !!streamConditions
  const isTokenGated = !!streamConditions?.tokenGate
  const isPurchaseable =
    streamConditions && instanceOfPurchaseGate(streamConditions)

  return (
    <Card
      isTwitter={isTwitter}
      backgroundColor={backgroundColor}
      twitterURL={trackURL}
    >
      {isGated || hasPremiumExtras ? (
        <DogEar
          size='s'
          variant={
            isPurchaseable
              ? 'purchase'
              : isTokenGated
                ? 'coin'
                : isGated
                  ? 'special'
                  : 'extras'
          }
        />
      ) : null}
      <div className={styles.paddingContainer}>
        <div className={styles.artworkWrapper} style={artworkWrapperStyle}>
          <Artwork
            onClickURL={trackURL}
            artworkURL={albumArtURL}
            className={styles.artworkStyle}
            containerClassName={styles.artworkContainer}
            displayHoverPlayButton={!isGated || isPurchaseable}
            onTogglePlay={onTogglePlay}
            playingState={playingState}
            iconColor={backgroundColor}
            isLargeFlavor
            showLogo
          />
        </div>
        <div className={styles.bottomWrapper} style={getBottomWrapperStyle()}>
          {isRemixContest ? (
            <div className={styles.contestLabelWrapper}>
              <IconTrophy height={20} width={20} />
              <div className={styles.contestLabel}>Remix Contest</div>
            </div>
          ) : null}
          <div className={styles.scrubber}>
            {!isGated || isPurchaseable ? (
              <BedtimeScrubber
                duration={duration}
                elapsedSeconds={position}
                mediaKey={`${mediaKey}`}
                playingState={playingState}
                seekTo={seekTo}
                audioPlayer={audioPlayer}
              />
            ) : null}
            {isPurchaseable ? <Preview /> : null}
          </div>
          <div className={styles.bottomSection}>
            <PlayButton
              onTogglePlay={onTogglePlay}
              playingState={playingState}
              iconColor={backgroundColor}
              className={styles.playButton}
              isPlayable={!isGated || isPurchaseable}
              url={trackURL}
            />
            <div className={styles.titlesWrapper}>
              <Titles
                artistName={artistName}
                handle={handle}
                isVerified={isVerified}
                title={title}
                titleUrl={trackURL}
                artistCoinLogo={artistCoinLogo}
                balance={balance}
              />
            </div>
            <div className={styles.shareWrapper}>
              <ShareButton url={trackURL} creator={artistName} title={title} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default TrackPlayerCard
