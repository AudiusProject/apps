import { useSearchParams } from 'react-router-dom'

const nodeTypeParam = 'nodeType'

export function useEnvironmentSelection(): [
  'prod',
  'content' | 'core'
] {
  let [searchParams] = useSearchParams()

  const nodeType = (searchParams.get(nodeTypeParam) as 'content' |  'core') || 'core'

  return [
    'prod',
    nodeType,
  ]
}

export function EnvironmentSelector() {
  let [searchParams, setSearchParams] = useSearchParams()

  const nodeType = searchParams.get(nodeTypeParam) || 'core'

  function setNodeParam(value: 'content' | 'core') {
    setSearchParams((p) => {
      p.set(nodeTypeParam, value)
      return p
    })
  }

  return (
    <div className="flex space-x-4">
      <div className="flex">
        <button
          className={`px-4 py-2 ${nodeType == 'core' ? 'bg-purple-300 text-white' : 'bg-gray-200 text-black'}`}
          onClick={() => setNodeParam('core')}
        >
          Core
        </button>
        <button
          className={`px-4 py-2 ${nodeType == 'content' ? 'bg-purple-300 text-white' : 'bg-gray-200 text-black'}`}
          onClick={() => setNodeParam('content')}
        >
          Content
        </button>
      </div>
    </div>
  )
}
