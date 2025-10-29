import { useCallback, useMemo } from 'react'

import { useFeatureFlag } from '@audius/common/hooks'
import { advancedTrackMessages as messages } from '@audius/common/messages'
import { FeatureFlags } from '@audius/common/services'
import {
  License,
  creativeCommons,
  isBpmValid,
  parseMusicalKey
} from '@audius/common/utils'
import {
  Box,
  Flex,
  IconCcBy as IconCreativeCommons,
  IconInfo,
  Text
} from '@audius/harmony'
import cn from 'classnames'
import { useField } from 'formik'
import { get, set } from 'lodash'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import {
  ContextualMenu,
  SelectedValue,
  SelectedValues
} from 'components/data-entry/ContextualMenu'
import { Divider } from 'components/divider'
import { useTrackField } from 'components/edit-track/hooks'
import { SingleTrackEditValues } from 'components/edit-track/types'
import { computeLicenseIcons } from 'components/edit-track/utils/computeLicenseIcons'
import { TextField } from 'components/form-fields'
import { SegmentedControlField } from 'components/form-fields/SegmentedControlField'
import layoutStyles from 'components/layout/layout.module.css'
import { Tooltip } from 'components/tooltip'
import { useBpmMaskedInput } from 'hooks/useBpmMaskedInput'
import { env } from 'services/env'

import styles from './AdvancedField.module.css'
import { DatePickerField } from './DatePickerField'
import { KeySelectField } from './KeySelectField'
import { SwitchRowField } from './SwitchRowField'

const { computeLicense, ALL_RIGHTS_RESERVED_TYPE, computeLicenseVariables } =
  creativeCommons

const BLOCK_THIRD_PARTY_STREAMING = 'blockThirdPartyStreaming'
const ALLOWED_API_KEYS = 'allowed_api_keys'
const ISRC = 'isrc'
const ISWC = 'iswc'
const RELEASE_DATE = 'release_date'
const LICENSE = 'license'
const LICENSE_TYPE = 'licenseType'
const ALLOW_ATTRIBUTION = 'licenseType.allowAttribution'
const COMMERCIAL_USE = 'licenseType.commercialUse'
const DERIVATIVE_WORKS = 'licenseType.derivativeWorks'
const BPM = 'bpm'
const MUSICAL_KEY = 'musical_key'
const IS_UNLISTED = 'is_unlisted'
const COMMENTS_DISABLED = 'comments_disabled'
const COVER_ORIGINAL_SONG_TITLE = 'cover_original_song_title'
const COVER_ORIGINAL_ARTIST = 'cover_original_artist'
const IS_COVER = 'is_cover'

const allowAttributionValues = [
  { key: false, text: messages.allowAttribution.options.false },
  { key: true, text: messages.allowAttribution.options.true }
]

const commercialUseValues = [
  { key: false, text: messages.commercialUse.options.false },
  { key: true, text: messages.commercialUse.options.true }
]

const derivativeWorksValues = [
  { key: false, text: messages.derivativeWorks.options.false },
  { key: true, text: messages.derivativeWorks.options.true },
  { key: null, text: messages.derivativeWorks.options.null }
]

// Use standard ISRC and ISWC formats, but allow for optional periods and hyphens
// ISRC: https://www.wikidata.org/wiki/Property:P1243
// ISWC: https://www.wikidata.org/wiki/Property:P1827
const isrcRegex = /^[A-Z]{2}-?[A-Z\d]{3}-?\d{2}-?\d{5}$/i
const iswcRegex = /^T-?\d{3}.?\d{3}.?\d{3}.?-?\d$/i

