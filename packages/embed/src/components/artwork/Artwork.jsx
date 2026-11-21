import { useState, useEffect, useRef } from 'react'

import cn from 'classnames'

import audiusLogo from '../../assets/img/logoEmbedPlayer.png'
import { logError } from '../../util/logError'
import { getCopyableLink } from '../../util/shareUtil'
import PlayButton, { PlayingState } from '../playbutton/PlayButton'

import styles from './Artwork.module.css'

export const DEFAULT_IMAGE =
  'https://download.audius.co/static-resources/preview-image.jpg'

const preloadImage = (url, callback, onError) => {
  const img = new Image()
  img.onload = callback
  img.onerror = (e) => {
    logError(e)
    onError()
  }
  img.src = url
}

const usePreloadImage = (url) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasErrored, setHasErrored] = useState(false)
  useEffect(() => {
    if (url && !imageLoaded) {
      preloadImage(
        url,
        () => setImageLoaded(true),
        () => setHasErrored(true)
      )
    }
  }, [url, imageLoaded, setImageLoaded, setHasErrored])

  return [imageLoaded, hasErrored]
}

const getWrapperTint = (rgbString) =>
  `${rgbString.slice(0, rgbString.length - 1)}, 0.5)`

const Artwork = ({
  onClickURL,
  artworkURL = 'https://download.audius.co/static-resources/preview-image.jpg',
  className,
  containerClassName,
  displayHoverPlayButton = false,
  onTogglePlay = () => {},
  playingState = PlayingState.Playing,
  iconColor = '#ffffff',
  isLargeFlavor = false,
  showLogo = false
}) => {
  const onClick = () => {
    window.open(getCopyableLink(onClickURL), '_blank')
  }

  const [isHovering, setIsHovering] = useState(false)

  const onClickWrapper = () => {
    onTogglePlay()
  }

  const onLogoClick = () => {
    window.open(getCopyableLink(), '_blank')
  }

  const [hasImageLoaded, hasImageErrored] = usePreloadImage(artworkURL)
  if (hasImageErrored) artworkURL = DEFAULT_IMAGE

  const [sideLength, setSideLength] = useState(0)
  const playButtonParentRef = useRef(null)
  useEffect(() => {
    setTimeout(() => {
      if (!playButtonParentRef.current) return
      const side = Math.ceil(playButtonParentRef.current.clientHeight * 0.2)
      setSideLength(side)
    }, 100)
  }, [playButtonParentRef, setSideLength])

  const getPlayButtonStyle = () => {
    const boxShadow = '0px 2px 8px -2px rgba(0, 0, 0, 0.5)'
    return isLargeFlavor
      ? {
          boxShadow,
          height: `${sideLength}px`,
          width: `${sideLength}px`,
          borderRadius: '50%'
        }
      : { boxShadow }
  }
  const getPlayButtonIconStyle = () => {
    return isLargeFlavor
      ? {
          height: `${sideLength / 1.5}px`,
          width: `${sideLength / 1.5}px`
        }
      : {}
  }
  return (
    <div
      className={cn(
        styles.container,
        {
          [styles.hasLoaded]: hasImageLoaded || hasImageErrored
        },
        containerClassName
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {showLogo && (
        <div
          className={styles.logoWrapper}
          onClick={onLogoClick}
          style={{
            background: `url(${audiusLogo})`,
            opacity: isHovering ? 1 : 0.6
          }}
        />
      )}
      {displayHoverPlayButton && (
        <div
          className={styles.playButtonWrapper}
          onClick={onClickWrapper}
          ref={playButtonParentRef}
          style={{
            backgroundColor: `${getWrapperTint(iconColor)}`
          }}
        >
          <PlayButton
            style={getPlayButtonStyle()}
            iconStyle={getPlayButtonIconStyle()}
            onTogglePlay={onTogglePlay}
            playingState={playingState}
            iconColor={getWrapperTint(iconColor)}
          />
        </div>
      )}
      <div
        onClick={onClick}
        className={cn(styles.albumArt, className)}
        style={{
          backgroundImage:
            hasImageLoaded || hasImageErrored ? `url(${artworkURL})` : ''
        }}
      />
    </div>
  )
}

export default Artwork
