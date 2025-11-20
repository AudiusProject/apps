import React from 'react'
import useSWR from 'swr'
import {
  useEnvironmentSelection,
} from '../components/EnvironmentSelector'
import { SP, useServiceProviders } from '../useServiceProviders'
import { RelTime, timeSince, nanosToReadableDuration } from '../misc'
import './Nodes.css'
const audiusdSvg = new URL('../images/audius_d.svg', import.meta.url).href
const autoUpgradeSvg = new URL('../images/auto_upgrade.svg', import.meta.url).href
const dockerSvg = new URL('../images/docker.svg', import.meta.url).href
const fileBackendSvg = new URL('../images/file_disk.svg', import.meta.url).href
const gcpBackendSvg = new URL('../images/gcp.svg', import.meta.url).href
const awsBackendIco = new URL('../images/aws.ico', import.meta.url).href

const bytesToGb = (bytes: number) => Math.floor(bytes / 10 ** 9)
const fetcher = (url: string) => fetch(url).then((res) => res.json())

const discprovWhitelist = [
  ".audius.co",
  "dn1.monophonic.digital",
  ".figment.io",
  ".tikilabs.com",
  "dn0.mainnet.audiusindex.org",
  "-1"
]

export default function Nodes() {
  const [env, nodeType] = useEnvironmentSelection()
  let { data: sps, error } = useServiceProviders(env, nodeType)

  if (error) return <div className="text-red-600 dark:text-red-400">Error</div>
  if (!sps) return <div className="text-gray-600 dark:text-gray-300">Loading...</div>

  if (nodeType == 'content') { // legacy healthcheck
    return (
      <div className="space-y-4 p-4 mt-8 rounded-lg w-full shadow-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
        <div className="overflow-x-auto overflow-y-clip">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">
                  Host
                </th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Version</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Storage</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Fast Repair (checked, pulled, deleted)</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Full Repair (checked, pulled, deleted)</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">DB Size</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Started</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Uploads</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Healthy Peers {'<'}2m</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Discovery Listens Enabled</th>
              </tr >
            </thead >
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sps.map((sp) => (
                <HealthRow key={sp.endpoint} sp={sp} isStaging={env === 'staging'} />
              ))}
            </tbody>
          </table >
        </div >
      </div >
    )
  } else {  // Core healthcheck
    return (
      <div className="space-y-4 p-4 mt-8 rounded-lg w-full shadow-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white">
        <div className="overflow-x-auto overflow-y-clip">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Host</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Git</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Node Health</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Chain ID</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Blocks</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Transactions</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Eth Address</th>
                <th scope="col" className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-200">Comet Address</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {sps.map((sp) => (
                <CoreHealthRow key={sp.endpoint} sp={sp} isStaging={env === 'staging'} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }
}

