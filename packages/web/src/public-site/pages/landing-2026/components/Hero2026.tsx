import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'

import landingImg from '../assets/landing.png'
import styles from './Hero2026.module.css'

const { SIGN_UP_PAGE } = route

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
    handleClickRoute(SIGN_UP_PAGE, props.setRenderPublicSite, navigate)(e)
  }

  return (
    <section className={styles.section}>
      <div className={styles.bg}>
        <img src={landingImg} alt='' />
      </div>
      <div className={styles.contentWrap}>
        <div className={styles.content}>
          <h1 className={styles.headline}>
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
