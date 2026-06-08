import Footer from 'public-site/components/Footer'
import NavBanner from 'public-site/components/NavBanner'
import { env } from 'services/env'

import styles from './FanClubAcceptableUsePage.module.css'

const BASENAME = env.BASENAME

const messages = {
  download: 'Download Fan Club Acceptable Use Policy',
  title: 'Fan Club Acceptable Use'
}

const FanClubTermsDocumentRoute = `${BASENAME}/documents/FanClubAcceptableUsePolicy.pdf`

type FanClubAcceptableUsePageProps = {
  isMobile: boolean
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

const FanClubAcceptableUsePage = (props: FanClubAcceptableUsePageProps) => {
  return (
    <div id='FanClubAcceptableUsePage' className={styles.container}>
      <NavBanner
        invertColors
        className={styles.navBanner}
        isMobile={props.isMobile}
        openNavScreen={props.openNavScreen}
        setRenderPublicSite={props.setRenderPublicSite}
      />
      <div className={styles.contentContainer}>
        {props.isMobile ? (
          <div className={styles.mobileContainer}>
            <a
              href={FanClubTermsDocumentRoute}
              className={styles.downloadLink}
              download
            >
              {messages.download}
            </a>
          </div>
        ) : (
          <iframe
            title={messages.title}
            src={FanClubTermsDocumentRoute}
            className={styles.pdfIFrame}
          ></iframe>
        )}
      </div>
      <Footer
        isMobile={props.isMobile}
        setRenderPublicSite={props.setRenderPublicSite}
      />
    </div>
  )
}

export default FanClubAcceptableUsePage
