import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'

import promoBgJpg from '../assets/promo-bg.jpg'
import promoBgWebp from '../assets/promo-bg.webp'

import styles from './CreateFutureCTA.module.css'

const { EXPLORE_PAGE } = route

const messages = {
  headline: 'Create the future of music, together.',
  startExploring: 'Start Exploring'
}

type CreateFutureCTAProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

export const CreateFutureCTA = (props: CreateFutureCTAProps) => {
  const navigate = useNavigate()

  const onStartExploring = (e: MouseEvent) => {
    handleClickRoute(EXPLORE_PAGE, props.setRenderPublicSite, navigate)(e)
  }

  return (
    <section className={styles.section} aria-labelledby='cta-heading'>
      <div className={styles.bg} aria-hidden='true'>
        <picture>
          <source type='image/webp' srcSet={promoBgWebp} />
          <img src={promoBgJpg} alt='' loading='lazy' decoding='async' />
        </picture>
        <div className={styles.bgOverlayDarken} />
        <div className={styles.bgOverlayBW} />
      </div>
      <div className={styles.content}>
        <div className={styles.inner}>
          <h2 id='cta-heading' className={styles.headline}>
            {messages.headline}
          </h2>
          <button
            type='button'
            className={styles.ctaButton}
            onClick={onStartExploring}
          >
            <span className={styles.ctaLabel}>{messages.startExploring}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
