import { MouseEvent } from 'react'

import { useFeaturedProfiles } from '@audius/common/api'
import { SquareSizes } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

import { useProfilePicture } from 'hooks/useProfilePicture'
import { handleClickRoute } from 'public-site/components/handleClickRoute'

import styles from './WhoUsesAudius2026.module.css'

const { profilePage } = route

const messages = {
  headline: 'Who uses Audius?',
  subline:
    'Hundreds of thousands of artists, labels, collectives, and music lovers, here for the culture just like you.'
}

const FEATURED_LIMIT = 10
const ROW_SIZE = 5

type WhoUsesAudius2026Props = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

function ArtistCard({
  userId,
  name,
  handle,
  setRenderPublicSite,
  navigate
}: {
  userId: number
  name: string
  handle: string
  setRenderPublicSite: (v: boolean) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const imageUrl = useProfilePicture({
    userId,
    size: SquareSizes.SIZE_480_BY_480
  })

  const onClick = (e: MouseEvent) => {
    handleClickRoute(profilePage(handle), setRenderPublicSite, navigate)(e)
  }

  return (
    <button
      type='button'
      className={styles.card}
      onClick={onClick}
      aria-label={`View ${name} on Audius`}
    >
      <div className={styles.imageWrap}>
        <img
          src={imageUrl}
          alt=''
          className={styles.image}
          loading='lazy'
        />
        <div className={styles.bwOverlay} aria-hidden='true' />
      </div>
      <span className={styles.name}>{name}</span>
    </button>
  )
}

export const WhoUsesAudius2026 = (props: WhoUsesAudius2026Props) => {
  const navigate = useNavigate()
  const { data: users, isPending } = useFeaturedProfiles({
    limit: FEATURED_LIMIT
  })

  const row1 = users?.slice(0, ROW_SIZE) ?? []
  const row2 = users?.slice(ROW_SIZE, FEATURED_LIMIT) ?? []

  return (
    <section className={styles.section} aria-labelledby='who-uses-heading'>
      <div className={styles.header}>
        <h2 id='who-uses-heading' className={styles.headline}>
          {messages.headline}
        </h2>
        <p className={styles.subline}>{messages.subline}</p>
      </div>
      {[row1, row2].map((row, rowIdx) => (
        <div key={rowIdx} className={styles.gridContainer}>
          <div className={styles.grid}>
            {isPending
              ? Array.from({ length: ROW_SIZE }).map((_, i) => (
                  <div key={i} className={styles.cardSkeleton}>
                    <div className={styles.imageWrap} />
                    <div className={styles.nameSkeleton} />
                  </div>
                ))
              : row.map((user) => (
                  <ArtistCard
                    key={user.user_id}
                    userId={user.user_id}
                    name={user.name}
                    handle={user.handle}
                    setRenderPublicSite={props.setRenderPublicSite}
                    navigate={navigate}
                  />
                ))}
          </div>
        </div>
      ))}
    </section>
  )
}
