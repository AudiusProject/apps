import { useEffect, useState } from 'react'

import { useLocation } from 'react-router'

import ContentTable from 'components/ContentTable'
import Page from 'components/Page'
import { useReplaceRoute } from 'utils/effects'
import {
  NODES_CONTENT_NODE,
  NODES_UNREGISTERED_CONTENT_NODE
} from 'utils/routes'

import styles from './ContentNodes.module.css'

const messages = {
  title: 'CONTENT NODES'
}

const ContentNodes = () => {
  const location = useLocation()
  const [spId, setSpId] = useState<number | null>(null)
  const replaceRoute = useReplaceRoute()

  const query = new URLSearchParams(location.search)
  const endpoint = query.get('endpoint')

  useEffect(() => {
    const resolveEndpointToSpId = async () => {
      if (!endpoint) return
      try {
        const spId =
          await window.aud.ServiceProviderClient.getServiceProviderIdFromEndpoint(
            endpoint
          )
        setSpId(spId)
      } catch (error) {
        console.error('Failed to resolve endpoint to spId:', error)
        setSpId(0)
      }
    }

    resolveEndpointToSpId()
  }, [endpoint])

  useEffect(() => {
    if (spId === null) return

    let path = ''
    if (spId === 0) {
      path = `${NODES_UNREGISTERED_CONTENT_NODE}?endpoint=${endpoint}`
    } else {
      path = NODES_CONTENT_NODE.replace(':spID', spId.toString())
    }
    replaceRoute(path)
  }, [spId, endpoint, replaceRoute])

  return (
    <Page title={messages.title} className={styles.container}>
      <ContentTable className={styles.serviceTable} />
    </Page>
  )
}

export default ContentNodes
