// Modules to control application life and create native browser window
const { app, BrowserWindow, Menu, ipcMain} = require('electron')
const path = require('path')
const os = require('os')
const fs = require('fs')
const { autoUpdater } = require('electron-updater');

if (require('electron-squirrel-startup')) app.quit();

// Set to production mode (no developer tools)
process.env.NODE_ENV = 'production';

// Check if in developer mode -> show devtools
const isDev = process.env.NODE_ENV !== 'production';

// Check if is mac, then set process platform to darwin
const isMac = process.platform === 'darwin';

// Option to remove menu bar completely
// Menu.setApplicationMenu(null);

//////// Create the main window
// Global mainWindow
let mainWindow;

function createMainWindow () {
  // Create the browser window.
    mainWindow = new BrowserWindow({
        title: 'Endeavor GCSI Procedure Room Recording System',
        show: false,  // Don't show the window until it's ready
        // width: isDev ? 1500 : 800,
        // height: 600,
        
        resizable: false,
        minimizable: false,
        closable: false,
        fullscreen: true,
        icon: path.join(__dirname, 'assets/icons/linux/icon.png'), // for linux icon
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js')
        }
    })

  // Open devtools if in dev env
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, './renderer/index.html'));
}

//////// Create the directions for use window
// Keep track of whether directions window is already open or not
let directionsWindow = null; 

function createDirectionsWindow () {
  if (directionsWindow) {
    // If directions window is already open, don't open another one
    directionsWindow.focus();
    return;
  }

  // Create the browser window
  directionsWindow = new BrowserWindow({
    title: 'Endeavor GCSI Procedure Room Recording System Directions for Use',
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'assets', 'icons', 
      process.platform === 'win32' ? 'icon.ico' :
      process.platform === 'darwin' ? 'icon.icns' : 
      'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    },

    // Hide the menu bar for the directions window
    autoHideMenuBar: true 

  });
  
  // Load the index.html of the app.
  directionsWindow.loadFile(path.join(__dirname, './renderer/directions.html'));

}

// App is ready
app.whenReady().then(() => {
  
  autoUpdater.checkForUpdatesAndNotify();

  createMainWindow();

  // Maximized the main window when opening
  mainWindow.maximize();

  // Implement menu from menu template
  const mainMenu = Menu.buildFromTemplate(menu);
  Menu.setApplicationMenu(mainMenu);
  mainWindow.setMenuBarVisibility(true);

  // Remove mainWindows from memory on close
  mainWindow.on('closed', () => (mainWindow = null));

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

// Menu template
const menu =[
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: 'Directions for Use',
                click: createDirectionsWindow,
            }
        ]
    }] : []),
    // {
    // role: 'fileMenu',
    // },
    ...(!isMac ? [{
        label: 'Help',
        submenu: [
            {
            label: 'Directions for Use',
            click: createDirectionsWindow,
            }
        ]
    }] : []),
];

//  Respond to ipcRenderer save-video
ipcMain.on('save-video', (e, options) => {
  const{studentName, facilitatorName, date,  procedureDescription, buffer} = options;
  const saveFolderPath = path.join('C:', 'Procedure Room Recordings');

  // Ensure the save folder exists
  if (!fs.existsSync(saveFolderPath)) {
    fs.mkdirSync(saveFolderPath,  { recursive: true });
  } 

  // Create a unique filename and file path based on the provided data
  const safeDate = date.replace(/[:\/\\]/g, '_');
  const videoFileName = `${studentName} (Dr. ${facilitatorName}, ${safeDate}, ${procedureDescription}).mp4`;
  // const videoFileName = `${studentName} (Dr ${facilitatorName}, ${date}, ${procedureDescription}).mp4`;
  const videoFilePath = path.join(saveFolderPath, videoFileName);

  // Move or copy the video to the new location
  fs.writeFile(videoFilePath, buffer, (err) => {
    if (err) {
        console.error('Error saving video:', err);
    } else {
        console.log('Video saved successfully at:', videoFilePath);
        // Send success to recording.js
        e.sender.send('video-saved');
    }
  });
});

// Respond to ipcRenderer show start page (return window to original index.html when finished recording)
ipcMain.on('reload-to-start', () => {
  if (mainWindow) {
    mainWindow.loadFile(path.join(__dirname, './renderer/index.html'))
      .then(() => {
        
        // Blur and refocus to reset the window state
        mainWindow.blur();
        setTimeout(() => {
          mainWindow.focus();
          mainWindow.webContents.focus();
        }, 1);
      });
  }
});

// When all of the application windows are closed, check if on mac, if not on mac then we will terminate process manually with this code
app.on('window-all-closed', function () {
  if (!isMac) app.quit()
});