import { MouseEvent, useState } from 'react'

import {
  useExploreContent,
  useRemixContest,
  useTrack,
  useUser
} from '@audius/common/api'
import { imageBlank } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { SquareSizes } from '@audius/common/models'
import { useLinkClickHandler } from 'react-router'

import { preload } from 'utils/image'

import featuredLines from '../assets/featured-lines.svg?url'

import styles from './FeaturedContests2026.module.css'

const messages = {
  headline: 'Featured Contests',
  subline: 'Join contests, get heard, win prizes.'
}

type FeaturedContests2026Props = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

function ContestCard({
  id,
  setRenderPublicSite
}: {
  id: ID
  setRenderPublicSite: (v: boolean) => void
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { data: contest, isPending: contestPending } = useRemixContest(id)
  const { data: track, isPending: trackPending } = useTrack(contest?.entityId)
  const { data: user, isPending: userPending } = useUser(track?.owner_id)

  const artwork = track?.artwork
  const { imageUrl, onError } = useImageSize({
    artwork,
    targetSize: SquareSizes.SIZE_480_BY_480,
    defaultImage: imageBlank as string,
    preloadImageFn: preload
  })

  const isPending = contestPending || trackPending || userPending || !track
  const permalink = track?.permalink ?? ''
  const handleNavigate = useLinkClickHandler(permalink)

  const onClick = (e: MouseEvent<Element>) => {
    setRenderPublicSite(false)
    handleNavigate(e as MouseEvent<HTMLAnchorElement>)
  }

  const showImage =
    imageUrl != null && imageUrl !== (imageBlank as string)

  if (isPending) {
    return (
      <div className={styles.card}>
        <div className={styles.artworkSkeleton} />
        <div className={styles.titleSkeleton} />
      </div>
    )
  }

  return (
    <button
      type='button'
      className={styles.card}
      onClick={onClick}
      aria-label={`Contest: ${track?.title} by ${user?.name}`}
    >
      <div
        className={`${styles.artworkWrap} ${imageLoaded ? styles.artworkWrapLoaded : ''}`}
      >
        <div className={styles.artworkSkeletonInner} aria-hidden='true' />
        {showImage ? (
          <img
            src={imageUrl}
            alt=''
            className={styles.artwork}
            loading='lazy'
            onLoad={() => setImageLoaded(true)}
            onError={() => onError(imageUrl!)}
          />
        ) : null}
        <div className={styles.bwOverlay} aria-hidden='true' />
      </div>
      <span className={styles.title}>{track?.title}</span>
    </button>
  )
}

export const FeaturedContests2026 = (props: FeaturedContests2026Props) => {
  const { data, isPending, isError, isSuccess } = useExploreContent()
  const contestIds = data?.featuredRemixContests ?? []

  if (isError || (isSuccess && contestIds.length === 0)) {
    return null
  }

  return (
    <section className={styles.section} aria-labelledby='contests-heading'>
      <div className={styles.lines} aria-hidden='true'>
        <img src={featuredLines} alt='' />
      </div>
      <div className={styles.contentWrap}>
        <div className={styles.header}>
          <h2 id='contests-heading' className={styles.headline}>
            {messages.headline}
          </h2>
          <p className={styles.subline}>{messages.subline}</p>
        </div>
        <div className={styles.gridContainer}>
          <div className={styles.grid}>
            {isPending
              ? Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className={styles.card}>
                    <div className={styles.artworkSkeleton} />
                    <div className={styles.titleSkeleton} />
                  </div>
                ))
              : contestIds
                  .slice(0, 5)
                  .map((id) => (
                    <ContestCard
                      key={id}
                      id={id}
                      setRenderPublicSite={props.setRenderPublicSite}
                    />
                  ))}
          </div>
        </div>
      </div>
    </section>
  )
}
