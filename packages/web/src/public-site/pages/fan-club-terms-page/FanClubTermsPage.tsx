import Footer from 'public-site/components/Footer'
import NavBanner from 'public-site/components/NavBanner'
import { env } from 'services/env'

import styles from './FanClubTermsPage.module.css'

const BASENAME = env.BASENAME

const messages = {
  download: 'Download Fan Club Terms',
  title: 'Fan Club Terms'
}

const FanClubTermsDocumentRoute = `${BASENAME}/documents/FanClubTerms.pdf`

type FanClubTermsPageProps = {
  isMobile: boolean
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

const FanClubTermsPage = (props: FanClubTermsPageProps) => {
  return (
    <div id='FanClubTermsPage' className={styles.container}>
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

export default FanClubTermsPage
