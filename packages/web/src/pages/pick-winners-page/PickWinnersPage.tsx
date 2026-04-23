import { useCallback, useRef, useState } from 'react'

import { useTrackByPermalink } from '@audius/common/api'
import { remixMessages as messages } from '@audius/common/messages'
import { Button } from '@audius/harmony'
import { useParams, useNavigate } from 'react-router'

import { Header } from 'components/header/desktop/Header'
import { Page } from 'components/page/Page'
import { trackRemixesPage } from 'utils/route'

import {
  ContestPickWinnersSection,
  type ContestPickWinnersSectionHandle
} from '../contest-page/components/ContestPickWinnersSection'

export const PickWinnersPage = () => {
  const navigate = useNavigate()
  const { handle, slug } = useParams<{ handle: string; slug: string }>()
  const sectionRef = useRef<ContestPickWinnersSectionHandle>(null)
  const [canFinalize, setCanFinalize] = useState(false)

  const { data: originalTrack } = useTrackByPermalink(
    handle && slug ? `/${handle}/${slug}` : null
  )
  const handleBack = useCallback(() => {
    const pathname = trackRemixesPage(originalTrack?.permalink ?? '')
    const search = new URLSearchParams({ isContestEntry: 'true' }).toString()
    navigate(`${pathname}?${search}`)
  }, [navigate, originalTrack?.permalink])

  const handleFinalizeNavigate = useCallback(() => {
    const pathname = trackRemixesPage(originalTrack?.permalink ?? '')
    const search = new URLSearchParams({ isContestEntry: 'true' }).toString()
    navigate(`${pathname}?${search}`)
  }, [navigate, originalTrack?.permalink])

  const pageHeader = (
    <Header
      primary={messages.pickWinnersTitle}
      onClickBack={handleBack}
      showBackButton
      rightDecorator={
        <Button
          size='small'
          disabled={!canFinalize}
          onClick={() => sectionRef.current?.requestFinalize()}
        >
          {messages.finalizeWinners}
        </Button>
      }
    />
  )

  if (!originalTrack) {
    return null
  }

  return (
    <Page title={messages.pickWinnersTitle} header={pageHeader}>
      <ContestPickWinnersSection
        ref={sectionRef}
        trackId={originalTrack.track_id}
        showEmbeddedFinalizeButton={false}
        onFinalizeNavigate={handleFinalizeNavigate}
        onCanFinalizeChange={setCanFinalize}
      />
    </Page>
  )
}
