import { useEffect, useMemo, useRef } from 'react'

import { useCollection } from '@audius/common/api'
import { AccessConditions, ID } from '@audius/common/models'
import { Nullable } from '@audius/common/utils'
import { Formik, useFormikContext } from 'formik'

import { PriceAndAudienceField } from 'components/edit/fields/price-and-audience'

import {
  PlaylistAccessDraft,
  usePlaylistEditMode
} from './PlaylistEditModeContext'

type AccessFormValues = PlaylistAccessDraft & {
  is_private: boolean
  is_scheduled_release: boolean
  is_download_gated: Nullable<boolean>
  download_conditions: Nullable<AccessConditions>
  is_downloadable: boolean
  preview_start_seconds?: Nullable<number>
  field_visibility?: unknown
  last_gate_keeper: Record<string, never>
  is_owned_by_user: boolean
}

const noop = () => {}

const AccessDraftSync = () => {
  const { values } = useFormikContext<AccessFormValues>()
  const { setField } = usePlaylistEditMode()
  const isFirstRender = useRef(true)
  const { is_stream_gated, stream_conditions } = values

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setField('is_stream_gated', is_stream_gated ?? false)
    setField('stream_conditions', stream_conditions ?? null)
  }, [setField, is_stream_gated, stream_conditions])

  return null
}

type InlineAlbumPriceAndAudienceProps = {
  collectionId: ID
}

export const InlineAlbumPriceAndAudience = (
  props: InlineAlbumPriceAndAudienceProps
) => {
  const { collectionId } = props
  const { data: collection } = useCollection(collectionId)

  const initialValues = useMemo<AccessFormValues | null>(() => {
    if (!collection) return null
    return {
      is_private: collection.is_private ?? false,
      is_scheduled_release: collection.is_scheduled_release ?? false,
      is_stream_gated: collection.is_stream_gated ?? false,
      stream_conditions: collection.stream_conditions ?? null,
      is_download_gated: false,
      download_conditions: null,
      is_downloadable: false,
      preview_start_seconds: undefined,
      field_visibility: undefined,
      last_gate_keeper: {},
      is_owned_by_user: false
    }
    // Only seed the form once per edit session; later cache updates (e.g. the
    // optimistic update on Apply) must not reset in-progress edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection?.playlist_id])

  if (!initialValues) return null

  return (
    <Formik<AccessFormValues> initialValues={initialValues} onSubmit={noop}>
      <>
        <AccessDraftSync />
        <PriceAndAudienceField isAlbum isUpload={false} />
      </>
    </Formik>
  )
}
