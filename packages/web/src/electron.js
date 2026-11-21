const fs = require('fs')
const path = require('path')
const { Readable } = require('stream')
const { pipeline } = require('stream/promises')
const url = require('url')
const util = require('util')
const stat = util.promisify(fs.stat)

const {
  app,
  protocol,
  BrowserWindow,
  ipcMain,
  Menu,
  session,
  shell,
  globalShortcut
} = require('electron')
const logger = require('electron-log')
const { autoUpdater } = require('electron-updater')
const semver = require('semver')
const tar = require('tar')

const POLL_FOR_WEB_UPDATES_INTERVAL_MS = 60_000

const Environment = Object.freeze({
  PRODUCTION: 0,
  LOCALHOST: 1
})

const args = process.argv.slice(2)
const appVersion = require('../package.json').version

const appDataPath = (relativePath) => {
  return path.resolve(app.getPath('appData'), app.getName(), relativePath)
}

let appEnvironment, buildName, localhostPort, mainWindow, s3Bucket, scheme

let env = null
if (args.length > 0) env = args[0]
if (!env) {
  const configFile = path.resolve(app.getAppPath(), 'electronConfig.json')
  try {
    const data = fs.readFileSync(configFile)
    const config = JSON.parse(data)
    env = config.env
  } catch (e) {
    console.error('Unable to parse config file electronConfig.json', e)
  }
}

switch (env) {
  case 'localhost':
    appEnvironment = Environment.LOCALHOST
    localhostPort = args[1] || '3000'
    scheme = 'audius-localhost'
    buildName = 'build'
    s3Bucket = ''
    break
  case 'production':
    appEnvironment = Environment.PRODUCTION
    scheme = 'audius'
    buildName = 'build-production'
    s3Bucket = 'audius.co'
    break
  default:
    appEnvironment = ''
    scheme = ''
    buildName = 'build'
    s3Bucket = 'audius.co'
    break
}

protocol.registerSchemesAsPrivileged([
  {
    scheme,
    privileges: { standard: true, secure: true, supportFetchAPI: true }
  }
])

const getPath = async (p) => {
  try {
    const result = await stat(p)

    if (result.isFile()) {
      return p
    }

    return getPath(path.join(p, 'index.html'))
  } catch (err) {}
}

const reformatURL = (url) => {
  if (!url) return `${scheme}://-`
  let path = url.replace(`${scheme}://`, '').replace(`${scheme}:`, '')
  if (path === '--updated') {
    path = ''
  }
  return `${scheme}://-/${path}`
}

const registerBuild = (directory) => {
  const handler = async (request, cb) => {
    const indexPath = path.join(directory, 'index.html')
    const filePath = path.join(directory, new url.URL(request.url).pathname)

    const cbArgs = { path: (await getPath(filePath)) || indexPath }
    cb(cbArgs)
  }

  session.defaultSession.protocol.unregisterProtocol(scheme)
  session.defaultSession.protocol.registerFileProtocol(
    scheme,
    handler,
    (err) => {
      if (err) console.error(err)
    }
  )
}

const getNewestBuildDirectory = () => {
  const buildDirectory = path.resolve(app.getAppPath(), buildName)
  const updateBuildDirectory = appDataPath(buildName)
  try {
    const updatePackageJsonPath = appDataPath(`${buildName}/package.json`)
    const updatePackageJson = JSON.parse(fs.readFileSync(updatePackageJsonPath))
    const updateVersion = updatePackageJson.version
    if (semver.gt(updateVersion, appVersion)) {
      return updateBuildDirectory
    }
  } catch (e) {
    // do nothing
  }
  return buildDirectory
}

const downloadWebUpdateAndNotify = async (newVersion) => {
  const newBuildPath = appDataPath(`${buildName}.tar.gz`)
  const webUpdateDir = appDataPath('web-update')

  const data = await fetch(
    `https://s3.us-west-1.amazonaws.com/${s3Bucket}/${buildName}.tar.gz`
  )
  if (!data.ok || !data.body) {
    logger.error(`Failed to download web update: ${data.status}`)
    return
  }
  await pipeline(
    Readable.fromWeb(data.body),
    fs.createWriteStream(newBuildPath)
  )

  if (!fs.existsSync(webUpdateDir)) fs.mkdirSync(webUpdateDir)
  tar.x({
    cwd: webUpdateDir,
    file: newBuildPath
  })

  mainWindow.webContents.send('webUpdateAvailable', {
    version: newVersion,
    currentVersion: appVersion
  })
}

const checkForWebUpdate = () => {
  const webUpdateInterval = setInterval(async () => {
    const data = await fetch(
      `https://s3.us-west-1.amazonaws.com/${s3Bucket}/package.json`
    )
    const packageJson = JSON.parse(await data.text())
    const newVersion = packageJson.version

    let currentVersion = appVersion

    const packageJsonPath = appDataPath(`${buildName}/package.json`)

    if (fs.existsSync(packageJsonPath)) {
      const buildPackageJson = JSON.parse(fs.readFileSync(packageJsonPath))
      if (semver.gt(buildPackageJson.version, currentVersion)) {
        currentVersion = buildPackageJson.version
      }
    }

    if (
      semver.major(currentVersion) === semver.major(newVersion) &&
      semver.minor(currentVersion) === semver.minor(newVersion) &&
      semver.patch(currentVersion) < semver.patch(newVersion)
    ) {
      clearInterval(webUpdateInterval)
      downloadWebUpdateAndNotify(newVersion)
    }
  }, POLL_FOR_WEB_UPDATES_INTERVAL_MS)
}

