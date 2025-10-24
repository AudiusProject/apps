import Footer from 'public-site/components/Footer'
import NavBanner from 'public-site/components/NavBanner'
import { env } from 'services/env'

import styles from './ArtistCoinAcceptableUsePage.module.css'

const BASENAME = env.BASENAME

const messages = {
  download: 'Download Artist Coin Acceptable Use Policy',
  title: 'Artist Coin Acceptable Use'
}

const ArtistCoinTermsDocumentRoute = `${BASENAME}/documents/ArtistCoinAcceptableUsePolicy.pdf`

type ArtistCoinAcceptableUsePageProps = {
  isMobile: boolean
  openNavScreen: () => void
  setRenderPublicSite: (shouldRender: boolean) => void
}

const ArtistCoinAcceptableUsePage = (
  props: ArtistCoinAcceptableUsePageProps
) => {
  return (
    <div id='ArtistCoinAcceptableUsePage' className={styles.container}>
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
              href={ArtistCoinTermsDocumentRoute}
              className={styles.downloadLink}
              download
            >
              {messages.download}
            </a>
          </div>
        ) : (
          <iframe
            title={messages.title}
            src={ArtistCoinTermsDocumentRoute}
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

export default ArtistCoinAcceptableUsePage
