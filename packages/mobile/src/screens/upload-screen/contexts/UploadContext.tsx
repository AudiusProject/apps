import { createContext, useContext, type ReactNode } from 'react'

import { useUpload } from '@audius/common/api'

type UploadContextType = ReturnType<typeof useUpload>

const UploadContext = createContext<UploadContextType | null>(null)

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const uploadMethods = useUpload()

  return (
    <UploadContext.Provider value={uploadMethods}>
      {children}
    </UploadContext.Provider>
  )
}

export const useUploadContext = () => {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUploadContext must be used within UploadProvider')
  }
  return context
}