const AdvancedFormSchema = z
  .object({
    [BLOCK_THIRD_PARTY_STREAMING]: z.optional(z.boolean()),
    [ALLOWED_API_KEYS]: z.optional(z.array(z.string()).nullable()),
    [ISRC]: z.optional(z.string().nullable()),
    [ISWC]: z.optional(z.string().nullable()),
    [ALLOW_ATTRIBUTION]: z.optional(z.boolean()),
    [COMMERCIAL_USE]: z.optional(z.boolean()),
    [DERIVATIVE_WORKS]: z.optional(z.boolean().nullable()),
    [BPM]: z.optional(z.string().nullable()),
    [MUSICAL_KEY]: z.optional(z.string().nullable()),
    [COVER_ORIGINAL_SONG_TITLE]: z.optional(z.string().nullable()),
    [COVER_ORIGINAL_ARTIST]: z.optional(z.string().nullable()),
    [IS_COVER]: z.optional(z.boolean())
  })
  .refine((form) => !form[ISRC] || isrcRegex.test(form[ISRC]), {
    message: messages.isrc.validError,
    path: [ISRC]
  })
  .refine((form) => !form[ISWC] || iswcRegex.test(form[ISWC]), {
    message: messages.iswc.validError,
    path: [ISWC]
  })

type AdvancedFormValues = z.input<typeof AdvancedFormSchema>

type AdvancedFieldProps = {
  isHidden?: boolean
  isUpload?: boolean
}

const getInitialBpm = (bpm: number | null | undefined) => {
  if (bpm) {
    const bpmString = bpm.toString()
    return isBpmValid(bpmString) ? bpmString : undefined
  }
  return undefined
}

