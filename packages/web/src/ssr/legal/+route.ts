import { makePageRoute } from 'ssr/util'

import { legalDocuments } from './documents'

export default makePageRoute(Object.keys(legalDocuments), 'Legal Page')
