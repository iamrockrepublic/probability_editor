const { app, BrowserWindow } = require('electron')
const path = require('path');

let win;
let quitting = false;

const createWindow = () => {
    win = new BrowserWindow({
      width: 1200,
      height: 900,
      webPreferences: {
        nodeIntegration: false, // 禁用 Node.js 集成
        contextIsolation: true, // 启用上下文隔离
        // preload: path.join(__dirname, 'preload.js') // 加载 preload 文件
        }
    })
  
    win.loadFile('index.html')
  }

  app.whenReady().then(() => {
    createWindow();
    win.on('close', (e) => {
        if (quitting) {
            return;
        }
        e.preventDefault();
        win.hide();
    });
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          createWindow()
        }else {
            win.show();
        }
      });
    // win.webContents.openDevTools();
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', ()=> quitting = true);