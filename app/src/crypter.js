const {app, ipcMain, Menu, BrowserWindow} = require('electron')
const {VIEWS, ERRORS} = require('../config')
const crypto = require('../core/crypto')
const menuTemplate = require('./menu')
const logger = require('winston')

exports.window = function (global, callback) {
  // creates a new BrowserWindow
  let win = new BrowserWindow({
    width: 350,
    height: 440,
    center: true,
    show: true,
    titleBarStyle: 'hidden-inset',
    resizable: false,
    maximizable: false,
    movable: true
  })
  // create menu from menuTemplate
  const menu = Menu.buildFromTemplate(menuTemplate)
  // set menu
  Menu.setApplicationMenu(menu)

  let webContents = win.webContents

  // loads crypt.html view into the BrowserWindow
  win.loadURL(VIEWS.CRYPTER)

  ipcMain.on('app:open-settings', function (event) {
    logger.verbose('CRYPTER: app:open-settings emitted.')
    app.emit('app:open-settings')
  })

  // When user selects a file to encrypt in Crypter window
  ipcMain.on('cryptFile', function (event, filePath) {
    logger.verbose('IPCMAIN: cryptFile emitted. Starting encryption...')
    crypto.crypt(filePath, global.MasterPassKey.get())
      .then((file) => {
        webContents.send('cryptedFile', file)
      })
      .catch((err) => {
        logger.info(`cryptFile error`)
        logger.error(err)
        webContents.send('cryptErr', err.message)
      })
  })

  // When user selects a file to decrypt in Crypter window
  ipcMain.on('decryptFile', function (event, filePath) {
    logger.verbose('IPCMAIN: decryptFile emitted. Starting decryption...')
    crypto.decrypt(filePath, global.MasterPassKey.get())
      .then((file) => {
        logger.info('decrypted')
        webContents.send('decryptedFile', file)
      })
      .catch((err) => {
        logger.info(`decryptFile error`)
        logger.error(err)
        if (err.message == ERRORS.MS.INVALID_FILE) {
          webContents.send('cryptErr', ERRORS.INVALID_FILE)
        } else if (err.message == ERRORS.MS.AUTH_FAIL) {
          webContents.send('cryptErr', ERRORS.AUTH_FAIL)
        } else {
          webContents.send('cryptErr', err.message)
        }
      })
  })

  win.on('closed', function () {
    logger.info('win.closed event emitted for PromptWindow')
    win = null
    callback()
  })

  return win
}