export const AdvancedField = ({ isUpload }: AdvancedFieldProps) => {
  const [{ value: isrcValue }, _ignored2, { setValue: setIsrc }] =
    useTrackField<SingleTrackEditValues[typeof ISRC]>(ISRC)
  const [{ value: releaseDate }, _ignored3, { setValue: setReleaseDate }] =
    useTrackField<SingleTrackEditValues[typeof RELEASE_DATE]>(RELEASE_DATE)
  const [{ value: iswcValue }, _ignored4, { setValue: setIswc }] =
    useTrackField<SingleTrackEditValues[typeof ISWC]>(ISWC)
  const [{ value: license }, _ignored5, { setValue: setLicense }] =
    useTrackField<License>(LICENSE)
  const [
    { value: allowedApiKeys },
    _ignored6,
    { setValue: setAllowedApiKeys }
  ] =
    useTrackField<SingleTrackEditValues[typeof ALLOWED_API_KEYS]>(
      ALLOWED_API_KEYS
    )
  const [{ value: bpm }, _ignored7, { setValue: setBpm }] =
    useTrackField<SingleTrackEditValues[typeof BPM]>(BPM)
  const [{ value: musicalKey }, _ignored8, { setValue: setMusicalKey }] =
    useTrackField<SingleTrackEditValues[typeof MUSICAL_KEY]>(MUSICAL_KEY)
  const [{ value: isHidden }, _ignored9] = useTrackField<boolean>(IS_UNLISTED)
  const [
    { value: commentsDisabled },
    _ignored10,
    { setValue: setIsCommentsDisabled }
  ] = useTrackField<boolean>(COMMENTS_DISABLED)
  const [
    { value: coverOriginalSongTitle },
    _ignored11,
    { setValue: setCoverOriginalSongTitle }
  ] = useTrackField<SingleTrackEditValues[typeof COVER_ORIGINAL_SONG_TITLE]>(
    COVER_ORIGINAL_SONG_TITLE
  )
  const [
    { value: coverOriginalArtist },
    _ignored12,
    { setValue: setCoverOriginalArtist }
  ] = useTrackField<SingleTrackEditValues[typeof COVER_ORIGINAL_ARTIST]>(
    COVER_ORIGINAL_ARTIST
  )

  const isCover = useMemo(() => {
    // If either is not null or undefined, then it is a cover
    return coverOriginalSongTitle != null || coverOriginalArtist != null
  }, [coverOriginalSongTitle, coverOriginalArtist])

  const initialValues = useMemo(() => {
    const initialValues = {}
    set(initialValues, ISRC, isrcValue)
    set(initialValues, ISWC, iswcValue)
    set(initialValues, ALLOWED_API_KEYS, allowedApiKeys)
    set(initialValues, LICENSE_TYPE, computeLicenseVariables(license))
    set(initialValues, BLOCK_THIRD_PARTY_STREAMING, !!allowedApiKeys)
    set(initialValues, BPM, getInitialBpm(bpm))
    set(initialValues, MUSICAL_KEY, parseMusicalKey(musicalKey ?? ''))
    set(initialValues, RELEASE_DATE, releaseDate)
    set(initialValues, IS_UNLISTED, isHidden)
    set(initialValues, COMMENTS_DISABLED, commentsDisabled)
    set(initialValues, COVER_ORIGINAL_SONG_TITLE, coverOriginalSongTitle)
    set(initialValues, COVER_ORIGINAL_ARTIST, coverOriginalArtist)
    set(initialValues, IS_COVER, isCover)
    return initialValues as AdvancedFormValues
  }, [
    isrcValue,
    iswcValue,
    allowedApiKeys,
    license,
    bpm,
    musicalKey,
    releaseDate,
    isHidden,
    commentsDisabled,
    coverOriginalSongTitle,
    coverOriginalArtist,
    isCover
  ])

  const onSubmit = useCallback(
    (values: AdvancedFormValues) => {
      if (get(values, BLOCK_THIRD_PARTY_STREAMING)) {
        setAllowedApiKeys([env.API_KEY])
      } else {
        setAllowedApiKeys(null)
      }
      if (get(values, IS_COVER)) {
        // If values are not set, but the toggle is on, set to empty strings for reporting to publishers
        setCoverOriginalSongTitle(
          get(values, COVER_ORIGINAL_SONG_TITLE) ?? coverOriginalSongTitle ?? ''
        )
        setCoverOriginalArtist(
          get(values, COVER_ORIGINAL_ARTIST) ?? coverOriginalArtist ?? ''
        )
      }
      setIsrc(get(values, ISRC) ?? isrcValue)
      setIswc(get(values, ISWC) ?? iswcValue)
      setLicense(
        computeLicense(
          get(values, ALLOW_ATTRIBUTION) ?? false,
          get(values, COMMERCIAL_USE) ?? false,
          get(values, DERIVATIVE_WORKS)
        ).licenseType
      )
      const bpmValue = get(values, BPM)
      setBpm(typeof bpmValue !== 'undefined' ? Number(bpmValue) : bpm)
      setMusicalKey(get(values, MUSICAL_KEY) ?? musicalKey)
      setReleaseDate(get(values, RELEASE_DATE) ?? releaseDate)
      setIsCommentsDisabled(get(values, COMMENTS_DISABLED) ?? commentsDisabled)
    },
    [
      setIsrc,
      isrcValue,
      setIswc,
      iswcValue,
      setLicense,
      setBpm,
      bpm,
      setMusicalKey,
      musicalKey,
      setReleaseDate,
      releaseDate,
      setIsCommentsDisabled,
      commentsDisabled,
      setAllowedApiKeys,
      setCoverOriginalSongTitle,
      coverOriginalSongTitle,
      setCoverOriginalArtist,
      coverOriginalArtist
    ]
  )

  const renderValue = useCallback(() => {
    const value = []

    if (!license || license === ALL_RIGHTS_RESERVED_TYPE) {
      value.push(
        <SelectedValue key={messages.noLicense} label={messages.noLicense} />
      )
    }

    const licenseIcons = computeLicenseIcons(license)

    if (licenseIcons) {
      value.push(
        <SelectedValue>
          {licenseIcons.map(([Icon, key]) => (
            <Icon key={key} size='s' color='default' />
          ))}
        </SelectedValue>
      )
    }
    if (isrcValue) {
      value.push(<SelectedValue key={isrcValue} label={isrcValue} />)
    }

    if (iswcValue) {
      value.push(<SelectedValue key={iswcValue} label={iswcValue} />)
    }
    if (bpm) {
      value.push(
        <SelectedValue
          key={messages.bpm.header}
          label={`${bpm} ${messages.bpm.label}`}
        />
      )
    }
    if (musicalKey) {
      value.push(
        <SelectedValue
          key={messages.musicalKey}
          label={parseMusicalKey(musicalKey)}
        />
      )
    }
    if (commentsDisabled) {
      value.push(
        <SelectedValue
          key={messages.disableComments.value}
          label={messages.disableComments.value}
        />
      )
    }

    if (isCover) {
      value.push(
        <SelectedValue
          key={messages.coverAttribution.selectedValue}
          label={messages.coverAttribution.selectedValue}
        />
      )
    }

    return <SelectedValues>{value}</SelectedValues>
  }, [
    license,
    isrcValue,
    iswcValue,
    bpm,
    musicalKey,
    commentsDisabled,
    isCover
  ])

  return (
    <ContextualMenu
      label={messages.title}
      description={messages.description}
      icon={<IconCreativeCommons />}
      initialValues={initialValues}
      onSubmit={onSubmit}
      validationSchema={toFormikValidationSchema(AdvancedFormSchema)}
      menuFields={<AdvancedModalFields isUpload={isUpload} />}
      renderValue={renderValue}
    />
  )
}

