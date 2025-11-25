import { useEffect } from 'react'

import { useParams, useLocation, useNavigate } from 'react-router-dom'

import { useIsMobile } from 'hooks/useIsMobile'
import { useManagedAccountNotAllowedRedirect } from 'hooks/useManagedAccountNotAllowedRedirect'

import { ChatPage as DesktopChatPage } from './ChatPage'
import { SkeletonChatPage as MobileChatPage } from './components/mobile/SkeletonChatPage'

export const ChatPageProvider = () => {
  useManagedAccountNotAllowedRedirect()
  const params = useParams<{ id?: string }>()
  const location = useLocation()
  const navigate = useNavigate()
  const currentChatId = params.id
  const presetMessage = (
    location.state as { presetMessage?: string } | undefined
  )?.presetMessage
  const isMobile = useIsMobile()

  // Replace the preset message in browser history after the first navigation
  useEffect(() => {
    if (presetMessage) {
      navigate(location.pathname, {
        state: { presetMessage: undefined },
        replace: true
      })
    }
  }, [navigate, location.pathname, presetMessage])

  if (isMobile) {
    return <MobileChatPage />
  }
  return (
    <DesktopChatPage
      currentChatId={currentChatId}
      presetMessage={presetMessage}
    />
  )
}
