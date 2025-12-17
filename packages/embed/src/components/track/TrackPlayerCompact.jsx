import { full } from '@audius/sdk'

import IconTrophy from '../../assets/img/iconTrophy.svg'
import Artwork from '../artwork/Artwork'
import AudiusLogoButton from '../button/AudiusLogoButton'
import ShareButton from '../button/ShareButton'
import { DogEar } from '../dog-ear/DogEar'
import PlayButton from '../playbutton/PlayButton'
import { Preview } from '../preview/Preview'
import BedtimeScrubber from '../scrubber/BedtimeScrubber'
import Titles from '../titles/Titles'

import styles from './TrackPlayerCompact.module.css'

const { instanceOfPurchaseGate } = full

const TrackPlayerCompact = ({
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
  streamConditions,
  hasPremiumExtras,
  audioPlayer,
  isRemixContest,
  artistCoinLogo,
  balance
}) => {
  const isGated = !!streamConditions
  const isTokenGated = !!streamConditions?.tokenGate
  const isPurchaseable =
    streamConditions && instanceOfPurchaseGate(streamConditions)

  return (
    <div
      className={styles.container}
      style={{
        backgroundColor
      }}
    >
      <div className={styles.shareButton} />
      <div className={styles.artworkWrapper}>
        <Artwork
          isPlayable={!isGated || isPurchaseable}
          artworkURL={albumArtURL}
          onClickURL={trackURL}
          displayHoverPlayButton={!isGated || isPurchaseable}
          onTogglePlay={onTogglePlay}
          playingState={playingState}
          iconColor={backgroundColor}
          className={styles.artwork}
        />
      </div>
      <div className={styles.trackInfo}>
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
        <div className={styles.topSection}>
          <div className={styles.topSectionLeft}>
            {isRemixContest ? (
              <div className={styles.contestLabelWrapper}>
                <IconTrophy height={16} width={16} />
                <div className={styles.contestLabel}>Remix Contest</div>
              </div>
            ) : null}
            <div className={styles.scrubberContainer}>
              {isPurchaseable ? <Preview /> : null}
              {!isGated || isPurchaseable ? (
                <div className={styles.scrubber}>
                  <BedtimeScrubber
                    mediaKey={`title-${mediaKey}`}
                    playingState={playingState}
                    seekTo={seekTo}
                    duration={duration}
                    elapsedSeconds={position}
                    audioPlayer={audioPlayer}
                  />
                </div>
              ) : null}
            </div>
          </div>
          <div className={styles.logo}>
            <AudiusLogoButton />
          </div>
        </div>
        <div
          className={styles.bottomSection}
          style={{ marginTop: isRemixContest && isPurchaseable ? 4 : 0 }}
        >
          <PlayButton
            playingState={playingState}
            onTogglePlay={onTogglePlay}
            iconColor={backgroundColor}
            isPlayable={!isGated || isPurchaseable}
          />
          <div className={styles.titleContainer}>
            <Titles
              title={title}
              artistName={artistName}
              handle={handle}
              isVerified={isVerified}
              titleUrl={trackURL}
              artistCoinLogo={artistCoinLogo}
              balance={balance}
            />
          </div>
          <div className={styles.shareButtonHolder}>
            <ShareButton url={trackURL} creator={artistName} title={title} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default TrackPlayerCompact
