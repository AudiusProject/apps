import { useCallback, useMemo } from 'react'

import { ActionDrawerWithoutRedux } from 'app/components/action-drawer'

export const messages = {
  replace: 'Replace File',
  download: 'Download File'
}

export const EditTrackFormOverflowMenuDrawer = ({
  isOpen,
  onClose,
  onReplace,
  onDownload
}: {
  isOpen: boolean
  onClose: () => void
  onReplace: () => void
  onDownload?: () => void
}) => {
  const handleReplace = useCallback(() => {
    onReplace()
    onClose()
  }, [onClose, onReplace])

  const handleDownload = useCallback(() => {
    onDownload?.()
    onClose()
  }, [onClose, onDownload])

  const rows = useMemo(
    () => [
      { text: messages.replace, callback: handleReplace },
      ...(onDownload
        ? [{ text: messages.download, callback: handleDownload }]
        : []),
      { text: '' },
      { text: '' }
    ],
    [handleDownload, handleReplace, onDownload]
  )

  return (
    <ActionDrawerWithoutRedux rows={rows} isOpen={isOpen} onClose={onClose} />
  )
}
