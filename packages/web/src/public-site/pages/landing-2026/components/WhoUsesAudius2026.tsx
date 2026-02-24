import { MouseEvent, useState } from 'react'

import { useUserByHandle } from '@audius/common/api'
import { imageProfilePicEmpty } from '@audius/common/assets'
import { useImageSize } from '@audius/common/hooks'
import { SquareSizes } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { pick } from 'lodash'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'
import { preload } from 'utils/image'

import styles from './WhoUsesAudius2026.module.css'

const { profilePage } = route

/** Artists and labels from Figma 2026 rebrand – name and handle; images from API. */
const ARTISTS: { name: string; handle: string }[] = [
  { name: 'Disclosure', handle: 'disclosure' },
  { name: 'Ookay', handle: 'ookay' },
  { name: 'Eli & Fur', handle: 'eliandfur' },
  { name: 'Laxcity', handle: 'laxcitymusic' },
  { name: 'Kato On The Track', handle: 'katoproducer' },
  { name: 'bitbird', handle: 'bitbird' },
  { name: 'Dim Mak', handle: 'dimmak' },
  { name: 'Anjunadeep', handle: 'anjunadeep' },
  { name: 'Run The Trap', handle: 'runthetrap' },
  { name: 'NCS', handle: 'ncs' }
]

const messages = {
  headline: 'Who uses Audius?',
  subline:
    'Thousands of artists, labels, collectives, and music lovers, here for the culture, just like you.'
}

type WhoUsesAudius2026Props = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

function ArtistCard({
  name,
  handle,
  setRenderPublicSite,
  navigate
}: {
  name: string
  handle: string
  setRenderPublicSite: (v: boolean) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const { data: partialUser } = useUserByHandle(handle, {
    select: (user) => pick(user, 'profile_picture', 'updatedProfilePicture')
  })
  const { profile_picture, updatedProfilePicture } = partialUser ?? {}

  const { imageUrl, onError } = useImageSize({
    artwork: profile_picture,
    targetSize: SquareSizes.SIZE_480_BY_480,
    defaultImage: imageProfilePicEmpty as string,
    preloadImageFn: preload
  })

  const displayUrl = updatedProfilePicture?.url ?? imageUrl
  const hasRealImage =
    displayUrl != null && displayUrl !== (imageProfilePicEmpty as string)

  const onClick = (e: MouseEvent) => {
    handleClickRoute(profilePage(handle), setRenderPublicSite, navigate)(e)
  }

  const handleImageError = () => {
    if (displayUrl != null && displayUrl !== (imageProfilePicEmpty as string)) {
      onError(displayUrl)
    }
  }

  const handleImageLoad = () => setImageLoaded(true)

  return (
    <button
      type='button'
      className={styles.card}
      onClick={onClick}
      aria-label={`View ${name} on Audius`}
    >
      <div
        className={`${styles.imageWrap} ${imageLoaded ? styles.imageWrapLoaded : ''}`}
      >
        <div className={styles.imageSkeleton} aria-hidden='true' />
        {hasRealImage ? (
          <img
            src={displayUrl}
            alt=''
            className={styles.image}
            loading='lazy'
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : null}
        <div className={styles.bwOverlay} aria-hidden='true' />
      </div>
      <span className={styles.name}>{name}</span>
    </button>
  )
}

export const WhoUsesAudius2026 = (props: WhoUsesAudius2026Props) => {
  const navigate = useNavigate()

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
          {ARTISTS.map((artist) => (
            <ArtistCard
              key={artist.handle}
              name={artist.name}
              handle={artist.handle}
              setRenderPublicSite={props.setRenderPublicSite}
              navigate={navigate}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