const AdvancedModalFields = ({ isUpload }: { isUpload?: boolean }) => {
  const [{ value: allowAttribution }] = useField<boolean>(ALLOW_ATTRIBUTION)
  const [{ value: commercialUse }] = useField<boolean>(COMMERCIAL_USE)
  const [{ value: derivativeWorks }] = useField<boolean>(DERIVATIVE_WORKS)
  const [{ value: isHidden }] = useField<boolean>(IS_UNLISTED)
  const [, , { setValue: setBpmValue }] = useField<string>(BPM)

  const bpmMaskedInputProps = useBpmMaskedInput({
    onChange: (e) => {
      setBpmValue(e.target.value)
    }
  })

  const { licenseType, licenseDescription } = computeLicense(
    allowAttribution,
    commercialUse,
    derivativeWorks
  )

  const licenseIcons = computeLicenseIcons(licenseType)

  const { isEnabled: isCommentsEnabled } = useFeatureFlag(
    FeatureFlags.COMMENTS_ENABLED
  )

  const [
    { value: coverOriginalSongTitle },
    ,
    { setValue: setCoverOriginalSongTitle }
  ] = useField<SingleTrackEditValues[typeof COVER_ORIGINAL_SONG_TITLE]>(
    COVER_ORIGINAL_SONG_TITLE
  )

  const [
    { value: coverOriginalArtist },
    ,
    { setValue: setCoverOriginalArtist }
  ] = useField<SingleTrackEditValues[typeof COVER_ORIGINAL_ARTIST]>(
    COVER_ORIGINAL_ARTIST
  )

  return (
    <div className={cn(layoutStyles.col, layoutStyles.gap4)}>
      {!isHidden ? (
        <>
          <Flex gap='m' direction='column'>
            <Text variant='title' size='l' tag='h3'>
              Release Date
            </Text>
            <DatePickerField name={RELEASE_DATE} label={messages.releaseDate} />
          </Flex>
          <Divider />
        </>
      ) : null}
      {!isUpload ? (
        <>
          <span className={cn(layoutStyles.row, layoutStyles.gap6)}>
            <Flex direction='column' w='100%'>
              <Box mb='m'>
                <Text variant='title' size='l' tag='h3'>
                  {messages.bpm.header}
                </Text>
              </Box>

              <TextField
                name={BPM}
                type='number'
                label={messages.bpm.label}
                autoComplete='off'
                {...bpmMaskedInputProps}
              />
            </Flex>
            <Flex direction='column' w='100%'>
              <Box mb='m'>
                <Text variant='title' size='l' tag='h3'>
                  Key
                </Text>
              </Box>

              <KeySelectField name={MUSICAL_KEY} />
            </Flex>
          </span>
          <Divider />
        </>
      ) : null}
      {isCommentsEnabled ? (
        <>
          <SwitchRowField
            name={COMMENTS_DISABLED}
            header={messages.disableComments.header}
            description={messages.disableComments.description}
          />
          <Divider />
        </>
      ) : null}
      <div className={cn(layoutStyles.col, layoutStyles.gap6)}>
        <Text variant='title' size='l' tag='h3'>
          {messages.licenseType}
        </Text>
        <div className={styles.attributionCommercialRow}>
          <div
            className={cn(
              styles.attributionRowItem,
              layoutStyles.col,
              layoutStyles.gap2
            )}
          >
            <Text variant='title' size='m' tag='label' id='allow-attribution'>
              {messages.allowAttribution.header}
            </Text>
            <SegmentedControlField
              aria-labelledby='allow-attribution'
              name={ALLOW_ATTRIBUTION}
              options={allowAttributionValues}
              fullWidth
            />
          </div>
          <Divider className={styles.verticalDivider} type='vertical' />
          <div
            className={cn(
              styles.attributionRowItem,
              layoutStyles.col,
              layoutStyles.gap2,
              {
                [styles.disabled]: !allowAttribution
              }
            )}
          >
            <Text variant='title' size='m' tag='label' id='commercial'>
              {messages.commercialUse.header}
            </Text>
            <SegmentedControlField
              aria-labelledby='commercial'
              name={COMMERCIAL_USE}
              options={commercialUseValues}
              disabled={!allowAttribution}
              fullWidth
            />
          </div>
        </div>
        <div className={cn(layoutStyles.col, layoutStyles.gap2)}>
          <Text
            className={cn({ [styles.disabled]: !allowAttribution })}
            variant='title'
            size='m'
            tag='label'
            id='derivative-works'
          >
            {messages.derivativeWorks.header}
          </Text>
          <SegmentedControlField
            aria-labelledby='derivative-works'
            name={DERIVATIVE_WORKS}
            fullWidth
            options={derivativeWorksValues}
            disabled={!allowAttribution}
          />
        </div>
      </div>
      <div className={styles.license}>
        <div className={cn(layoutStyles.row, layoutStyles.gap2)}>
          {licenseIcons ? (
            <div className={cn(layoutStyles.row, layoutStyles.gap1)}>
              {licenseIcons.map(([Icon, key]) => (
                <Icon key={key} color='default' />
              ))}
            </div>
          ) : null}
          <Text variant='title' size='m' tag='h4'>
            {licenseType}
          </Text>
        </div>
        {licenseDescription ? <Text size='s'>{licenseDescription}</Text> : null}
      </div>
      <Divider />
      <div className={cn(layoutStyles.col, layoutStyles.gap4)}>
        <Text variant='title' size='l' tag='h3'>
          <Flex alignItems='center' gap='xs'>
            {`${messages.isrc.header} / ${messages.iswc.header}`}
            <Tooltip text={messages.isrcTooltip}>
              <IconInfo size='m' color='subdued' />
            </Tooltip>
          </Flex>
        </Text>
        <span className={cn(layoutStyles.row, layoutStyles.gap6)}>
          <div className={styles.textFieldContainer}>
            <TextField
              name={ISRC}
              label={messages.isrc.header}
              placeholder={messages.isrc.placeholder}
            />
          </div>
          <div className={styles.textFieldContainer}>
            <TextField
              name={ISWC}
              label={messages.iswc.header}
              placeholder={messages.iswc.placeholder}
            />
          </div>
        </span>
      </div>
      <Divider />
      <SwitchRowField
        name={IS_COVER}
        header={messages.coverAttribution.toggle.header}
        description={messages.coverAttribution.toggle.description}
      >
        <Box
          mt='m'
          p='l'
          w='100%'
          borderRadius='m'
          backgroundColor='surface1'
          border='default'
        >
          <Text variant='title' size='m'>
            {messages.coverAttribution.attribution.header}
          </Text>
          <Box mb='m'>
            <Text variant='body'>
              {messages.coverAttribution.attribution.description}
            </Text>
          </Box>
          <Flex gap='m'>
            <TextField
              name={COVER_ORIGINAL_SONG_TITLE}
              label={messages.coverAttribution.attribution.originalSongTitle}
              placeholder={
                messages.coverAttribution.attribution.originalSongTitle
              }
              value={coverOriginalSongTitle || ''}
              onChange={(e) => {
                setCoverOriginalSongTitle(e.target.value)
              }}
            />
            <TextField
              name={COVER_ORIGINAL_ARTIST}
              label={messages.coverAttribution.attribution.originalSongArtist}
              placeholder={
                messages.coverAttribution.attribution.originalSongArtist
              }
              value={coverOriginalArtist || ''}
              onChange={(e) => {
                setCoverOriginalArtist(e.target.value)
              }}
            />
          </Flex>
        </Box>
      </SwitchRowField>
      <Divider />
      <SwitchRowField
        name={BLOCK_THIRD_PARTY_STREAMING}
        header={messages.apiAllowed.header}
        description={messages.apiAllowed.description}
      />
    </div>
  )
}
