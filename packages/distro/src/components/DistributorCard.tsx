import { useQuery } from '@tanstack/react-query'
import { DeveloperApp, sdk } from '@audius/sdk'
import { Flex, IconEmbed, Text } from '@audius/harmony'
import { useSdk } from '../hooks/useSdk'
import { useCallback } from 'react'
import { Status } from '../contexts/types'
import { PreloadImage } from './PreloadImage'

type DistributorCardProps = {
  appKey: string
  url?: string
  initialData?: DeveloperApp
}

export const DistributorCard = ({
  appKey,
  url,
  initialData
}: DistributorCardProps) => {
  const { sdk: audiusSdk } = useSdk()

  const { data: fetchedData } = useQuery({
    queryKey: ['apps', appKey],
    queryFn: () =>
      audiusSdk?.developerApps
        .getDeveloperApp({ address: appKey })
        .then((res) => res.data),
    enabled: !initialData && status !== Status.IDLE && status !== Status.LOADING
  })
  const data = initialData ?? fetchedData

  const handleClick = useCallback(() => {
    // Initialize an sdk for the distributor and use that to auth the user.
    const distroSdk = sdk({
      apiKey: appKey
    })
    distroSdk.oauth!.init({
      successCallback: () => undefined
    })
    distroSdk.oauth!.login({
      scope: 'write',
      redirectUri: `${url}/auth/redirect?redirect_uri=${encodeURIComponent(window.location.origin)}`,
      display: 'fullScreen',
      responseMode: 'query'
    })
  }, [appKey, url])

  return (
    <Flex
      onClick={url ? handleClick : undefined}
      borderRadius='m'
      border='default'
      backgroundColor='white'
      direction='column'
      alignItems='center'
      justifyContent='center'
      gap='s'
      p='s'
      w='136px'
      h='136px'
      css={{
        transition: 'all var(--harmony-quick)',
        cursor: url ? 'pointer' : 'default',
        '&:hover': url
          ? { 'box-shadow': 'var(--harmony-shadow-mid)' }
          : undefined,
        '&:active': url
          ? { background: 'var(--harmony-bg-surface-1)' }
          : undefined
      }}
    >
      {data ? (
        <>
          <Flex
            borderRadius='s'
            css={{
              overflow: 'hidden'
            }}
            h='56px'
            w='56px'
          >
            {data?.imageUrl ? (
              <PreloadImage src={data.imageUrl} />
            ) : (
              <Flex
                w='100%'
                justifyContent='center'
                alignItems='center'
                borderRadius='l'
                css={{ backgroundColor: 'var(--harmony-n-200)' }}
              >
                <IconEmbed color='subdued' size='3xl' />
              </Flex>
            )}
          </Flex>
          <Text variant='body' size='s' color='default' textAlign='center'>
            {data?.name ?? ''}
          </Text>
        </>
      ) : null}
    </Flex>
  )
}