function HealthRow({ sp, isStaging }: { sp: SP, isStaging: boolean }) {
  const path = '/health_check'
  const { data, error: dataError } = useSWR(sp.endpoint + path, fetcher)
  const { data: metrics } = useSWR(sp.endpoint + '/internal/metrics', fetcher)
  const { data: consoleHealth } = useSWR(sp.endpoint + "/console/health_check", fetcher)

  const health = data?.data
  const coreHealthy = consoleHealth?.healthy
  const totalCoreBlocks = consoleHealth?.totalBlocks
  const totalCoreTxs = consoleHealth?.totalBlocks

  // API response doesn't include isRegistered
  if (sp.isRegistered !== false) {
    sp.isRegistered = true
  }
  const coreHealth = health?.core?.health

  if (!health) {
    let healthStatus = 'loading'
    let healthStatusClass = ''
    if (!sp.isRegistered) {
      healthStatus = 'Unregistered'
      healthStatusClass = 'is-unregistered'
    } else if (dataError) {
      healthStatus = 'error'
      healthStatusClass = 'is-unhealthy'
    }
    return (
      <tr className={healthStatusClass}>
        <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm">
          <a href={sp.endpoint + path} target="_blank">
            {sp.endpoint.replace('https://', '')}
          </a>
        </td>
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Version */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Storage */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Fast Repair (checked, pulled, deleted) */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Full Repair (checked, pulled, deleted) */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* DB Size */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Your IP */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* ACDC Health */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Producing */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* ACDC Block */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Started */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Uploads */}
        <td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td> {/* Healthy Peers */}
      </tr>
    )
  }

  // calculate healthy peers counts
  const now = new Date()
  const twoMinutesAgoDate = new Date(now.getTime() - 2 * 60 * 1000)
  let healthyPeers2m = 0
  if (health?.peerHealths) {
    for (const endpoint of Object.keys(health.peerHealths)) {
      const peerHealth = health.peerHealths[endpoint]
      const healthDate = new Date(peerHealth?.lastHealthy)
      if (!isNaN(healthDate.getTime()) && healthDate > twoMinutesAgoDate) {
        healthyPeers2m++
      }
    }
  }

  const isHealthy = health.healthy
  const unreachablePeers = health.unreachablePeers?.join(', ')
  const peerReachabilityClass = health?.failsPeerReachability ? 'is-unhealthy' : ''

  const composeSha =
    health['audius-docker-compose'] || health['audiusDockerCompose']
  const mediorumDiskUsed = bytesToGb(health.mediorumPathUsed)
  const mediorumDiskSize = bytesToGb(health.mediorumPathSize)

  // Last "full" repair.go run (checks files that are not in the top R rendezvous)
  const lastCleanupSize = health.lastSuccessfulCleanup?.ContentSize ? bytesToGb(health.lastSuccessfulCleanup.ContentSize) : '?'

  // Last repair.go run (only checks files for which this node is in the top R rendezvous)
  const lastRepairSize = health.lastSuccessfulRepair?.ContentSize ? bytesToGb(health.lastSuccessfulRepair.ContentSize) : '?'

  let totalMediorumUsed: number | '?' = '?'
  if (health.blobStorePrefix === 'file') totalMediorumUsed = mediorumDiskUsed
  else {
    // Use the last "full" repair.go run because it would've checked the most files
    if (typeof lastCleanupSize === 'number') totalMediorumUsed = lastCleanupSize
    else if (typeof lastRepairSize === 'number') totalMediorumUsed = lastRepairSize

    // But it's possible the last normal repair.go run added more files
    if (lastRepairSize > lastCleanupSize) totalMediorumUsed = lastRepairSize
  }

  // 4TB artificial limit for cloud backends
  const MAX_STORAGE_SIZE = isStaging ? 400 : 4000
  const totalMediorumSize = mediorumDiskSize && health.blobStorePrefix === 'file' ? mediorumDiskSize : MAX_STORAGE_SIZE

  const isBehind = 'whitespace-nowrap px-3 py-5 text-sm' + (health.block_difference > 5 ? ' is-unhealthy' : '')
  const dbSize =
    bytesToGb(health.database_size) || bytesToGb(health.databaseSize)
  const isDbLocalhost = health.database_is_localhost || health.isDbLocalhost
  const autoUpgradeEnabled =
    health.auto_upgrade_enabled || health.autoUpgradeEnabled
  const audiusdManaged = health.audius_d_managed || health.isAudiusdManaged

  const StorageProgressBar = ({ progress, max }: { progress: number, max: number }) => {
    const progressPercent = (progress / Math.max(progress, max)) * 100

    return (
      <div className="min-w-[200px] relative">
        <div className="h-5 bg-gray-300 relative rounded-3xl">
          <span className={`h-5 block absolute bg-purple-500 ${progressPercent >= 99.999 ? 'rounded-3xl' : 'rounded-l-3xl'}`} style={{ width: `${progressPercent}%` }}></span>
        </div>
      </div>
    )
  }

  let healthStatus = 'Healthy'
  let healthStatusClass = ''
  if (!sp.isRegistered) {
    healthStatus = 'Unregistered'
    healthStatusClass = 'is-unregistered'
  } else if (!isHealthy) {
    healthStatus = 'Unhealthy'
    healthStatusClass = 'is-unhealthy'
  }


  return (
    <tr className={healthStatusClass}>
      <td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm">
        <a href={sp.endpoint + path} target="_blank" className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">
          {sp.endpoint.replace('https://', '')}
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm flex flex-col">
        <div className="flex items-center">
          <span className="h-5 w-5 flex-shrink-0">
            {audiusdManaged && <img
              className="h-5 w-5"
              src={audiusdSvg}
              alt="audius-d"
            /> || autoUpgradeEnabled && <img
              className="h-5 w-5 dark:filter dark:invert"
              src={autoUpgradeSvg}
              alt="Auto-upgrade"
            />}
          </span>
          <span className="w-px" /><span className="w-px" />
          <a
            href={`https://github.com/OpenAudio/go-openaudio/commits/${health.git}`}
            target="_blank"
            className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400"
          >
            {health.git.substring(0, 8)}
          </a>
          <span className="w-px" /><span className="w-px" />
          <span>
            {'('}
            {health.version}
            {')'}
          </span>
        </div>
        {composeSha && (
          <div className="flex items-center mt-2">
            <span className="h-5 w-5 flex-shrink-0">
              <img
                className="h-5 w-5"
                src={dockerSvg}
                alt="Compose"
              />
            </span>
            <span className="w-px" /><span className="w-px" />
            <a
              href={`https://github.com/AudiusProject/audius-docker-compose/commits/${composeSha}`}
              target="_blank"
              className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400"
            >
              {composeSha.substring(0, 8)}
            </a>
          </div>
        )}
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm">
        <a
          href={`${sp.endpoint}/internal/logs/storageAndDb`}
          target="_blank"
          className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400"
        >
          <StorageProgressBar
            progress={totalMediorumUsed === '?' ? 0 : totalMediorumUsed}
            max={totalMediorumSize}
          />
          <div className="mt-3 flex">
            {getStorageBackendIcon(health.blobStorePrefix)} <span className="w-[10px]" /> {totalMediorumUsed} / {totalMediorumUsed === '?' ? '?' : Math.max(totalMediorumSize, totalMediorumUsed)} GB
          </div>
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm">
        <a href={sp.endpoint + '/internal/logs/repair'} target="_blank" className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">
          {timeSince(health.lastSuccessfulRepair?.FinishedAt) === null || health.lastSuccessfulRepair.CleanupMode
            ? "repairing..."
            : (
              <>
                <span>{`(${prettyNumber(health.lastSuccessfulRepair?.Counters?.total_checked ?? 0)}, ${prettyNumber((health.lastSuccessfulRepair?.Counters?.pull_mine_needed ?? 0) + (health.lastSuccessfulRepair?.Counters?.pull_under_replicated_needed ?? 0))}, ${prettyNumber(health.lastSuccessfulRepair?.Counters?.delete_over_replicated_needed ?? 0)})`}</span>
                <div className="mt-2">done <RelTime date={new Date(health.lastSuccessfulRepair.FinishedAt)} />{`, took ${nanosToReadableDuration(health.lastSuccessfulRepair?.Duration || 0)}`}</div>
              </>)}
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm">
        <a href={sp.endpoint + '/internal/logs/repair'} target="_blank" className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">
          {timeSince(health.lastSuccessfulCleanup?.FinishedAt) === null
            ? "repairing..."
            : (
              <>
                <span>{`(${prettyNumber(health.lastSuccessfulCleanup?.Counters?.total_checked ?? 0)}, ${prettyNumber((health.lastSuccessfulCleanup?.Counters?.pull_mine_needed ?? 0) + (health.lastSuccessfulCleanup?.Counters?.pull_under_replicated_needed ?? 0))}, ${prettyNumber(health.lastSuccessfulCleanup?.Counters?.delete_over_replicated_needed ?? 0)})`}</span>
                <div className="mt-2">done <RelTime date={new Date(health.lastSuccessfulCleanup.FinishedAt)} />{`, took ${nanosToReadableDuration(health.lastSuccessfulCleanup?.Duration || 0)}`}</div>
              </>)}
        </a>
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm">{isDbLocalhost && <span>{'\u2713'} </span>}{`${dbSize} GB`}</td>
      <td className="whitespace-nowrap px-3 py-5 text-sm">
        <RelTime date={health?.startedAt} />
      </td>
      <td className="whitespace-nowrap px-3 py-5 text-sm">{metrics?.uploads}</td>
      <td className={`whitespace-nowrap px-3 py-5 text-sm unreachable-peers ${peerReachabilityClass}`}>
        {healthyPeers2m}
        {unreachablePeers && <div>{`Can't reach: ${unreachablePeers}`}</div>}
      </td>
      <td className={"whitespace-nowrap px-3 py-5 text-sm"}>
        {JSON.stringify(health?.isDiscoveryListensEnabled === undefined ? false : health?.isDiscoveryListensEnabled)}
      </td>
    </tr>
  )
}

