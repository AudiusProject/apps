import { useCallback, useEffect, useState } from 'react'

import {
  DEVELOPER_APP_DESCRIPTION_MAX_LENGTH,
  DEVELOPER_APP_IMAGE_URL_MAX_LENGTH,
  DEVELOPER_APP_NAME_MAX_LENGTH,
  developerAppEditSchema,
  useEditDeveloperApp,
  useDeactivateDeveloperAppAccessKey,
  useCreateDeveloperAppAccessKey
} from '@audius/common/api'
import { Name } from '@audius/common/models'
import {
  IconCopy,
  IconTrash,
  IconButton,
  Button,
  Flex,
  IconEmbed,
  Divider
} from '@audius/harmony'
import { Form, Formik, useField } from 'formik'
import { z } from 'zod'
import { toFormikValidationSchema } from 'zod-formik-adapter'

import { make, useRecord } from 'common/store/analytics/actions'
import { TextAreaField, TextField } from 'components/form-fields'
import PreloadImage from 'components/preload-image/PreloadImage'
import Toast from 'components/toast/Toast'
import { copyToClipboard } from 'utils/clipboardUtil'

import styles from './EditAppPage.module.css'
import { MaskedSecretDisplay } from './MaskedSecretDisplay'
import { CreateAppPageProps, CreateAppsPages } from './types'

type EditAppPageProps = CreateAppPageProps

type DeveloperAppValues = z.input<typeof developerAppEditSchema>

const messages = {
  appNameLabel: 'App Name',
  imageUrlLabel: 'App Icon URL',
  apiKey: 'api key',
  copyApiKeyLabel: 'copy api key',
  bearerToken: 'bearer token',
  copyBearerTokenLabel: 'copy bearer token',
  revealTokenLabel: 'reveal bearer token',
  hideTokenLabel: 'hide bearer token',
  deleteAccessKeyLabel: 'delete bearer token',
  createNewToken: 'Create New Bearer Token',
  copied: 'Copied!',
  goBack: 'Back to Your Apps',
  back: 'Back',
  save: 'Save Changes',
  saving: 'Saving',
  miscError: 'Sorry, something went wrong. Please try again later.'
}

const ImageField = ({ name }: { name: string }) => {
  const [{ value }] = useField(name)
  return value ? (
    <PreloadImage src={value} width='100%' />
  ) : (
    <Flex
      w='100%'
      justifyContent='center'
      alignItems='center'
      borderRadius='l'
      css={{ backgroundColor: 'var(--harmony-n-200)' }}
    >
      <IconEmbed color='subdued' css={{ width: '75px', height: '75px' }} />
    </Flex>
  )
}

/** Active bearer tokens: from params.bearerToken (post-creation) or params.api_access_keys */
const getBearerTokens = (params: EditAppPageProps['params']) => {
  if (!params) return []
  const { bearerToken, api_access_keys } = params
  const fromAccessKeys =
    api_access_keys
      ?.filter((a) => a.is_active !== false)
      ?.map((a) => a.api_access_key) ?? []
  if (bearerToken != null && !fromAccessKeys.includes(bearerToken)) {
    return [bearerToken, ...fromAccessKeys]
  }
  return fromAccessKeys
}

