import { useCallback } from 'react'

import {
  IconCopy,
  IconError,
  IconButton,
  Hint,
  Button,
  Divider
} from '@audius/harmony'

import { ExternalTextLink } from 'components/link'
import Toast from 'components/toast/Toast'
import { copyToClipboard } from 'utils/clipboardUtil'

import styles from './AppDetailsPage.module.css'
import { CreateAppPageProps, CreateAppsPages } from './types'

type AppDetailsPageProps = CreateAppPageProps

const AUDIUS_SDK_LINK = 'https://docs.audius.co/developers'

const messages = {
  secretReminder:
    'Use your API Key, Secret, and a Bearer Token to authenticate requests to the Audius API or SDK.',
  description: 'Description',
  apiKey: 'api key',
  apiKeyDescription: "Your app's public identifier",
  copyApiKeyLabel: 'copy api key',
  apiSecret: 'api secret',
  apiSecretDescription: "Your app's password. Shown once, save it!",
  copyApiSecretLabel: 'copy api secret',
  bearerToken: 'bearer token',
  bearerTokenDescription:
    'Used to sign requests. Regenerate a new one anytime.',
  copyBearerTokenLabel: 'copy bearer token',
  copied: 'Copied!',
  readTheDocs: 'Read the Developer Docs',
  goBack: 'Back to Your Apps'
}

export const AppDetailsPage = (props: AppDetailsPageProps) => {
  const { params, setPage } = props

  const handleGoBack = useCallback(() => {
    setPage(CreateAppsPages.YOUR_APPS)
  }, [setPage])

  const { name, description, apiKey, apiSecret, bearerToken } = params ?? {}
  const copyApiKey = useCallback(() => {
    if (!apiKey) return
    copyToClipboard(apiKey)
  }, [apiKey])

  const copySecret = useCallback(() => {
    if (!apiSecret) return
    copyToClipboard(apiSecret)
  }, [apiSecret])

  const copyBearerToken = useCallback(() => {
    if (!bearerToken) return
    copyToClipboard(bearerToken)
  }, [bearerToken])

  if (!params) return null

  return (
    <div className={styles.root}>
      {!apiSecret && !bearerToken ? null : (
        <Hint
          icon={IconError}
          actions={
            // TODO: use variant='visible' when migrated to harmony
            <ExternalTextLink
              to={AUDIUS_SDK_LINK}
              className={styles.readTheDocs}
            >
              {messages.readTheDocs}
            </ExternalTextLink>
          }
        >
          {messages.secretReminder}
        </Hint>
      )}
      <h4 className={styles.appName}>{name}</h4>
      {!description ? null : (
        <span>
          <h5 className={styles.descriptionLabel}>{messages.description}</h5>
          <p className={styles.description}>{description}</p>
        </span>
      )}
      <div className={styles.keyBlock}>
        <span className={styles.keyDescription}>
          {messages.apiKeyDescription}
        </span>
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
      </div>
      {!apiSecret ? null : (
        <div className={styles.keyBlock}>
          <span className={styles.keyDescription}>
            {messages.apiSecretDescription}
          </span>
          <div className={styles.keyRoot}>
            <span className={styles.keyLabel}>{messages.apiSecret}</span>
            <Divider orientation='vertical' className={styles.keyDivider} />
            <span className={styles.keyText}>{apiSecret}</span>
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
                  onClick={copySecret}
                  aria-label={messages.copyApiSecretLabel}
                  color='subdued'
                  icon={IconCopy}
                />
              </Toast>
            </span>
          </div>
        </div>
      )}
      {!bearerToken ? null : (
        <div className={styles.keyBlock}>
          <span className={styles.keyDescription}>
            {messages.bearerTokenDescription}
          </span>
          <div className={styles.keyRoot}>
            <span className={styles.keyLabel}>{messages.bearerToken}</span>
            <Divider orientation='vertical' className={styles.keyDivider} />
            <span className={styles.keyText}>{bearerToken}</span>
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
                  onClick={copyBearerToken}
                  aria-label={messages.copyBearerTokenLabel}
                  color='subdued'
                  icon={IconCopy}
                />
              </Toast>
            </span>
          </div>
        </div>
      )}
      <Button variant='secondary' onClick={handleGoBack}>
        {messages.goBack}
      </Button>
    </div>
  )
}
