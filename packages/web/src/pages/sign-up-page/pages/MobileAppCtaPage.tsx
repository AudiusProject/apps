import { useCallback } from 'react'

import { route } from '@audius/common/utils'
import { Flex, Hint, IconInfo } from '@audius/harmony'
import { keyframes } from '@emotion/css'
import { useSelector } from 'react-redux'

import QRCode from 'assets/img/imageQR.png'
import { getStatus } from 'common/store/pages/signon/selectors'
import { EditingStatus } from 'common/store/pages/signon/types'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { Heading, Page, PageFooter } from '../components/layout'
const { SIGN_UP_COMPLETED_REDIRECT, SIGN_UP_LOADING_PAGE } = route

const qrCodeScale = keyframes`
  0% {
    transform: scale(0.92);
  }
  100% {
    transform: scale(1);
  }
`

const messages = {
  heading: 'Get The App',
  description: `
    Take Audius with you! Download the Audius
    mobile app and listen to remixes, tracks, and
    playlists in incredible quality from anywhere.
  `,
  qrInstruction: `
    Scan This Code with Your
    Phone Camera
  `
}

export const MobileAppCtaPage = () => {
  const navigate = useNavigateToPage()
  const status = useSelector(getStatus)

  const handleContinue = useCallback(() => {
    // If account creation is complete, go to feed
    // Otherwise, show loading screen until account is ready
    if (status === EditingStatus.SUCCESS) {
      navigate(SIGN_UP_COMPLETED_REDIRECT)
    } else {
      navigate(SIGN_UP_LOADING_PAGE)
    }
  }, [navigate, status])

  return (
    <Page gap='3xl' centered>
      <Heading heading={messages.heading} description={messages.description} />

      <Flex direction='column' alignItems='center' gap='2xl'>
        <img
          src={QRCode}
          css={{
            height: 272,
            width: 272,
            animation: `${qrCodeScale} 0.6s cubic-bezier(0.24, 1.84, 0.43, 1.01) 0.1s`
          }}
          alt='QR Code'
        />
        <Hint icon={IconInfo}>{messages.qrInstruction}</Hint>
      </Flex>
      <PageFooter buttonProps={{ onClick: handleContinue }} centered />
    </Page>
  )
}
