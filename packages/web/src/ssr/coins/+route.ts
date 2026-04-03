import { makePageRoute } from 'ssr/util'

export default makePageRoute(
  [
    '/clubs',
    '/coins',
    '/coins/create',
    '/coins/sort',
    '/coins/@ticker',
    '/coins/@ticker/buy',
    '/coins/@ticker/redeem',
    '/coins/@ticker/redeem/@code',
    '/coins/@ticker/exclusive-tracks',
    '/coins/@ticker/edit',
    '/clubs/create',
    '/clubs/sort',
    '/clubs/@ticker',
    '/clubs/@ticker/buy',
    '/clubs/@ticker/redeem',
    '/clubs/@ticker/redeem/@code',
    '/clubs/@ticker/exclusive-tracks',
    '/clubs/@ticker/edit'
  ],
  'Fan Clubs Page'
)
