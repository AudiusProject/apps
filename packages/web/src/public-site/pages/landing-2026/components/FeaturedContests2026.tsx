import { MouseEvent } from 'react'

import {
  useExploreContent,
  useRemixContest,
  useTrack,
  useUser
} from '@audius/common/api'
import { ID } from '@audius/common/models'
import { useLinkClickHandler } from 'react-router'

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
  const { data: contest, isPending: contestPending } = useRemixContest(id)
  const { data: track, isPending: trackPending } = useTrack(contest?.entityId)
  const { data: user, isPending: userPending } = useUser(track?.owner_id)

  const isPending = contestPending || trackPending || userPending || !track
  const permalink = track?.permalink ?? ''
  const handleNavigate = useLinkClickHandler(permalink)

  const onClick = (e: MouseEvent<Element>) => {
    setRenderPublicSite(false)
    handleNavigate(e as MouseEvent<HTMLAnchorElement>)
  }

  if (isPending) {
    return (
      <div className={styles.card}>
        <div className={styles.artworkSkeleton} />
        <div className={styles.titleSkeleton} />
      </div>
    )
  }

  const artworkUrl =
    (track?.artwork && (track.artwork as Record<string, string>)['480x480']) ??
    null

  return (
    <button
      type='button'
      className={styles.card}
      onClick={onClick}
      aria-label={`Contest: ${track?.title} by ${user?.name}`}
    >
      <div className={styles.artworkWrap}>
        {artworkUrl ? (
          <img
            src={artworkUrl}
            alt=''
            className={styles.artwork}
            loading='lazy'
          />
        ) : (
          <div className={styles.artworkPlaceholder} />
        )}
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
        <img src='/landing-2026/featured-lines.svg' alt='' />
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
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={styles.card}>
                    <div className={styles.artworkSkeleton} />
                    <div className={styles.titleSkeleton} />
                  </div>
                ))
              : contestIds
                  .slice(0, 4)
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
