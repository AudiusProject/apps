import { useCallback } from 'react'

import { useNavigate } from 'react-router'

import { CREATE_PLAYLIST_PAGE } from 'utils/route'

import { LeftNavLink } from '../LeftNavLink'

const messages = {
  empty: 'Create your first playlist!'
}

export const EmptyLibraryNavLink = () => {
  const navigate = useNavigate()

  const handleCreatePlaylist = useCallback(() => {
    navigate(CREATE_PLAYLIST_PAGE)
  }, [navigate])

  return (
    <LeftNavLink disabled onClick={handleCreatePlaylist}>
      {messages.empty}
    </LeftNavLink>
  )
}
