import { useCallback, useEffect, useState } from 'react'

import { Chain, CollectibleMediaType, Collectible } from '@audius/common/models'
import {
  profilePageSelectors,
  collectibleDetailsUIActions
} from '@audius/common/store'
import { getHash } from '@audius/common/utils'
import {
  IconPlaybackPlay as IconPlay,
  IconLogoCircleSOL,
  IconLogoCircleETH,
  useTheme
} from '@audius/harmony'
import { CSSObject } from '@emotion/styled'
import cn from 'classnames'
import { useDispatch, useSelector } from 'react-redux'

import { useModalState } from 'common/hooks/useModalState'
import PerspectiveCard from 'components/perspective-card/PerspectiveCard'
import PreloadImage from 'components/preload-image/PreloadImage'
import Skeleton from 'components/skeleton/Skeleton'
import { preload } from 'utils/image'

import {
  getFrameFromAnimatedWebp,
  getFrameFromGif
} from '../ethCollectibleHelpers'

import styles from './CollectiblesPage.module.css'
const { setCollectible } = collectibleDetailsUIActions
const { getProfileUserHandle } = profilePageSelectors

type CollectibleDetailsProps = {
  collectible: Collectible
  onClick: (hash: string) => void
  canLoad?: boolean
  index?: number
  onLoad?: (i: number) => void
  onLoaded?: (i: number) => void
}

const CollectibleDetails = (props: CollectibleDetailsProps) => {
  const { collectible, onClick, canLoad, onLoad, onLoaded, index } = props
  const dispatch = useDispatch()
  const { mediaType, frameUrl, videoUrl, gifUrl, name } = collectible

  const [isLoading, setIsLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [frame, setFrame] = useState(frameUrl)
  const [showSpinner, setShowSpinner] = useState(false)
  const [, setIsModalOpen] = useModalState('CollectibleDetails')

  // Debounce showing the spinner for a second
  useEffect(() => {
    setTimeout(() => {
      setShowSpinner(true)
    }, 1000)
  }, [])

  // After some time, tell the container we have timed out
  useEffect(() => {
    if (canLoad) {
      setTimeout(() => {
        if (index !== undefined && onLoad) {
          onLoad(index)
        }
      }, 2000)
    }
  }, [canLoad, onLoad, index])

  useEffect(() => {
    const load = async () => {
      let f = frameUrl
      if (!f && mediaType === CollectibleMediaType.GIF) {
        f = await getFrameFromGif(gifUrl!)
      } else if (!f && mediaType === CollectibleMediaType.ANIMATED_WEBP) {
        f = await getFrameFromAnimatedWebp(gifUrl!)
      } else if (!f && mediaType === CollectibleMediaType.VIDEO) {
        setHasLoaded(true)
        setIsLoading(false)
        if (index !== undefined && onLoaded) {
          onLoaded(index)
        }
      }
      // we know that images and 3D objects have frame urls so no need to check those

      if (f) {
        await preload(f)
        setFrame(f)
        setHasLoaded(true)
        setIsLoading(false)
        if (index !== undefined && onLoaded) {
          onLoaded(index)
        }
      }
    }
    if (!hasLoaded && canLoad) {
      if (index !== undefined && onLoad) {
        onLoad(index)
      }
      setIsLoading(true)
      load()
    }
  }, [
    index,
    isLoading,
    mediaType,
    frameUrl,
    gifUrl,
    name,
    setFrame,
    setIsLoading,
    hasLoaded,
    setHasLoaded,
    onLoad,
    onLoaded,
    canLoad
  ])

  const handle = useSelector(getProfileUserHandle)
  const handleItemClick = useCallback(() => {
    // Ignore needed bc typescript doesn't think that match.params has handle property
    // @ts-ignore
    const url = `/${handle}/collectibles/${getHash(collectible.id)}`
    // Push window state as to not trigger router change & component remount
    window.history.pushState('', '', url)
    dispatch(setCollectible({ collectible }))
    setIsModalOpen(true)
    onClick(getHash(collectible.id))
  }, [collectible, handle, dispatch, setIsModalOpen, onClick])

  const { spacing } = useTheme()

  const chainCss: CSSObject = {
    position: 'absolute',
    bottom: spacing.unit3,
    left: spacing.unit3
  }

  const collectibleChainElement =
    collectible.chain === Chain.Eth ? (
      <IconLogoCircleETH css={chainCss} shadow='drop' />
    ) : (
      <IconLogoCircleSOL css={chainCss} shadow='drop' />
    )

  return (
    <div className={styles.detailsContainer}>
      <PerspectiveCard
        className={styles.perspectiveCard}
        onClick={handleItemClick}
      >
        <>
          {isLoading ? (
            <div className={styles.media}>{showSpinner && <Skeleton />}</div>
          ) : (
            <>
              {(mediaType === CollectibleMediaType.GIF ||
                mediaType === CollectibleMediaType.ANIMATED_WEBP ||
                (mediaType === CollectibleMediaType.VIDEO && frame)) && (
                <div className={styles.imageWrapper}>
                  <PreloadImage
                    asBackground
                    src={frame!}
                    preloaded={true}
                    className={styles.media}
                  />
                  <IconPlay className={styles.playIcon} />
                  {collectibleChainElement}
                </div>
              )}
              {mediaType === CollectibleMediaType.VIDEO &&
                !frame &&
                videoUrl && (
                  <div className={cn(styles.media, styles.imageWrapper)}>
                    <IconPlay className={styles.playIcon} />
                    <video
                      style={{ height: '100%', width: '100%' }}
                      src={`${videoUrl}#t=0.1`}
                    />
                    {collectibleChainElement}
                  </div>
                )}
              {(mediaType === CollectibleMediaType.IMAGE ||
                mediaType === CollectibleMediaType.THREE_D) && (
                <div className={styles.imageWrapper}>
                  <PreloadImage
                    asBackground
                    src={frame!}
                    preloaded={true}
                    className={styles.media}
                  />
                  {collectibleChainElement}
                </div>
              )}
            </>
          )}
        </>
        <div className={styles.nftTitle}>{collectible.name}</div>
      </PerspectiveCard>
    </div>
  )
}

export default CollectibleDetails