function CoreHealthRow({ sp, isStaging }: { sp: SP, isStaging: boolean }) {
  const path = '/console/health_check'
  const { data, error: dataError } = useSWR(sp.endpoint + path, fetcher)

  let healthStatus = 'loading'
  let healthStatusClass = ''

  if (dataError) {
    healthStatus = 'error'
    healthStatusClass = 'is-unhealthy'
  } else if (!data) {
    healthStatus = 'loading'
    healthStatusClass = ''
  } else {
    healthStatus = data.healthy ? 'Healthy' : 'Unhealthy'
    healthStatusClass = data.healthy ? '' : 'is-unhealthy'
  }

  if (!data) {
    return (
      <tr className={healthStatusClass}><td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm">
        <a href={sp.endpoint + path} target="_blank">
          {sp.endpoint.replace('https://', '')}
        </a>
      </td><td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{healthStatus}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{dataError ? 'error' : 'loading'}</td></tr>
    )
  }

  return (
    <tr className={healthStatusClass}><td className="whitespace-nowrap py-5 pl-4 pr-3 text-sm">
      <a href={sp.endpoint + path} target="_blank" className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400">
        {sp.endpoint.replace('https://', '')}
      </a>
    </td><td className="whitespace-nowrap px-3 py-5 text-sm">
        {data.git && (
          <a
            href={`https://github.com/AudiusProject/audiusd/commits/${data.git}`}
            target="_blank"
            className="text-gray-900 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400"
          >
            {data.git.substring(0, 7)}
          </a>
        )}
      </td><td className="whitespace-nowrap px-3 py-5 text-sm">{`${healthStatus}${healthStatus === 'Unhealthy' ? ': ' + data.errors : ''}`}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{data.chainId}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{data.totalBlocks}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{data.totalTransactions}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{data.ethAddress}</td><td className="whitespace-nowrap px-3 py-5 text-sm">{data.cometAddress}</td></tr>
  )
}

const getStorageBackendIcon = (storageBackend: string) => {
  switch (storageBackend) {
    case 'gs':
      return (
        <span className="h-5 w-5 flex-shrink-0">
          <img
            className="h-5 w-5"
            src={gcpBackendSvg}
            alt="GCS"
          />
        </span>
      )
    case 's3':
      return (
        <span className="h-5 w-5 flex-shrink-0">
          <img
            className="h-5 w-5"
            src={awsBackendIco}
            alt="AWS"
          />
        </span>
      )
    case 'file':
    default:
      return (
        <span className="h-5 w-5 flex-shrink-0">
          <img
            className="h-5 w-5"
            src={fileBackendSvg}
            alt="Disk"
          />
        </span>
      )
  }
}

const prettyNumber = (num: number) => {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(2)}M`
  }
  if (num >= 1_000) {
    return `${Math.trunc(num / 1_000)}K`
  }
  return num.toString()
}