const initAutoUpdater = () => {
  autoUpdater.checkForUpdates()
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = logger
  autoUpdater.logger.transports.file.level = 'info'
}

let deepLinkedURL
const createWindow = () => {
  const config = {
    width: 1920,
    height: 1080,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  }

  mainWindow = new BrowserWindow(config)

  if (process.platform === 'win32') {
    mainWindow.setMenuBarVisibility(false)
  }

  if (appEnvironment === Environment.LOCALHOST) {
    mainWindow.loadURL(`http://localhost:${localhostPort}`)
  } else {
    const buildDir = getNewestBuildDirectory()
    registerBuild(buildDir)
    checkForWebUpdate()

    if (process.platform === 'win32') {
      const url = process.argv.slice(1)[0]
      deepLinkedURL = reformatURL(url)
    }

    if (deepLinkedURL) {
      mainWindow.loadURL(deepLinkedURL)
    } else {
      mainWindow.loadURL(`${scheme}://-`)
    }
  }

  mainWindow.on('close', (e) => {
    mainWindow.webContents.send('close')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.on('new-window', (e, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    initAutoUpdater()
  })
  mainWindow.webContents.on('did-fail-load', () => {
    initAutoUpdater()
  })

  let devToolsOpen = false
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.meta && input.alt && input.code === 'KeyI') {
      if (devToolsOpen) {
        mainWindow.webContents.closeDevTools()
        devToolsOpen = false
      } else {
        mainWindow.webContents.openDevTools()
        devToolsOpen = true
      }
      event.preventDefault()
    }
  })
}

const lock = app.requestSingleInstanceLock()
if (!lock) {
  app.quit()
} else {
  app.on('second-instance', (event, argv, workingDirectory) => {
    if (process.platform === 'win32') {
      const url = argv.slice(1)[0]
      deepLinkedURL = reformatURL(url)
    }

    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
      mainWindow.loadURL(deepLinkedURL)
    }
  })
}

const initMenu = () => {
  const template = [
    {
      label: 'Application',
      submenu: [
        {
          label: 'About Application',
          selector: 'orderFrontStandardAboutPanel:'
        },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { type: 'separator' },
        { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
        { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
        { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          selector: 'selectAll:'
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow.reload()
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    }
  ]

  if (appEnvironment === Environment.LOCALHOST) {
    template.push({
      label: 'Debug',
      submenu: [
        {
          label: 'DevTools',
          accelerator: 'CmdOrCtrl+Option+I',
          click: () => mainWindow.webContents.openDevTools()
        }
      ]
    })
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function configureShortcuts() {
  // Register global shortcuts here. Global shortcuts are fired even
  // when electron is in the background.
  // For example:
  // globalShortcut.register('CmdOrCtrl+Option+I', () => {
  //   if (mainWindow.isFocused()) {
  //     mainWindow.webContents.openDevTools()
  //   }
  // })
}

let canUpdate = false

ipcMain.on('update', async (event, arg) => {
  // eslint-disable-next-line
  while (!canUpdate) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  autoUpdater.quitAndInstall()
})

ipcMain.on('web-update', async (event, arg) => {
  const buildPath = appDataPath(`web-update/packages/web/${buildName}`)
  if (fs.existsSync(buildPath)) {
    try {
      fs.rmdirSync(appDataPath(buildName), {
        recursive: true,
        force: true
      })

      fs.renameSync(buildPath, appDataPath(buildName))

      fs.rmdirSync(appDataPath('web-update'), {
        recursive: true,
        force: true
      })

      registerBuild(appDataPath(buildName))
    } catch (error) {
      console.error(error)
    }
  }

  mainWindow.reload()
  checkForWebUpdate()
})

ipcMain.on('quit', (event, arg) => {
  app.exit(0)
})

autoUpdater.on('update-downloaded', (info) => {
  console.info('update-downloaded', info)
  canUpdate = true
  info.currentVersion = autoUpdater.currentVersion.version
  if (mainWindow) mainWindow.webContents.send('updateDownloaded', info)
})

autoUpdater.on('update-available', (info) => {
  console.info('update-available', info)
  info.currentVersion = autoUpdater.currentVersion.version
  if (mainWindow) mainWindow.webContents.send('updateAvailable', info)
})

autoUpdater.on('download-progress', (info) => {
  if (mainWindow) mainWindow.webContents.send('updateDownloadProgress', info)
})

autoUpdater.on('error', (info) => {
  console.info('update-error', info)
  if (mainWindow) mainWindow.webContents.send('updateError', info)
})

app.setAsDefaultProtocolClient(scheme)

app.on('ready', () => {
  createWindow()
  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null)
  } else {
    initMenu()
  }
  configureShortcuts()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow()
  }
})

app.on('open-url', (event, url) => {
  event.preventDefault()
  deepLinkedURL = reformatURL(url)
  if (mainWindow) {
    mainWindow.loadURL(deepLinkedURL)
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
