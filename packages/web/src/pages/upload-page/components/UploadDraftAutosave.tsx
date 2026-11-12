import { useEffect, useRef } from 'react'

import { useCurrentUserId } from '@audius/common/api'
import { UploadType } from '@audius/common/store'
import { useFormikContext } from 'formik'

import { saveUploadDraft, UploadDraftValues } from '../store/utils/uploadDraft'

const SAVE_DEBOUNCE_MS = 1000

type UploadDraftAutosaveProps = {
  uploadType: UploadType
}

/**
 * Saves the upload form to this device's draft as the user edits it. A
 * pending save is flushed on unmount so leaving right after an edit keeps it.
 */
export const UploadDraftAutosave = ({
  uploadType
}: UploadDraftAutosaveProps) => {
  const { values, dirty } = useFormikContext<UploadDraftValues>()
  const { data: userId } = useCurrentUserId()
  const pendingSave = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!userId || !dirty) return
    const save = () => {
      pendingSave.current = null
      saveUploadDraft(userId, uploadType, values).catch((e) => {
        console.warn('Unable to save upload draft', e)
      })
    }
    pendingSave.current = save
    const timeout = setTimeout(save, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [userId, uploadType, values, dirty])

  useEffect(() => () => pendingSave.current?.(), [])

  return null
}