export const EditAppPage = (props: EditAppPageProps) => {
  const { params, setPage } = props
  const { name, description, apiKey, imageUrl } = params ?? {}
  const initialBearerTokens = getBearerTokens(params)
  const [bearerTokens, setBearerTokens] =
    useState<string[]>(initialBearerTokens)

  const record = useRecord()

  const { isSuccess, isError, error, mutate, isPending } = useEditDeveloperApp()
  const deactivateAccessKey = useDeactivateDeveloperAppAccessKey()
  const createAccessKey = useCreateDeveloperAppAccessKey()
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Sync bearer tokens when params change (e.g. navigating to different app)
  useEffect(() => {
    setBearerTokens(getBearerTokens(params))
  }, [params])

  useEffect(() => {
    if (isSuccess) {
      setPage(CreateAppsPages.YOUR_APPS)
      record(
        make(Name.DEVELOPER_APP_EDIT_SUCCESS, {
          name: name || '',
          apiKey: apiKey || ''
        })
      )
    }
  }, [isSuccess, apiKey, name, record, setPage])

  useEffect(() => {
    if (isError) {
      setSubmitError(messages.miscError)
      record(
        make(Name.DEVELOPER_APP_EDIT_ERROR, {
          error: error?.message
        })
      )
    }
  }, [isError, record, error?.message])

  const handleSubmit = useCallback(
    (values: DeveloperAppValues) => {
      setSubmitError(null)
      record(
        make(Name.DEVELOPER_APP_EDIT_SUBMIT, {
          name: values.name,
          description: values.description
        })
      )
      mutate(values)
    },
    [mutate, record]
  )

  const initialValues: DeveloperAppValues = {
    apiKey: apiKey || '',
    name: name || '',
    description,
    imageUrl
  }

  const copyApiKey = useCallback(() => {
    if (!apiKey) return
    copyToClipboard(apiKey)
  }, [apiKey])

  const handleDeactivateToken = useCallback(
    (token: string) => {
      if (!apiKey) return
      deactivateAccessKey.mutate(
        { apiKey, apiAccessKey: token },
        {
          onSuccess: () => {
            setBearerTokens((prev) => prev.filter((t) => t !== token))
          }
        }
      )
    },
    [apiKey, deactivateAccessKey]
  )

  const handleCreateToken = useCallback(() => {
    if (!apiKey) return
    createAccessKey.mutate(apiKey, {
      onSuccess: (data) => {
        if (data.api_access_key) {
          setBearerTokens((prev) => [data.api_access_key, ...prev])
        }
      }
    })
  }, [apiKey, createAccessKey])

  if (!params) return null

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      validationSchema={toFormikValidationSchema(developerAppEditSchema)}
    >
      <Form>
        <Flex gap='m' direction='column'>
          <Flex gap='m' alignItems='center'>
            <Flex
              borderRadius='l'
              css={{
                overflow: 'hidden',
                alignSelf: 'stretch',
                width: 138,
                maxWidth: 138,
                height: 138
              }}
              flex={'1 1 auto'}
            >
              <ImageField name='imageUrl' />
            </Flex>
            <Flex flex={'1 1 auto'} direction='column' gap='m'>
              <TextField
                name='name'
                label={messages.appNameLabel}
                disabled={isPending}
                maxLength={DEVELOPER_APP_NAME_MAX_LENGTH}
              />
              <TextField
                name='imageUrl'
                label={messages.imageUrlLabel}
                disabled={isPending}
                maxLength={DEVELOPER_APP_IMAGE_URL_MAX_LENGTH}
              />
            </Flex>
          </Flex>
          <TextAreaField
            name='description'
            showMaxLength
            maxLength={DEVELOPER_APP_DESCRIPTION_MAX_LENGTH}
            disabled={isPending}
          />
          <div className={styles.keyRoot}>
            <span className={styles.keyLabel}>{messages.apiKey}</span>
            <Divider orientation='vertical' className={styles.keyDivider} />
            <span className={styles.keyText}>{apiKey}</span>
            <Divider orientation='vertical' className={styles.keyDivider} />
            <span>
              <Toast
                text={messages.copied}
                portalLocation={
                  typeof document !== 'undefined'
                    ? document.getElementById('page') || document.body
                    : undefined
                }
              >
                <IconButton
                  onClick={copyApiKey}
                  aria-label={messages.copyApiKeyLabel}
                  color='subdued'
                  icon={IconCopy}
                />
              </Toast>
            </span>
          </div>
          {bearerTokens.map((token) => (
            <div key={token} className={styles.keyRoot}>
              <span className={styles.keyLabel}>{messages.bearerToken}</span>
              <Divider orientation='vertical' className={styles.keyDivider} />
              <MaskedSecretDisplay
                value={token}
                copiedMessage={messages.copied}
                copyLabel={messages.copyBearerTokenLabel}
                revealLabel={messages.revealTokenLabel}
                hideLabel={messages.hideTokenLabel}
                dividerClassName={styles.keyDivider}
                extraActions={
                  <IconButton
                    onClick={() => handleDeactivateToken(token)}
                    aria-label={messages.deleteAccessKeyLabel}
                    color='subdued'
                    icon={IconTrash}
                    disabled={deactivateAccessKey.isPending}
                  />
                }
              />
            </div>
          ))}
          <Button
            variant='secondary'
            type='button'
            onClick={handleCreateToken}
            disabled={createAccessKey.isPending}
            isLoading={createAccessKey.isPending}
          >
            {messages.createNewToken}
          </Button>
          <div className={styles.actionsContainer}>
            <Button
              variant='secondary'
              type='button'
              fullWidth
              disabled={isPending}
              onClick={() => setPage(CreateAppsPages.YOUR_APPS)}
            >
              {messages.back}
            </Button>
            <Button
              variant='primary'
              type='submit'
              fullWidth
              isLoading={isPending}
            >
              {isPending ? messages.saving : messages.save}
            </Button>
          </div>
          {submitError == null ? null : (
            <div className={styles.errorContainer}>
              <span className={styles.errorText}>{messages.miscError}</span>
            </div>
          )}
        </Flex>
      </Form>
    </Formik>
  )
}
