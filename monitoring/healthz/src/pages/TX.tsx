import { useQuery } from '@tanstack/react-query'
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import {
  decodeEmLog,
  useEthersProvider,
  useSomeDiscoveryEndpoint,
  emAddress
} from '../utils/acdc-client'

export function TxViewer() {
  const location = useLocation()
  const navigate = useNavigate()
  let [searchParams, setSearchParams] = useSearchParams()
  const discoveryEndpoint = useSomeDiscoveryEndpoint()
  const provider = useEthersProvider()
  const isProd = useLocation().pathname.indexOf('/prod') == 0

  const { data, isLoading } = useQuery(
    [location.pathname, location.search],
    async ({ queryKey }) => {
      let latestBlock = parseInt(searchParams.get('block') || '')
      if (!latestBlock) latestBlock = await provider.getBlockNumber()

      const logs: any[] = await provider.getLogs({
        fromBlock: Math.max(0, latestBlock - (isProd ? 1000 : 10000)),
        toBlock: latestBlock,
        address: emAddress(isProd),
      })

      logs.reverse()
      return { latestBlock, logs }
    }
  )

  if (isLoading || !data) return <div>loading</div>
  const { latestBlock, logs } = data


  function showOlder() {
    const no = logs[logs.length - 1].blockNumber
    searchParams.set('block', no)
    setSearchParams(searchParams)
  }

  function setBlock(b: string) {
    searchParams.set('block', b)
    setSearchParams(searchParams)
  }

  return (
    <div className="nice">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <div style={{ flexGrow: 1 }}>
          <h2>Recent Transactions</h2>
        </div>

      </div>

      <div className="my-2 flex items-center gap-2">
        <div>Block:</div>
        <input
          onChange={(e) => setBlock(e.target.value)}
          placeholder="block number"
          className="p-2 my-2 rounded niceBorder"
          value={latestBlock.toString()}
        />
      </div>

      <table className="niceTable mt-4">
        <thead>
          <tr>
            <th>block no</th>
            <th>tx hash</th>
            <th>signed by</th>
            <th>user id</th>
            <th>action</th>
            <th>type</th>
            <th>id</th>
            <th>metadata</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => {
            const em = decodeEmLog(log.data)
            return (
              <tr key={idx} onClick={() => console.log(log, em)}>
                <td>
                  <Link to={`?block=${log.blockNumber.toString()}`}>
                    {log.blockNumber.toString()}
                  </Link>
                </td>
                <td>
                  <Link
                    className="text-blue-500 underline"
                    to={`tx/${log.transactionHash}`}
                  >
                    {log.transactionHash.substring(0, 15)}...
                  </Link>
                </td>
                <td>
                  <div className="text-xs">
                    <a
                      href={`${discoveryEndpoint}/users/account?wallet=${em._signer}`}
                      target="_blank"
                    >
                      {em._signer}
                    </a>
                  </div>
                </td>
                <td>
                  <a
                    href={`${discoveryEndpoint}/users?id=${em._userId.toString()}`}
                    target="_blank"
                  >
                    {em._userId.toString()}
                  </a>
                </td>
                <td>{em._action}</td>
                <td>{em._entityType}</td>
                <td>{em._entityId.toString()}</td>
                <td>
                  <pre className="text-xs">{em._metadata}</pre>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <button
        className="p-4 rounded bg-purple-800 text-white"
        onClick={showOlder}
      >
        Older
      </button>
    </div>
  )
}
