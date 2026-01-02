import { Button, Flex, IconPlus, Text, TextLink } from '@audius/harmony'
import { useAuth } from '../contexts/AuthProvider'
import { useSdk } from '../hooks/useSdk'
import { useQuery } from '@tanstack/react-query'
import { DistributorCard } from './DistributorCard'
import { useDistributors } from '../hooks/useDistributors'

const messages = {
  allSet: `You're All Set!`,
  access: `You've granted access for your music to be uploaded to Audius through DDEX.`,
  addAnother: 'Add Another Distributor',
  unlink: 'To unlink your account, go to',
  apps: 'Authorized Apps',
  located: 'located under Settings in the Audius app'
}

const settingsLink = 'https://audius.co/settings/authorized-apps'

export const Success = () => {
  const { logout, user } = useAuth()

  const { sdk: audiusSdk } = useSdk()
  const distributors = useDistributors()
  const distributorAppKeys = distributors.map((d) => `0x${d.appKey}`)

  const { data } = useQuery({
    queryKey: ['authorizedApps', user?.id],
    queryFn: () =>
      user
        ? audiusSdk.users
            .getAuthorizedApps({ id: user.id })
            .then((res) => res.data)
        : [],
    enabled: !!audiusSdk && !!user
  })

  return (
    <>
      <Text variant='heading' size='l' color='accent' textAlign='center'>
        {messages.allSet}
      </Text>
      <Text variant='body' size='m' textAlign='center' color='default'>
        {messages.access}
      </Text>
      <Flex gap='m' wrap='wrap' justifyContent='center'>
        {user
          ? data
              ?.filter((app) => distributorAppKeys.includes(app.address))
              .map((app) => (
                <DistributorCard
                  key={app.address}
                  appKey={app.address}
                  initialData={{ ...app, userId: user.id }}
                />
              ))
          : null}
      </Flex>
      <Button
        iconLeft={IconPlus}
        variant='primary'
        size='small'
        onClick={logout}
      >
        {messages.addAnother}
      </Button>
      <Text variant='body' size='m' color='subdued' textAlign='center'>
        {messages.unlink}{' '}
        <TextLink variant='visible' href={settingsLink}>
          {messages.apps}
        </TextLink>{' '}
        {messages.located}
      </Text>
    </>
  )
}
