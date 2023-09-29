import {
  HashRouter,
  Link,
  Outlet,
  RouteObject,
  useLocation,
  useRoutes,
} from 'react-router-dom'
import { DiscoveryFeed } from './pages/DiscoveryFeed'
import { DiscoverySearch } from './pages/DiscoverySearch'
import { DiscoveryTrending } from './pages/DiscoveryTrending'
import { DiscoveryPlugins } from './pages/DiscoveryPlugins'
import { IdTranslator } from './pages/IdTranslator'
import { DMs } from './pages/DMs'
import { EnvironmentSelector } from './components/EnvironmentSelector'
import { DMMatrix } from './pages/DMMatrix'
import { Rendezvous } from './pages/Rendezvous'
import Nodes from './pages/Nodes'
import { Fragment } from 'react'
import { Disclosure, Popover, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
const healthzUrl = new URL('./images/healthz.svg', import.meta.url).href

const routeList: RouteObject[] = [
  {
    path: '',
    element: <Layout />,
    children: [
      { path: 'nodes', element: <Nodes /> },
      {
        path: 'views/trending',
        element: <DiscoveryTrending trendingEndpoint="/v1/tracks/trending" />,
      },
      {
        path: 'views/trending_underground',
        element: (
          <DiscoveryTrending trendingEndpoint="/v1/tracks/trending/underground" />
        ),
      },
      {
        path: 'views/trending_playlists',
        element: (
          <DiscoveryTrending trendingEndpoint="/v1/playlists/trending" />
        ),
      },
      { path: 'views/feed', element: <DiscoveryFeed /> },
      { path: 'views/search', element: <DiscoverySearch /> },
      { path: 'views/dms', element: <DMs /> },
      { path: 'views/dm_matrix', element: <DMMatrix /> },
      { path: 'views/plugins', element: <DiscoveryPlugins /> },

      { path: 'utils/id', element: <IdTranslator /> },
      { path: 'utils/rendezvous', element: <Rendezvous /> },

      { path: '', element: <Nodes /> },
      { path: '*', element: <Nodes /> },
    ],
  },
]

export function Router() {
  return (
    <HashRouter>
      <InnerRouter />
    </HashRouter>
  )
}

function InnerRouter() {
  return useRoutes(routeList)
}

const utils = [
  { name: 'Hash ID', description: 'Encode an ID', href: '/utils/id' },
  { name: 'Rendezvous', description: 'Check the rendezvous order for a key', href: '/utils/rendezvous' },
]

const views = [
  { name: 'Feed', description: 'Each node\'s view of the feed', href: '/views/feed' },
  { name: 'Search', description: 'Each node\'s view of a search', href: '/views/search' },
  { name: 'DMs', description: 'Debugging info about each node for DMs', href: '/views/dms' },
  { name: 'DM Matrix', description: 'DMs matrix on a given day', href: '/views/dm_matrix' },
  { name: 'Plugins', description: 'Plugins running on each node', href: '/views/plugins' },
  { name: 'Trending', description: 'Each node\'s view of trending', href: '/views/trending' },
  { name: 'Trending Underground', description: 'Each node\'s view of trending underground', href: '/views/trending_underground' },
  { name: 'Trending Playlists', description: 'Each node\'s view of trending playlists', href: '/views/trending_playlists' },
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function Layout() {
  const location = useLocation()
  const currentPath = location.pathname.slice(1)
  const selected = currentPath || 'nodes'

  const renderNodesPopover = () => (
    <Popover className="relative" aria-current={selected === 'nodes' ? 'page' : undefined}>
      <Popover.Button className={classNames(
        selected === 'nodes'
          ? 'bg-purple-700 text-white dark:bg-purple-500'
          : 'text-white hover:bg-purple-500 hover:bg-opacity-75 dark:hover:bg-purple-400',
        'rounded-md px-3 py-2 text-sm font-semibold inline-flex items-center gap-x-1 leading-6'
      )}>
        <Link to="/">Nodes</Link>
      </Popover.Button>
    </Popover>
  )

  const renderUtilsPopover = () => (
    <Popover className="relative" aria-current={selected.startsWith('utils') ? 'page' : undefined}>
      <Popover.Button className={classNames(
        selected.startsWith('utils')
          ? 'bg-purple-700 text-white dark:bg-purple-500'
          : 'text-white hover:bg-purple-500 hover:bg-opacity-75 dark:hover:bg-purple-400',
        'rounded-md px-3 py-2 text-sm font-semibold inline-flex items-center gap-x-1 leading-6'
      )}>
        <span>Utils</span>
        <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
          {({ close }) => (
            <div
              className="w-screen max-w-sm flex-auto rounded-3xl bg-white dark:bg-gray-800 p-4 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5"
              onClick={() => close()}
            >
              {utils.map((item) => (
                <div key={item.name} className={classNames(
                  item.href.slice(1) === selected
                    ? 'bg-gray-50 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-600',
                  "relative rounded-lg p-4"
                )}>
                  <Link to={item.href} className="font-semibold text-gray-900 dark:text-gray-200">
                    {item.name}
                    <span className="absolute inset-0" />
                  </Link>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  )


  const renderViewsPopover = () => (
    <Popover className="relative" aria-current={selected.startsWith('views') ? 'page' : undefined}>
      <Popover.Button className={classNames(
        selected.startsWith('views')
          ? 'bg-purple-700 text-white dark:bg-purple-500'
          : 'text-white hover:bg-purple-500 hover:bg-opacity-75 dark:hover:bg-purple-400',
        'rounded-md px-3 py-2 text-sm font-semibold inline-flex items-center gap-x-1 leading-6'
      )}>
        <span>Views</span>
        <ChevronDownIcon className="h-5 w-5" aria-hidden="true" />
      </Popover.Button>

      <Transition
        as={Fragment}
        enter="transition ease-out duration-200"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <Popover.Panel className="absolute left-1/2 z-10 mt-5 flex w-screen max-w-max -translate-x-1/2 px-4">
          {({ close }) => (
            <div
              className="w-screen max-w-sm flex-auto rounded-3xl bg-white dark:bg-gray-800 p-4 text-sm leading-6 shadow-lg ring-1 ring-gray-900/5"
              onClick={() => close()}
            >
              {views.map((item) => (
                <div key={item.name} className={classNames(
                  item.href.slice(1) === selected
                    ? 'bg-gray-50 dark:bg-gray-700'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-600',
                  "relative rounded-lg p-4"
                )}>
                  <Link to={item.href} className="font-semibold text-gray-900 dark:text-gray-200">
                    {item.name}
                    <span className="absolute inset-0" />
                  </Link>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">{item.description}</p>
                </div>
              ))}
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  )

  return (
    <>
      <div className="min-h-full">
        <Disclosure as="nav" className="bg-purple-600 dark:bg-purple-800">
          {({ open }) => (
            <>
              <div className="mx-auto max-w-8xl px-4 sm:px-6 lg:px-8">
                <div className="flex h-16 items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <img
                        className="h-8 w-8 filter invert"
                        src={healthzUrl}
                        alt="Healthz"
                      />
                    </div>
                    <div className="hidden md:block">
                      <div className="ml-10 flex items-baseline space-x-4">
                        {renderNodesPopover()}
                        {renderUtilsPopover()}
                        {renderViewsPopover()}
                      </div>
                    </div>
                  </div>
                  <div className="-mr-2 flex md:hidden">
                    {/* Mobile menu button */}
                    <Disclosure.Button className="relative inline-flex items-center justify-center rounded-md bg-purple-600 p-2 text-purple-200 hover:bg-purple-500 hover:bg-opacity-75 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-purple-600">
                      <span className="absolute -inset-0.5" />
                      <span className="sr-only">Open main menu</span>
                      {open ? (
                        <XMarkIcon className="block h-6 w-6" aria-hidden="true" />
                      ) : (
                        <Bars3Icon className="block h-6 w-6" aria-hidden="true" />
                      )}
                    </Disclosure.Button>
                  </div>
                </div>
              </div>

              <Disclosure.Panel className="md:hidden">
                <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
                  {renderNodesPopover()}
                  {renderUtilsPopover()}
                  {renderViewsPopover()}
                </div>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        <main>
          <div className="mx-auto max-w-8xl py-6 sm:px-6 lg:px-8">
            <EnvironmentSelector />
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
