import { useState } from 'react'

import {
  transformAndCleanList,
  userCollectionMetadataFromSDK
} from '@audius/common/adapters'
import { route } from '@audius/common/utils'
import { Id } from '@audius/sdk'
import { useNavigate } from 'react-router-dom'
// eslint-disable-next-line no-restricted-imports -- TODO: migrate to @react-spring/web
import { useSpring, animated } from 'react-spring'
import { useAsync } from 'react-use'

import IconLines from 'assets/img/publicSite/Lines.svg'
import IconListenOnAudius from 'assets/img/publicSite/listen-on-audius.svg'
import LoadingSpinner from 'components/loading-spinner/LoadingSpinner'
import useCardWeight from 'hooks/useCardWeight'
import useHasViewed from 'hooks/useHasViewed'
import { handleClickRoute } from 'public-site/components/handleClickRoute'
import { audiusSdk } from 'services/audius-sdk'
import { env } from 'services/env'

import styles from './FeaturedContent.module.css'

const { collectionPage } = route

const messages = {
  title: 'Featured Content',
  subTitle: 'Check out the playlists we are listening to right now'
}

type PlaylistTileProps = {
  title: string
  artist: string
  imageUrl: string | null
  onClick: () => void
}

const DesktopPlaylistTile = (props: PlaylistTileProps) => {
  const [cardRef, onMove, onLeave, transform] = useCardWeight({
    sensitivity: 1.8
  })
  const [mouseDown, setMouseDown] = useState(false)
  return (
    <div
      className={styles.trackMoveContainer}
      ref={cardRef}
      // @ts-ignore
      onClick={props.onClick}
      onMouseMove={onMove}
      onMouseLeave={() => {
        onLeave()
        setMouseDown(false)
      }}
      onMouseUp={() => setMouseDown(false)}
      onMouseDown={() => setMouseDown(true)}
    >
      <animated.div
        className={styles.trackContainer}
        // @ts-ignore
        style={{ transform: mouseDown ? '' : transform }}
      >
        <div
          className={styles.track}
          style={{
            backgroundImage: `url(${props.imageUrl})`,
            boxShadow: `0 6px 28px 0 rgba(56, 14, 13, 0.4)`
          }}
        >
          <div className={styles.trackContent}>
            <div className={styles.trackArtist}>{`By ${props.artist}`}</div>
            <IconListenOnAudius className={styles.listenOnAudius} />
          </div>
        </div>
      </animated.div>
      <div className={styles.trackTitleContainer}>
        <span className={styles.trackTitle}>{props.title}</span>
      </div>
    </div>
  )
}

const MobilePlaylistTile = (props: PlaylistTileProps) => (
  <div
    key={props.title}
    className={styles.trackContainer}
    onClick={props.onClick}
  >
    <div
      className={styles.trackImage}
      style={{
        backgroundImage: `url(${props.imageUrl})`,
        boxShadow: `0px 8px 16px 0px rgba(0, 0, 0, 0.08), 0px 0px 4px 0px rgba(0, 0, 0, 0.04)`
      }}
    ></div>
    <div className={styles.trackTitle}>{props.title}</div>
  </div>
)

type FeaturedContentProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

const FeaturedContent = (props: FeaturedContentProps) => {
  const navigate = useNavigate()
  const { value: featuredPlaylists, loading } = useAsync(async () => {
    const response = await fetch(env.EXPLORE_CONTENT_URL)
    const json = await response.json()
    const featuredPlaylistIds = json.featuredPlaylists
      .slice(0, 4)
      .map((id: string) => Id.parse(parseInt(id)))
    const sdk = await audiusSdk()
    const { data } = await sdk.full.playlists.getBulkPlaylists({
      id: featuredPlaylistIds
    })
    return transformAndCleanList(data, userCollectionMetadataFromSDK)
  }, [])

  // Animate in the title and subtitle text
  const [hasViewed, refInView] = useHasViewed(0.8)

  const textStyles = useSpring({
    config: { mass: 3, tension: 2000, friction: 500 },
    opacity: hasViewed ? 1 : 0,
    x: hasViewed ? 0 : 150
  })

  if (props.isMobile) {
    return (
      <div className={styles.mobileContainer} ref={refInView}>
        <div className={styles.content}>
          <animated.div
            style={{
              opacity: textStyles.opacity,
              transform: textStyles.x.interpolate(
                (x) => `translate3d(0,${x}px,0)`
              )
            }}
          >
            <h3 className={styles.title}>{messages.title}</h3>
            <h4 className={styles.subTitle}>{messages.subTitle}</h4>
          </animated.div>
        </div>
        <div className={styles.tracksContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <LoadingSpinner />
            </div>
          ) : (
            featuredPlaylists?.map((p) => (
              <MobilePlaylistTile
                key={p.playlist_id}
                title={p.playlist_name}
                artist={p.user.name}
                imageUrl={p.artwork['480x480'] ?? null}
                onClick={handleClickRoute(
                  collectionPage(
                    p.user.handle,
                    p.playlist_name,
                    p.playlist_id,
                    p.permalink,
                    p.is_album
                  ),
                  props.setRenderPublicSite,
                  navigate
                )}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={refInView}>
      <div className={styles.content}>
        <animated.div
          style={{
            transform: textStyles.x.interpolate(
              (x) => `translate3d(0,${x}px,0)`
            )
          }}
        >
          <h3 className={styles.title}>{messages.title}</h3>
          <h4 className={styles.subTitle}>{messages.subTitle}</h4>
        </animated.div>
        <div className={styles.tracksContainer}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <LoadingSpinner />
            </div>
          ) : (
            featuredPlaylists?.map((p) => (
              <DesktopPlaylistTile
                key={p.playlist_id}
                title={p.playlist_name}
                artist={p.user.name}
                imageUrl={p.artwork['480x480'] ?? null}
                onClick={handleClickRoute(
                  collectionPage(
                    p.user.handle,
                    p.playlist_name,
                    p.playlist_id,
                    p.permalink,
                    p.is_album
                  ),
                  props.setRenderPublicSite,
                  navigate
                )}
              />
            ))
          )}
        </div>
      </div>
      <IconLines className={styles.lines} />
    </div>
  )
}

export default FeaturedContent
