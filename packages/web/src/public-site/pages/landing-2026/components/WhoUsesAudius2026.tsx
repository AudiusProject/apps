import { MouseEvent } from 'react'

import { useFeaturedProfiles, useUser } from '@audius/common/api'
import { imageProfilePicEmpty } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'
import { pick } from 'lodash'

import { handleClickRoute } from 'public-site/components/handleClickRoute'
import { preload } from 'utils/image'

import styles from './WhoUsesAudius2026.module.css'

/** Default content node mirrors when API does not return them (same path, different host). */
const DEFAULT_IMAGE_MIRRORS = [
  'https://creatornode.audius.co',
  'https://creatornode2.audius.co',
  'https://creatornode3.audius.co'
]

function artworkWithDefaultMirrors(
  profilePicture: { '150x150'?: string; '480x480'?: string; '1000x1000'?: string; mirrors?: string[] } | undefined
): typeof profilePicture & { mirrors: string[] } | undefined {
  if (!profilePicture || !profilePicture['480x480']) return undefined
  const mirrors =
    profilePicture.mirrors && profilePicture.mirrors.length > 0
      ? profilePicture.mirrors
      : DEFAULT_IMAGE_MIRRORS
  return { ...profilePicture, mirrors }
}

const { profilePage } = route

const messages = {
  headline: 'Who uses Audius?',
  subline:
    'Hundreds of thousands of artists, labels, collectives, and music lovers, here for the culture just like you.'
}

const FEATURED_LIMIT = 10

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
  const { data: partialUser } = useUser(userId, {
    select: (user) => pick(user, 'profile_picture', 'updatedProfilePicture')
  })
  const { profile_picture, updatedProfilePicture } = partialUser ?? {}

  const artwork = artworkWithDefaultMirrors(profile_picture)

  const { imageUrl, onError } = useImageSize({
    artwork,
    targetSize: SquareSizes.SIZE_480_BY_480,
    defaultImage: imageProfilePicEmpty as string,
    preloadImageFn: preload
  })

  const displayUrl =
    updatedProfilePicture?.url ?? imageUrl ?? (imageProfilePicEmpty as string)

  const onClick = (e: MouseEvent) => {
    handleClickRoute(profilePage(handle), setRenderPublicSite, navigate)(e)
  }

  const handleImageError = () => {
    if (displayUrl != null && displayUrl !== (imageProfilePicEmpty as string)) {
      onError(displayUrl)
    }
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
          src={displayUrl}
          alt=''
          className={styles.image}
          loading='lazy'
          onError={handleImageError}
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

  const allUsers = users?.slice(0, FEATURED_LIMIT) ?? []

  return (
    <section className={styles.section} aria-labelledby='who-uses-heading'>
      <div className={styles.header}>
        <h2 id='who-uses-heading' className={styles.headline}>
          {messages.headline}
        </h2>
        <p className={styles.subline}>{messages.subline}</p>
      </div>
      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {isPending
            ? Array.from({ length: FEATURED_LIMIT }).map((_, i) => (
                <div key={i} className={styles.cardSkeleton}>
                  <div className={styles.imageWrap} />
                  <div className={styles.nameSkeleton} />
                </div>
              ))
            : allUsers.map((user) => (
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
    </section>
  )
}
