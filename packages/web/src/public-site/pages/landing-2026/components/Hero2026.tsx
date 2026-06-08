import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'

import landingImgPng from '../assets/landing.png'
import landingImgWebp from '../assets/landing.webp'
import { LANDING_2026_TEXT_CLASS } from '../landing2026TextClass'

import styles from './Hero2026.module.css'

const { TRENDING_PAGE } = route

const messages = {
  line1: 'Find your people.',
  line2: 'Grow your scene.',
  getStarted: 'Get Started'
}

type Hero2026Props = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

export const Hero2026 = (props: Hero2026Props) => {
  const navigate = useNavigate()

  const onGetStarted = (e: MouseEvent) => {
    handleClickRoute(TRENDING_PAGE, props.setRenderPublicSite, navigate)(e)
  }

  return (
    <section className={styles.section}>
      <div className={styles.bg}>
        <picture>
          <source type='image/webp' srcSet={landingImgWebp} />
          {/* eslint-disable react/no-unknown-property -- fetchPriority for LCP hero */}
          <img
            src={landingImgPng}
            alt=''
            width={1440}
            height={1024}
            decoding='async'
            fetchPriority='high'
          />
          {/* eslint-enable react/no-unknown-property */}
        </picture>
      </div>
      <div className={styles.contentWrap}>
        <div className={styles.content}>
          <h1 className={`${styles.headline} ${LANDING_2026_TEXT_CLASS}`}>
            {messages.line1}
            <br />
            {messages.line2}
          </h1>
          <button
            type='button'
            className={styles.ctaButton}
            onClick={onGetStarted}
          >
            <span className={styles.ctaLabel}>{messages.getStarted}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
