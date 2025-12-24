import { useEffect, useContext } from 'react'

import { Name } from '@audius/common/models'
import { route } from '@audius/common/utils'
import { Button } from '@audius/harmony'
import { useTheme } from '@emotion/react'
import cn from 'classnames'
import Lottie from 'lottie-react'
import { Link } from 'react-router'

import notFoundAnimation from 'assets/animations/404.json'
import tiledBackground from 'assets/img/notFoundTiledBackround.png'
import { useRecord, make } from 'common/store/analytics/actions'
import NavContext, {
  CenterPreset,
  RightPreset
} from 'components/nav/mobile/NavContext'
import Page from 'components/page/Page'
import { useIsMobile } from 'hooks/useIsMobile'

import styles from './NotFoundPage.module.css'

const { HOME_PAGE } = route

const messages = {
  title: 'Not Found',
  description: '404 - Page not found',
  woops: 'Whoops',
  subText: "This is not the page you're looking for...",
  cta: 'Take Me Back To The Music'
}

export const NotFoundPage = () => {
  const theme = useTheme()
  const isMobile = useIsMobile()
  const record = useRecord()
  useEffect(() => {
    record(make(Name.NOT_FOUND_PAGE, {}))
  }, [record])

  const navContext = useContext(NavContext)!
  useEffect(() => {
    if (isMobile) {
      const { setLeft, setCenter, setRight } = navContext
      setLeft(null)
      setRight(RightPreset.KEBAB)
      setCenter(CenterPreset.LOGO)
    }
  }, [isMobile, navContext])

  return (
    <Page
      title={messages.title}
      description={messages.description}
      containerClassName={cn({ [styles.isMobile]: isMobile })}
      contentClassName={styles.notFoundPageWrapper}
      scrollableSearch={!isMobile}
    >
      <div
        className={cn(styles.bodyWrapper, {
          [styles.bodyWrapperMobile]: isMobile
        })}
        css={{
          backgroundImage: `url(${tiledBackground})`,
          backgroundBlendMode: theme.type === 'day' ? 'none' : 'color-burn'
        }}
      >
        <div className={styles.contentWrapper}>
          <div className={styles.mainContent}>
            <div className={styles.animation}>
              <Lottie loop autoplay animationData={notFoundAnimation} />
            </div>
            <div className={styles.textWrapper}>
              <h1 className={styles.mainText}>
                {messages.woops} <i className='emoji xl thinking-face' />
              </h1>
              <h2 className={styles.subText}>{messages.subText}</h2>
            </div>
          </div>
          <div className={styles.buttonWrapper}>
            <Button variant='primary' fullWidth={isMobile} asChild>
              <Link to={HOME_PAGE}>{messages.cta}</Link>
            </Button>
          </div>
        </div>
      </div>
    </Page>
  )
}
