const fs = require('fs')
const path = require('path')
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
const fetch = require('node-fetch')
const semver = require('semver')
const tar = require('tar')

const POLL_FOR_WEB_UPDATES_INTERVAL_MS = 60_000 // 1 min

const Environment = Object.freeze({
  PRODUCTION: 0,
  LOCALHOST: 1
})

const args = process.argv.slice(2)
const appVersion = require('../package.json').version

const appDataPath = (relativePath) => {
  return path.resolve(app.getPath('appData'), app.getName(), relativePath)
}

let appEnvironment,
  buildName,
  localhostPort,
  // The main app window
  mainWindow,
  s3Bucket,
  scheme

// Try getting the env from the program args if available.
// Otherwise, try getting env from the electronConfig file.
let env = null
if (args.length > 0) env = args[0]
if (!env) {
  const configFile = path.resolve(app.getAppPath(), 'electronConfig.json')
  try {
    // Needs to be readFileSync because async js here will take
    // too long, leading the scheme to be decided after the app has
    // registered the scheme.
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

// The protocol scheme determines what URLs resolve to the app.
// For example, the URL audius:// will trigger the application to open.
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

/**
 * Transforms a url audius://route to audius://-/route so that it is
 * properly loaded from the filesystem.
 */
const reformatURL = (url) => {
  if (!url) return `${scheme}://-`
  let path = url.replace(`${scheme}://`, '').replace(`${scheme}:`, '')
  if (path === '--updated') {
    // This was a deeplink after an "update." We could build some nice
    // "Thank you for updating feature," but for now, just omit it
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
  const fileStream = fs.createWriteStream(newBuildPath)

  // Fetch the build tar.gz file and write to file
  const data = await fetch(
    `https://s3.us-west-1.amazonaws.com/${s3Bucket}/${buildName}.tar.gz`
  )
  await new Promise((resolve, reject) => {
    data.body.pipe(fileStream)
    data.body.on('error', reject)
    fileStream.on('finish', resolve)
  })

  // Create web-update directory and untar the build inside
  if (!fs.existsSync(webUpdateDir)) fs.mkdirSync(webUpdateDir)
  tar.x({
    cwd: webUpdateDir,
    file: newBuildPath
  })

  // Notify the user of the update
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

    // Additional check for the version from the build package.json
    // Needed after web updates because the local package.json version is not updated
    if (fs.existsSync(packageJsonPath)) {
      const buildPackageJson = JSON.parse(fs.readFileSync(packageJsonPath))
      if (semver.gt(buildPackageJson.version, currentVersion)) {
        currentVersion = buildPackageJson.version
      }
    }

    // If there is a patch version update, download it and notify the user
    // Minor version updates should be handled by the autoupdater
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

/**
 * Initializes the auto-updater. Updater flows as follows:
 *
 * A. If the app renders
 *    1. Check for updates
 *    2. Notify the app on
 *       i) There is an update available (not downloaded) 'updateAvailable'
 *      ii) We just downloaded an update 'updateDownloaded'
 *     iii) There is any progress on an udpate download 'updateDownloadProgress'
 *    3. Install update on quit
 *
 * B. If the app fails to render
 *    1. Check for updates
 *    2. Install update on quit
 */
const initAutoUpdater = () => {
  autoUpdater.checkForUpdates()
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = logger
  autoUpdater.logger.transports.file.level = 'info'
}

// Set if the app is opened up via a deep link (e.g. audius://handle in the web browser)
let deepLinkedURL
const createWindow = () => {
  const config = {
    width: 1920,
    height: 1080,
    minWidth: 800,
    minHeight: 600,
    // Use different title bar style based on platform
    titleBarStyle: process.platform === 'darwin' ? 'hidden' : 'default',
    // Enable frame on Windows, hidden on macOS
    frame: process.platform !== 'darwin',
    webPreferences: {
      nodeIntegration: true,
      // TODO: Look into a way to turn on contextIsolation (it is safer),
      // but window.require('electron').ipcRenderer will not work from the client
      // as is. This was changed to `true` default in electron v12.
      // https://github.com/electron/electron/issues/9920
      contextIsolation: false
    }
  }

  // Create the browser window.
  mainWindow = new BrowserWindow(config)

  // Hide menu only on Windows, keeping the window controls
  if (process.platform === 'win32') {
    mainWindow.setMenuBarVisibility(false)
  }

  if (appEnvironment === Environment.LOCALHOST) {
    mainWindow.loadURL(`http://localhost:${localhostPort}`)
  } else {
    const buildDir = getNewestBuildDirectory()
    registerBuild(buildDir)
    checkForWebUpdate()

    // Win protocol handler
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

  // Initialize auto updater regardless of success or failure
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

// Acquire a lock for Windows so the app only launches once.
// See https://stackoverflow.com/questions/43912119/open-app-and-pass-parameters-with-deep-linking-using-electron-macos
const lock = app.requestSingleInstanceLock()
if (!lock) {
  app.quit()
} else {
  // Win protocol handler
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
  // Create the Application's main menu
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

/* IPC Handlers */
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
      // Remove the existing build
      fs.rmdirSync(appDataPath(buildName), {
        recursive: true,
        force: true
      })

      // Rename web-update dir and move to base folder
      fs.renameSync(buildPath, appDataPath(buildName))

      // Remove the web-update dir
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

// We have finished downloading the electron update
autoUpdater.on('update-downloaded', (info) => {
  console.info('update-downloaded', info)
  canUpdate = true
  info.currentVersion = autoUpdater.currentVersion.version
  if (mainWindow) mainWindow.webContents.send('updateDownloaded', info)
})

// We have discovered that there is an available electron update
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

/* App Event Handlers */
app.setAsDefaultProtocolClient(scheme)

app.on('ready', () => {
  createWindow()
  // Do not init the menu on windows because it only gets in the way of the app.
  // We can re-enable this when we fix the close/maximize/etc buttons on windows
  // with our own Audius style. Frame:hidden on the browser window config should be used
  // then.
  if (process.platform === 'win32') {
    Menu.setApplicationMenu(null)
  } else {
    initMenu()
  }
  // Configure electron-level global keyboard shortcuts
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

// OSX protocol handler
app.on('open-url', (event, url) => {
  event.preventDefault()
  deepLinkedURL = reformatURL(url)
  // The app is already open, just redirect
  if (mainWindow) {
    mainWindow.loadURL(deepLinkedURL)
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
