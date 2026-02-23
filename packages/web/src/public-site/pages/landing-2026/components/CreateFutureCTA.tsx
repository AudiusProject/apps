import { MouseEvent } from 'react'

import { route } from '@audius/common/utils'
import { useNavigate } from 'react-router'

import { handleClickRoute } from 'public-site/components/handleClickRoute'

import promoBg from '../assets/promo-bg.jpg'

import styles from './CreateFutureCTA.module.css'

const { SIGN_UP_PAGE } = route

const messages = {
  headline: 'Create the future of music, together.',
  signUp: 'Sign up'
}

type CreateFutureCTAProps = {
  isMobile: boolean
  setRenderPublicSite: (shouldRender: boolean) => void
}

export const CreateFutureCTA = (props: CreateFutureCTAProps) => {
  const navigate = useNavigate()

  const onSignUp = (e: MouseEvent) => {
    handleClickRoute(SIGN_UP_PAGE, props.setRenderPublicSite, navigate)(e)
  }

  return (
    <section className={styles.section} aria-labelledby='cta-heading'>
      <div className={styles.bg} aria-hidden='true'>
        <img src={promoBg} alt='' />
        <div className={styles.bgOverlayDarken} />
        <div className={styles.bgOverlayBW} />
      </div>
      <div className={styles.content}>
        <div className={styles.inner}>
          <h2 id='cta-heading' className={styles.headline}>
            {messages.headline}
          </h2>
          <button type='button' className={styles.ctaButton} onClick={onSignUp}>
            <span className={styles.ctaLabel}>{messages.signUp}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
