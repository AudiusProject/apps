import {
  HashRouter,
  Link,
  Outlet,
  RouteObject,
  useLocation,
  useParams,
  useRoutes,
} from 'react-router-dom'
import { IdTranslator } from './pages/IdTranslator'
import { EnvironmentSelector } from './components/EnvironmentSelector'
import { UptimeMatrix } from './pages/UptimeMatrix'
import { Rendezvous } from './pages/Rendezvous'
import Nodes from './pages/Nodes'
import { Fragment } from 'react'
import { Disclosure, Popover, Transition } from '@headlessui/react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/20/solid'
import { TxViewer } from './pages/TX'
import { TxDetail } from './pages/TXDetail'
const healthzUrl = new URL('./images/healthz.svg', import.meta.url).href

const routeList: RouteObject[] = [
  {
    path: '',
    element: <Layout />,
    children: [
      { path: 'nodes', element: <Nodes /> },
      { path: 'views/uptime_matrix', element: <UptimeMatrix /> },

      { path: 'utils/id', element: <IdTranslator /> },
      { path: 'utils/rendezvous', element: <Rendezvous /> },

      { path: '/:env/explorer', element: <TxViewer /> },
      { path: '/:env/explorer/tx/:tx', element: <TxDetail /> },

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
  {
    name: 'Rendezvous',
    description: 'Check the rendezvous order for a key',
    href: '/utils/rendezvous',
  },
  {
    name: 'TX Explorer',
    description: 'View ACDC transactions',
    href: '/prod/explorer',
  },
]

const views = [
  {
    name: 'Uptime Matrix',
    description: 'Matrix of uptime for each node in the last hour',
    href: '/views/uptime_matrix',
  }
]

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ')
}

function Layout() {
  const location = useLocation()
  const { env } = useParams()
  const currentPath = location.pathname.slice(1)
  const selected = currentPath || 'nodes'
  console.log(currentPath)

  const renderNodesPopover = () => (
    <Popover
      className="relative"
      aria-current={selected === 'nodes' ? 'page' : undefined}
    >
      <Popover.Button
        className={classNames(
          selected === 'nodes'
            ? 'bg-purple-700 text-white dark:bg-purple-500'
            : 'text-white hover:bg-purple-500 hover:bg-opacity-75 dark:hover:bg-purple-400',
          'rounded-md px-3 py-2 text-sm font-semibold inline-flex items-center gap-x-1 leading-6'
        )}
      >
        <Link to="/">Nodes</Link>
      </Popover.Button>
    </Popover>
  )

  const renderUtilsPopover = () => (
    <Popover
      className="relative"
      aria-current={selected.startsWith('utils') ? 'page' : undefined}
    >
      <Popover.Button
        className={classNames(
          selected.startsWith('utils')
            ? 'bg-purple-700 text-white dark:bg-purple-500'
            : 'text-white hover:bg-purple-500 hover:bg-opacity-75 dark:hover:bg-purple-400',
          'rounded-md px-3 py-2 text-sm font-semibold inline-flex items-center gap-x-1 leading-6'
        )}
      >
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
                <div
                  key={item.name}
                  className={classNames(
                    item.href.slice(1) === selected
                      ? 'bg-gray-50 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-600',
                    'relative rounded-lg p-4'
                  )}
                >
                  <Link
                    to={item.href}
                    className="font-semibold text-gray-900 dark:text-gray-200"
                  >
                    {item.name}
                    <span className="absolute inset-0" />
                  </Link>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Popover.Panel>
      </Transition>
    </Popover>
  )

  const renderViewsPopover = () => (
    <Popover
      className="relative"
      aria-current={selected.startsWith('views') ? 'page' : undefined}
    >
      <Popover.Button
        className={classNames(
          selected.startsWith('views')
            ? 'bg-purple-700 text-white dark:bg-purple-500'
            : 'text-white hover:bg-purple-500 hover:bg-opacity-75 dark:hover:bg-purple-400',
          'rounded-md px-3 py-2 text-sm font-semibold inline-flex items-center gap-x-1 leading-6'
        )}
      >
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
                <div
                  key={item.name}
                  className={classNames(
                    item.href.slice(1) === selected
                      ? 'bg-gray-50 dark:bg-gray-700'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-600',
                    'relative rounded-lg p-4'
                  )}
                >
                  <Link
                    to={item.href}
                    className="font-semibold text-gray-900 dark:text-gray-200"
                  >
                    {item.name}
                    <span className="absolute inset-0" />
                  </Link>
                  <p className="mt-1 text-gray-600 dark:text-gray-400">
                    {item.description}
                  </p>
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
                        <XMarkIcon
                          className="block h-6 w-6"
                          aria-hidden="true"
                        />
                      ) : (
                        <Bars3Icon
                          className="block h-6 w-6"
                          aria-hidden="true"
                        />
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
            {env ? null : <EnvironmentSelector />}
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
