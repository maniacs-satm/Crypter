const {app, ipcMain, BrowserWindow} = require('electron')
const {CRYPTO, VIEWS, SETTINGS, ERRORS} = require('../config')
const logger = require('winston')
const fs = require('fs-extra')
const _ = require('lodash')

exports.window = function (global, callback) {
  // creates a new BrowserWindow
  let win = new BrowserWindow({
    width: 600,
    height: 450,
    center: true,
    show: true,
    titleBarStyle: 'hidden-inset',
    resizable: false,
    maximizable: false,
    movable: true
  })

  let webContents = win.webContents
  // loads settings.html view into the BrowserWindow
  win.loadURL(VIEWS.SETTINGS)

  ipcMain.on('export', (event, dir) => {
    logger.verbose(`SETTINGS: export event emitted, got ${dir}`)
    const file = `${dir}/${CRYPTO.MASTERPASS_CREDS_FILE}`
    fs.outputJson(file, global.creds, function (err) {
      if (err) {
        logger.error(err)
        webContents.send('exportResult', err.message)
      } else {
        // Successfully exported
        webContents.send('exportResult', null)
      }
    })
  })

  ipcMain.on('import', (event, file) => {
    logger.verbose(`SETTINGS: import event emitted, got ${file}`)
    fs.readJson(file, global.creds, function (err, credsObj) {
      const invalidCredsErr = new Error(ERRORS.INVALID_MP_CREDS_FILE)
      if (err) {
        logger.error(err)
        webContents.send('importResult', err.message)
      } else {
        let isCredsObjProp = function (prop, index, array) {
          return credsObj.hasOwnProperty(prop)
        }
        let credsFileValid = CRYPTO.MASTERPASS_CREDS_PROPS.every(isCredsObjProp)
        logger.verbose(`SETTINGS: Got for credsFileValid ${credsFileValid}`)

        if (credsFileValid) {
          // Is valid (i.e. has required properties)
          // Save in-memory - global creds obj
          global.creds = credsObj
          // Save to fs - via global mdb
          global.mdb.saveGlobalObj('creds')
          // Successfully imported
          webContents.send('importResult', null)
          // Restart after timeout
          setTimeout(function () {
            app.emit('app:relaunch')
          }, SETTINGS.RELAUNCH_TIMEOUT);
        } else {
          webContents.send('importResult', invalidCredsErr.message)
        }

      }
    })
  })

  win.on('closed', function () {
    logger.info('win.closed event emitted for SettingsWindow')
    win = null
    callback()
  })

  return win
}
