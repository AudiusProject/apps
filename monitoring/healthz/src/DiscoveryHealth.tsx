import useSWR from 'swr'
import {
  useEnvironmentSelection,
} from './components/EnvironmentSelector'
import { SP, useServiceProviders } from './useServiceProviders'
import { RelTime } from './misc'

const bytesToGb = (bytes: number) => Math.floor(bytes / 10 ** 9)
const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function DiscoveryHealth() {
  const [env, nodeType] = useEnvironmentSelection()
  const { data: sps, error } = useServiceProviders(env, nodeType)

  const isContent = nodeType == 'content-node'
  const isDiscovery = nodeType == 'discovery-node'

  if (error) return <div>error</div>
  if (!sps) return null
  return (
    <div style={{ padding: 20 }}>
      <table className="table">
        <thead>
          <tr>
            <th>Host</th>
            {isDiscovery && <th>Block Diff</th>}
            <th>Registered</th>
            <th>Ver</th>
            <th>Git SHA</th>
            <th>Compose</th>
            <th>Auto Upgrade</th>
            {isContent && <th>Backend</th>}
            <th>Storage</th>
            <th>DB Size</th>
            <th>Your IP</th>
            {isDiscovery && <th>ACDC Health</th>}
            {isDiscovery && <th>Is Signer</th>}
            {isDiscovery && <th>Peers</th>}
            {isDiscovery && <th>Producing</th>}
            {isDiscovery && <th>ACDC Block</th>}
            {isDiscovery && <th>ACDC Block Hash</th>}
            {isContent && <th>Started</th>}
            {isContent && <th>Uploads</th>}
            {isContent && <th>Healthy Peers {'<'}2m</th>}
            {isContent && <th>Legacy Served</th>}
            <th>Registered Wallet</th>
          </tr>
        </thead>
        <tbody>
          {sps.map((sp) => (
            <HealthRow key={sp.endpoint} isContent={isContent} sp={sp} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HealthRow({ isContent, sp }: { isContent: boolean; sp: SP }) {
  const { data, error } = useSWR(sp.endpoint + '/health_check', fetcher)
  const { data: ipCheck, error: ipCheckError } = useSWR(
    sp.endpoint + '/ip_check',
    fetcher
  )
  const { data: metrics } = useSWR(sp.endpoint + '/internal/metrics', fetcher)

  const health = data?.data
  const yourIp = ipCheck?.data

  if (!health || !yourIp)
    return (
      <tr>
        <td>
          <a href={sp.endpoint + '/health_check'} target="_blank">
            {sp.endpoint.replace('https://', '')}
          </a>
        </td>
        <td>{error || ipCheckError ? 'error' : 'loading'}</td>
      </tr>
    )

  // calculate healthy peers counts
  const now = new Date()
  const twoMinutesAgoDate = new Date(now.getTime() - 2 * 60 * 1000)
  let healthyPeers2m = 0
  if (health?.peerHealths) {
    for (const endpoint of Object.keys(health.peerHealths)) {
      const healthDate = new Date(health.peerHealths[endpoint])
      if (!isNaN(healthDate.getTime()) && healthDate > twoMinutesAgoDate) {
        healthyPeers2m++
      }
    }
  }

  const isCompose = health.infra_setup || health.audiusContentInfraSetup
  const composeSha =
    health['audius-docker-compose'] || health['audiusDockerCompose']
  const fsUsed =
    bytesToGb(health.filesystem_used) || bytesToGb(health.storagePathUsed)
  const fsSize =
    bytesToGb(health.filesystem_size) || bytesToGb(health.storagePathSize)
  const storagePercent = fsUsed / fsSize
  const isBehind = health.block_difference > 5 ? 'is-behind' : ''
  const dbSize =
    bytesToGb(health.database_size) || bytesToGb(health.databaseSize)
  const autoUpgradeEnabled =
    health.auto_upgrade_enabled || health.autoUpgradeEnabled
  const getPeers = (str: string | undefined) => {
    if (str === undefined) return 'chain health undefined'
    const match = str.match(/Peers: (\d+)\./)
    return match && match[1] ? match[1] : 'no peers found'
  }
  const getProducing = (str: string | undefined) => {
    if (str === undefined) return 'chain health undefined'
    return (!str.includes('The node stopped producing blocks.')).toString()
  }
  // currently discprov does not expose the address of its internal chain instance
  const isSigner = (nodeAddr?: string, signerAddrs?: string[]) => {
    if (nodeAddr === undefined) return 'node address not found'
    if (signerAddrs === undefined) return 'clique signers not found'
    return signerAddrs.includes(nodeAddr.toLowerCase()).toString()
  }
  const chainDescription: string =
    health.chain_health?.entries['node-health'].description

  return (
    <tr>
      <td>
        <a href={sp.endpoint + '/health_check'} target="_blank">
          {sp.endpoint.replace('https://', '')}
        </a>
      </td>
      {!isContent && <td className={isBehind}>{health.block_difference}</td>}
      <td>{sp.isRegistered.toString()}</td>
      <td>{health.version}</td>
      <td>
        <a
          href={`https://github.com/AudiusProject/audius-protocol/commits/${health.git}`}
          target="_blank"
        >
          {health.git.substring(0, 8)}
        </a>
      </td>
      <td>
        {isCompose && '✓'}{' '}
        {composeSha && (
          <a
            href={`https://github.com/AudiusProject/audius-docker-compose/commits/${composeSha}`}
            target="_blank"
          >
            {composeSha.substring(0, 8)}
          </a>
        )}
      </td>
      <td>{autoUpgradeEnabled && '✓'}</td>
      {isContent && (
        <td>{health.blobStorePrefix}</td>
      )}
      <td>
        <progress value={storagePercent} />
        <br></br>
        <span>
          {fsUsed} / {fsSize} GB
        </span>
      </td>
      <td>{`${dbSize} GB`}</td>
      <td>{`${yourIp}`}</td>
      {!isContent && (<td>{health.chain_health?.status}</td>)}
      {!isContent && <td>{isSigner(data?.signer, health.chain_health?.signers)}</td>}
      {!isContent && <td>{getPeers(chainDescription)}</td>}
      {!isContent && <td>{getProducing(chainDescription)}</td>}
      {!isContent && <td>{health.chain_health?.block_number}</td>}
      {!isContent && (<td>
        <pre>{health.chain_health?.hash}</pre>
      </td>)}
      {isContent && (<td>
        <RelTime date={health?.startedAt} />
      </td>)}
      {isContent && <td>{metrics?.uploads}</td>}
      {isContent && <td>{healthyPeers2m}</td>}
      {isContent && (
        <td>
          <a href={sp.endpoint + '/internal/metrics'} target="_blank">
            {metrics?.attempted_legacy_serves?.length || 0} | {metrics?.successful_legacy_serves?.length || 0}
          </a>
        </td>
      )}
      <td>
        <pre>{sp.delegateOwnerWallet}</pre>
      </td>
    </tr>
  )
}
