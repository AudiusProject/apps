import React from 'react'

import { useHasAccount } from '@audius/common/api'
import { route } from '@audius/common/utils'
import { IconCloudUpload, LoadingSpinner, useTheme } from '@audius/harmony'

import { LeftNavLink } from '../LeftNavLink'
import { useNavUploadStatus } from '../useNavUploadStatus'

const { UPLOAD_PAGE } = route

export const UploadNavItem = () => {
  const hasAccount = useHasAccount()
  const { isUploading, isOnUploadPage } = useNavUploadStatus()
  const { color, spacing } = useTheme()

  return (
    <LeftNavLink
      leftIcon={IconCloudUpload}
      to={UPLOAD_PAGE}
      disabled={!hasAccount}
      restriction='account'
      rightIcon={
        isUploading ? (
          <LoadingSpinner
            css={{
              width: spacing.unit6,
              height: spacing.unit6,
              color: isOnUploadPage ? color.static.white : color.neutral.n800
            }}
          />
        ) : undefined
      }
    >
      Upload
    </LeftNavLink>
  )
}
