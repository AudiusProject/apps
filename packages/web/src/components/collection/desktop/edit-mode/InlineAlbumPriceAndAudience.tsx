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

/**
 * The subset of collection form values that PriceAndAudienceField reads and
 * writes. Mirrors the shape the dedicated edit page's Formik form provides so
 * the field behaves identically here (confirmation modal included).
 */
type AccessFormValues = PlaylistAccessDraft & {
  is_private: boolean
  is_scheduled_release: boolean
  // PriceAndAudienceField also writes the download-gate fields; albums don't
  // persist them, so they live only in this local form.
  is_download_gated: Nullable<boolean>
  download_conditions: Nullable<AccessConditions>
  is_downloadable: boolean
  preview_start_seconds?: Nullable<number>
  field_visibility?: unknown
  last_gate_keeper: Record<string, never>
  is_owned_by_user: boolean
}

const noop = () => {}

/**
 * Pushes the access fields from the local Formik form into the inline
 * edit-mode draft whenever PriceAndAudienceField commits a change, so that
 * Apply persists them alongside the other staged edits.
 */
const AccessDraftSync = () => {
  const { values } = useFormikContext<AccessFormValues>()
  const { setField } = usePlaylistEditMode()
  const isFirstRender = useRef(true)
  const { is_stream_gated, stream_conditions } = values

  useEffect(() => {
    // The initial values are the collection's current values; only sync once
    // the user has actually changed something.
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

/**
 * Renders the album "Price & Audience" settings (free vs. pay-to-unlock)
 * inside the collection page's inline edit mode. The dedicated /edit page
 * has always offered this; the inline editor replaced the pencil link to that
 * page, so albums need it here too.
 */
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
