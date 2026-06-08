import { memo } from 'react'

import { playbackSelectors } from '@audius/common/store'
import { route } from '@audius/common/utils'
import { IconClose as IconRemove } from '@audius/harmony'
import cn from 'classnames'
import { connect } from 'react-redux'
import { Dispatch } from 'redux'

import { Frosted } from 'components/frosted/Frosted'
import { useIsMobile } from 'hooks/useIsMobile'
import { dismissCookieBanner as dismissCookieBannerAction } from 'store/application/ui/cookieBanner/actions'
import { AppState } from 'store/types'
import { dismissCookieBanner as persistDismissCookieBanner } from 'utils/gdpr'
import { BASE_URL } from 'utils/route'

import styles from './CookieBanner.module.css'

const { PRIVACY_POLICY } = route
const { getHasTrack } = playbackSelectors

const messages = {
  description:
    'We use cookies to make Audius work and to improve your experience. By using this site you agree to our',
  link: 'Privacy Policy.'
}

type CookieBannerProps = ReturnType<typeof mapStateToProps> &
  ReturnType<typeof mapDispatchToProps>

export const CookieBanner = ({ isPlaying, dismiss }: CookieBannerProps) => {
  const isMobile = useIsMobile()
  const goToCookiePolicy = () => {
    const win = window.open(`${BASE_URL}${PRIVACY_POLICY}`, '_blank')
    if (win) win.focus()
  }

  const content = (
    <>
      <div className={styles.description}>
        {messages.description}
        <span className={styles.link} onClick={goToCookiePolicy}>
          {messages.link}
        </span>
      </div>
      <div className={styles.iconContainer} onClick={dismiss}>
        <IconRemove className={styles.iconRemove} />
      </div>
    </>
  )

  return isMobile ? (
    <div
      className={cn(styles.container, {
        [styles.isMobile]: isMobile,
        [styles.isPlaying]: isPlaying
      })}
    >
      {content}
    </div>
  ) : (
    <Frosted
      contentPaddingInline='0px'
      direction='row'
      className={styles.container}
    >
      {content}
    </Frosted>
  )
}

function mapStateToProps(state: AppState) {
  return {
    isPlaying: getHasTrack(state)
  }
}

function mapDispatchToProps(dispatch: Dispatch) {
  return {
    dismiss: () => {
      persistDismissCookieBanner()
      dispatch(dismissCookieBannerAction())
    }
  }
}

export default memo(connect(mapStateToProps, mapDispatchToProps)(CookieBanner))
