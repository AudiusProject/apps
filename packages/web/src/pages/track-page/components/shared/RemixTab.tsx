import { useCallback } from 'react'

import { ID } from '@audius/common/models'
import { Flex, IconArrowRight, PlainButton, Text } from '@audius/harmony'

import { useIsMobile } from 'hooks/useIsMobile'
import { useNavigateToPage } from 'hooks/useNavigateToPage'

import { RemixGrid, RemixSubmissionCardSize } from './RemixGrid'

type RemixTabProps = {
  trackIds: ID[]
  count?: number
  size?: RemixSubmissionCardSize
  emptyState: {
    title: string
    subtitle: string
  }
  viewAllLink?: {
    pathname: string
    search?: string
  }
  viewAllText?: string
}

export const RemixTab = ({
  trackIds,
  count,
  size = 'desktop',
  emptyState,
  viewAllLink,
  viewAllText = 'View All'
}: RemixTabProps) => {
  const isMobile = useIsMobile()
  const navigate = useNavigateToPage()
  const handleViewAllClick = useCallback(() => {
    if (!viewAllLink) return
    const urlString = `${viewAllLink.pathname}?${viewAllLink.search}`
    navigate(urlString)
  }, [viewAllLink, navigate])

  // If there are no tracks, show the empty state
  if (trackIds.length === 0) {
    return (
      <Flex
        column
        pv={size === 'mobile' ? 'xl' : '3xl'}
        gap={size === 'mobile' ? 's' : 'xs'}
        alignItems='center'
        w={size === 'mobile' ? '100%' : undefined}
      >
        <Text variant='title'>{emptyState.title}</Text>
        <Text variant='body' color='subdued'>
          {emptyState.subtitle}
        </Text>
      </Flex>
    )
  }

  return (
    <Flex
      column
      p={size === 'mobile' ? 'xl' : 'xl'}
      pb={size === 'mobile' ? 'm' : 'xl'}
      gap={size === 'mobile' ? '2xl' : 'xl'}
      w={size === 'mobile' ? '100%' : undefined}
    >
      <RemixGrid trackIds={trackIds} size={size} />
      {viewAllLink && (
        <Flex justifyContent='center'>
          <PlainButton
            size={size === 'mobile' ? undefined : 'large'}
            iconRight={IconArrowRight}
            onClick={handleViewAllClick}
          >
            {isMobile
              ? `${viewAllText}${count ? ` (${count})` : ''}`
              : viewAllText}
          </PlainButton>
        </Flex>
      )}
    </Flex>
  )
}
