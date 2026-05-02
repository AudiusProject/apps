import { ReactNode, RefObject } from 'react'

import { useRemixContest, useTrack } from '@audius/common/api'
import { useFeatureFlag } from '@audius/common/hooks'
import { ID } from '@audius/common/models'
import { FeatureFlags } from '@audius/common/services'
import cn from 'classnames'

import CoSignFlair from './CosignFlair'
import styles from './Flair.module.css'
import RemixContestFlair from './RemixContestFlair'
import { Size } from './types'

interface TrackFlairProps {
  size: Size
  children: ReactNode
  className?: string
  hideToolTip?: boolean
  id: ID
  forwardRef?: RefObject<HTMLDivElement | null>
}

const TrackFlair = (props: TrackFlairProps) => {
  const { forwardRef, size, children, className, id, hideToolTip } = props

  const { data: track } = useTrack(id)
  const { data: remixContest } = useRemixContest(id)
  // When CONTESTS is on, the contest experience moved to a dedicated page
  // and the track page is just a normal track page. The trophy flair on
  // the artwork was the visual handoff into the in-line contest UI; with
  // that gone it's an orphaned indicator on what should be a clean tile
  // (Figma 2844-51756 — track art has no trophy).
  const { isEnabled: isContestsEnabled } = useFeatureFlag(FeatureFlags.CONTESTS)

  if (!track) return <>{children}</>

  const remixTrack = track.remix_of?.tracks[0]
  const hasRemixAuthorReposted = remixTrack?.has_remix_author_reposted ?? false
  const hasRemixAuthorSaved = remixTrack?.has_remix_author_saved ?? false

  const isCosign = hasRemixAuthorReposted || hasRemixAuthorSaved

  const flair = isCosign ? (
    <CoSignFlair
      coSignName={remixTrack?.user.name}
      hasFavorited={hasRemixAuthorSaved}
      hasReposted={hasRemixAuthorReposted}
      size={size}
      userId={remixTrack?.user.user_id}
      hideToolTip={hideToolTip}
    />
  ) : remixContest?.endDate && !isContestsEnabled ? (
    <RemixContestFlair
      endDate={remixContest.endDate}
      size={size}
      hideToolTip={hideToolTip}
    />
  ) : null

  return (
    <div ref={forwardRef} className={cn(styles.content, className)}>
      <div className={styles.children}>{children}</div>
      {flair ? (
        <div
          className={cn(styles.flair, {
            [styles.tiny]: size === Size.TINY,
            [styles.small]: size === Size.SMALL,
            [styles.medium]: size === Size.MEDIUM,
            [styles.large]: size === Size.LARGE,
            [styles.xlarge]: size === Size.XLARGE
          })}
        >
          {flair}
        </div>
      ) : null}
    </div>
  )
}

export { Size }
export default TrackFlair
