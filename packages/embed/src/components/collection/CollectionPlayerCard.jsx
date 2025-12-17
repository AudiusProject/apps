import { useState, useEffect } from 'react'

import { full } from '@audius/sdk'
import cn from 'classnames'
import SimpleBar from 'simplebar-react'

import 'simplebar/dist/simplebar.min.css'
import IconVerified from '../../assets/img/iconVerified.svg'
import { getArtworkUrl } from '../../util/getArtworkUrl'
import { getAudiusHostname } from '../../util/getEnv'
import { stripLeadingSlash } from '../../util/stringUtil'
import Artwork from '../artwork/Artwork'
import AudiusLogoButton from '../button/AudiusLogoButton'
import ShareButton from '../button/ShareButton'
import Card from '../card/Card'
import { DogEar } from '../dog-ear/DogEar'
import PlayButton, { PlayingState } from '../playbutton/PlayButton'
import { Preview } from '../preview/Preview'
import BedtimeScrubber from '../scrubber/BedtimeScrubber'
import Titles from '../titles/Titles'

import styles from './CollectionPlayerCard.module.css'

const { instanceOfPurchaseGate } = full

const CollectionListRow = ({
  playingState,
  trackTitle,
  artistName,
  trackURL,
  artistHandle,
  trackIndex,
  onTogglePlay,
  iconColor,
  isActive,
  textIsClickable,
  isVerified
}) => {
  const makeOnClickURL = (url) => () => {
    textIsClickable && window.open(url, '_blank')
  }

  const isPlaying = isActive && playingState !== PlayingState.Stopped

  return (
    <div
      className={cn(styles.trackListRow, { [styles.rowShaded]: isPlaying })}
      onClick={(e) => {
        e.stopPropagation()
        onTogglePlay()
      }}
    >
      <div
        className={cn(styles.leftElement, { [styles.trackIndex]: !isActive })}
      >
        {isActive ? (
          <PlayButton
            onTogglePlay={onTogglePlay}
            playingState={playingState}
            iconColor={iconColor}
            className={styles.playButton}
            iconSize='2xs'
          />
        ) : (
          trackIndex
        )}
      </div>
      <div
        className={cn(styles.rightElement, {
          [styles.clickableText]: textIsClickable
        })}
      >
        <div className={styles.rowTitle} onClick={makeOnClickURL(trackURL)}>
          {trackTitle}
        </div>
        <div
          className={styles.rowSubtitle}
          onClick={makeOnClickURL(artistHandle)}
        >
          {artistName}
          {isVerified && <IconVerified />}
        </div>
      </div>
    </div>
  )
}

const CollectionPlayerCard = ({
  collection,
  seekTo,
  duration,
  elapsedSeconds,
  mediaKey,
  playingState,
  backgroundColor,
  rowBackgroundColor,
  activeTrackIndex,
  onTogglePlay,
  isTwitter,
  streamConditions,
  audioPlayer
}) => {
  const hostname = getAudiusHostname()
  const makeOnTogglePlay = (index) => () => onTogglePlay(index)
  const permalink = `https://${hostname}${collection.permalink}`
  const isGated = !!streamConditions
  const isPurchaseable =
    streamConditions && instanceOfPurchaseGate(streamConditions)

  const [artworkURL, setArtworkURL] = useState(null)
  useEffect(() => {
    if (collection) {
      getArtworkUrl(collection).then((url) => setArtworkURL(url))
    }
  }, [collection])

  return (
    <Card
      isTwitter={isTwitter}
      backgroundColor={backgroundColor}
      twitterURL={permalink}
    >
      {isGated ? (
        <DogEar size='s' variant={isPurchaseable ? 'purchase' : 'special'} />
      ) : null}
      <div className={styles.padding}>
        <div className={styles.topRow}>
          <div className={styles.logo}>
            <AudiusLogoButton />
          </div>
          <div className={styles.share}>
            <ShareButton
              url={permalink}
              creator={collection.user.name}
              title={collection.playlistName}
            />
          </div>
        </div>
        <div className={styles.middleRow}>
          <Artwork
            className={styles.artwork}
            artworkURL={artworkURL}
            onClickURL={permalink}
            displayHoverPlayButton
            onTogglePlay={makeOnTogglePlay(activeTrackIndex)}
            playingState={playingState}
            iconColor={rowBackgroundColor}
          />
          <div className={styles.middleRowRight}>
            <Titles
              artistName={collection.user.name}
              handle={collection.user.handle}
              isVerified={collection.user.isVerified}
              title={collection.playlistName}
              titleUrl={permalink}
              artistCoinLogo={collection.user.artist_coin_badge?.logo_uri}
              balance={collection.user.totalBalance}
            />
            <div className={styles.scrubber}>
              <BedtimeScrubber
                duration={duration}
                elapsedSeconds={elapsedSeconds}
                mediaKey={mediaKey}
                playingState={playingState}
                seekTo={seekTo}
                audioPlayer={audioPlayer}
              />
              {isPurchaseable ? <Preview /> : null}
            </div>
          </div>
        </div>
        <div className={styles.listContainer}>
          <SimpleBar
            style={{
              maxHeight: '100%'
            }}
          >
            {collection.tracks.map((track, i) => {
              return (
                <CollectionListRow
                  key={i}
                  artistHandle={track.user.handle}
                  artistName={track.user.name}
                  isActive={i === activeTrackIndex}
                  playingState={playingState}
                  trackIndex={i + 1}
                  trackURL={stripLeadingSlash(track.permalink)}
                  trackTitle={track.title}
                  iconColor={rowBackgroundColor}
                  onTogglePlay={makeOnTogglePlay(i)}
                  textIsClickable={false}
                  isVerified={track.user.isVerified}
                />
              )
            })}
          </SimpleBar>
        </div>
      </div>
    </Card>
  )
}

export default CollectionPlayerCard
