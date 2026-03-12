const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const dotenv = require('dotenv');

// Load environment variables based on NODE_ENV
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
const envFile = isDev ? '.env.local' : '.env.production';
dotenv.config({ path: path.join(__dirname, '..', envFile) });
dotenv.config({ path: path.join(__dirname, '..', '.env') }); // Fallback to .env

// Auto-updater configuration
const UPDATE_SERVER_URL = 'https://vokrug-sveta.shar-os.ru/updates';
autoUpdater.setFeedURL({
  provider: 'generic',
  url: UPDATE_SERVER_URL
});

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

autoUpdater.on('error', (error) => {
  console.error('Auto-updater error:', error);
});

autoUpdater.on('checking-for-update', () => {
  console.log('Checking for updates...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
  // Автоматически загружаем обновление
  autoUpdater.downloadUpdate();
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  console.log(`Download progress: ${progressObj.percent}%`);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  // Обновление будет установлено при выходе из приложения
});

const DEFAULT_REMOTE_URL = 'https://vokrug-sveta.shar-os.ru';

function resolveRemoteUrl() {
  return process.env.REMOTE_WEB_URL || process.env.ELECTRON_REMOTE_WEB_URL || DEFAULT_REMOTE_URL;
}

function getLogoDataUrl() {
  try {
    const logoPath = path.resolve(__dirname, '../../../../Group 6.png');
    const fileBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${fileBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Failed to load logo:', error);
    return 'https://vokrug-sveta.shar-os.ru/favicon.png';
  }
}

function registerWindowControls(mainWindow) {
  ipcMain.removeHandler('window:minimize');
  ipcMain.removeHandler('window:toggle-maximize');
  ipcMain.removeHandler('window:close');
  ipcMain.removeHandler('window:is-maximized');
  ipcMain.removeHandler('window:open-external');

  ipcMain.handle('window:minimize', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.minimize();
    }
  });

  ipcMain.handle('window:toggle-maximize', () => {
    if (mainWindow.isDestroyed()) return false;

    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    }

    mainWindow.maximize();
    return true;
  });

  ipcMain.handle('window:close', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

  ipcMain.handle('window:is-maximized', () => {
    if (mainWindow.isDestroyed()) return false;
    return mainWindow.isMaximized();
  });

  ipcMain.handle('window:open-external', (_, url) => {
    if (typeof url === 'string' && url.trim()) {
      return shell.openExternal(url);
    }

    return shell.openExternal(resolveRemoteUrl());
  });

  ipcMain.handle('window:reload', () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.reload();
    }
  });

  ipcMain.handle('window:zoom-in', () => {
    if (!mainWindow.isDestroyed()) {
      const currentZoom = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.min(currentZoom + 0.1, 3.0));
      return mainWindow.webContents.getZoomFactor();
    }
    return 1.0;
  });

  ipcMain.handle('window:zoom-out', () => {
    if (!mainWindow.isDestroyed()) {
      const currentZoom = mainWindow.webContents.getZoomFactor();
      mainWindow.webContents.setZoomFactor(Math.max(currentZoom - 0.1, 0.5));
      return mainWindow.webContents.getZoomFactor();
    }
    return 1.0;
  });

  ipcMain.handle('window:set-zoom', (_, zoomFactor) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.setZoomFactor(Math.max(0.5, Math.min(zoomFactor, 3.0)));
      return mainWindow.webContents.getZoomFactor();
    }
    return 1.0;
  });

  ipcMain.handle('window:get-zoom', () => {
    if (!mainWindow.isDestroyed()) {
      return mainWindow.webContents.getZoomFactor();
    }
    return 1.0;
  });
}

// Notification system
let activeNotifications = [];
let mainWindowRef = null;

function createNotificationWindow(data, mainWindow) {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const notificationWidth = 360;
  const notificationHeight = 100;
  const margin = 16;
  
  // Вычисляем позицию (правый нижний угол с учетом других уведомлений)
  const baseX = screenWidth - notificationWidth - margin;
  const baseY = screenHeight - notificationHeight - margin;
  
  // Смещаем вверх, если есть другие уведомления
  const offsetY = activeNotifications.length * (notificationHeight + 12);
  const yPosition = baseY - offsetY;

  const notificationWindow = new BrowserWindow({
    width: notificationWidth,
    height: notificationHeight,
    x: baseX,
    y: yPosition,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    focusable: false,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  notificationWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  notificationWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  notificationWindow.loadFile(path.join(__dirname, 'notification.html'));

  notificationWindow.once('ready-to-show', () => {
    notificationWindow.show();
    notificationWindow.webContents.send('notification-data', data);
  });

  // Обработка клика по уведомлению
  ipcMain.once('notification-click', (event, clickData) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      
      // Отправляем событие в основное окно для открытия чата
      if (clickData && clickData.chatId) {
        mainWindow.webContents.send('open-chat', clickData.chatId);
      }
    }
    closeNotification(notificationWindow);
  });

  // Обработка закрытия уведомления
  ipcMain.once('notification-close', () => {
    closeNotification(notificationWindow);
  });

  // Автоматическое закрытие через 5 секунд
  setTimeout(() => {
    if (!notificationWindow.isDestroyed()) {
      closeNotification(notificationWindow);
    }
  }, 5500);

  activeNotifications.push(notificationWindow);
  
  notificationWindow.on('closed', () => {
    const index = activeNotifications.indexOf(notificationWindow);
    if (index > -1) {
      activeNotifications.splice(index, 1);
    }
    repositionNotifications();
  });

  return notificationWindow;
}

function closeNotification(notificationWindow) {
  if (notificationWindow && !notificationWindow.isDestroyed()) {
    notificationWindow.close();
  }
}

function repositionNotifications() {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  const notificationWidth = 360;
  const notificationHeight = 100;
  const margin = 16;
  
  const baseX = screenWidth - notificationWidth - margin;
  const baseY = screenHeight - notificationHeight - margin;

  activeNotifications.forEach((notification, index) => {
    if (!notification.isDestroyed()) {
      const offsetY = index * (notificationHeight + 12);
      const yPosition = baseY - offsetY;
      
      notification.setBounds({
        x: baseX,
        y: yPosition,
        width: notificationWidth,
        height: notificationHeight,
      });
    }
  });
}

// IPC handler для показа уведомлений
ipcMain.handle('show-notification', (event, data) => {
  if (mainWindowRef && !mainWindowRef.isDestroyed()) {
    createNotificationWindow(data, mainWindowRef);
  }
});

function createWindow() {
  const remoteUrl = resolveRemoteUrl();

  // Создаём сплэш-окно
  const splashWindow = new BrowserWindow({
    width: 700,
    height: 460,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    center: true,
    resizable: false,
    movable: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  // Создаём главное окно (скрытое)
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 600,
    minWidth: 350,
    minHeight: 350,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    title: 'Shar Messenger',
    show: false, // Скрываем до загрузки
    center: true,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  Menu.setApplicationMenu(null);
  registerWindowControls(mainWindow);

  // Сохраняем ссылку на главное окно для уведомлений
  mainWindowRef = mainWindow;

  const sendWindowState = () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('window:maximized-changed', mainWindow.isMaximized());
    }
  };

  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('enter-full-screen', sendWindowState);
  mainWindow.on('leave-full-screen', sendWindowState);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Перехватываем custom protocol для управления окном
    if (url.startsWith('shar://')) {
      event.preventDefault();
      const action = url.replace('shar://', '');
      
      switch (action) {
        case 'window-minimize':
          mainWindow.minimize();
          break;
        case 'window-maximize':
          if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
          } else {
            mainWindow.maximize();
          }
          break;
        case 'window-close':
          mainWindow.close();
          break;
        case 'window-zoom-in':
          const currentZoomIn = mainWindow.webContents.getZoomLevel();
          mainWindow.webContents.setZoomLevel(currentZoomIn + 0.5);
          break;
        case 'window-zoom-out':
          const currentZoomOut = mainWindow.webContents.getZoomLevel();
          mainWindow.webContents.setZoomLevel(currentZoomOut - 0.5);
          break;
      }
      return;
    }
    
    const sameOrigin = new URL(url).origin === new URL(remoteUrl).origin;
    if (!sameOrigin) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    const isReload = (input.control || input.meta) && input.key.toLowerCase() === 'r';
    const isDevTools = input.key === 'F12' || ((input.control || input.meta) && input.shift && input.key.toLowerCase() === 'i');

    if (input.type !== 'keyDown') return;

    if (isReload) {
      event.preventDefault();
      mainWindow.reload();
    }

    if (isDevTools) {
      event.preventDefault();
      mainWindow.webContents.toggleDevTools();
    }
  });

  // Инжектируем критический UI после загрузки страницы
  mainWindow.webContents.on('did-finish-load', () => {
    setTimeout(() => {
      if (!splashWindow.isDestroyed()) splashWindow.close();
      if (!mainWindow.isDestroyed() && !mainWindow.isVisible()) {
        mainWindow.show();
      }
    }, 3000);

    const logoDataUrl = getLogoDataUrl();
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const LOGO_DATA_URL = ${JSON.stringify(logoDataUrl)};
        console.log('[MAIN INJECT] Starting critical UI injection');
        
        // Создаём API для управления окном
        if (!window.sharDesktop) {
          window.sharDesktop = {
            windowControls: {
              minimize: () => {
                console.log('[Electron] Minimize window');
                window.location.href = 'shar://window-minimize';
              },
              toggleMaximize: () => {
                console.log('[Electron] Toggle maximize window');
                window.location.href = 'shar://window-maximize';
              },
              close: () => {
                console.log('[Electron] Close window');
                window.location.href = 'shar://window-close';
              },
              reload: () => {
                console.log('[Electron] Reload window');
                window.location.reload();
              },
              zoomIn: () => {
                console.log('[Electron] Zoom in');
                window.location.href = 'shar://window-zoom-in';
              },
              zoomOut: () => {
                console.log('[Electron] Zoom out');
                window.location.href = 'shar://window-zoom-out';
              }
            }
          };
        }
        
        // Проверяем не создан ли уже хедер
        if (document.getElementById('electron-emergency-header')) {
          console.log('[MAIN INJECT] Emergency header already exists');
          return;
        }

        // Подключаем шрифт Dela Gothic One
        if (!document.querySelector('link[href*="Dela+Gothic+One"]')) {
          const fontLink = document.createElement('link');
          fontLink.rel = 'stylesheet';
          fontLink.href = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap';
          document.head.appendChild(fontLink);
        }

        // Создаём аварийный хедер
        const header = document.createElement('div');
        header.id = 'electron-emergency-header';
        
        // Объявляем переменную для меню заранее
        let menuDropdown;
        
        // Функция обновления темы хедера
        const updateHeaderTheme = () => {
          const isDark = document.documentElement.classList.contains('dark') || 
                        document.documentElement.getAttribute('data-theme') === 'dark';
          
          const headerBg = isDark 
            ? 'linear-gradient(180deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05))'
            : 'rgba(255, 255, 255, 0.85)';
          
          const headerBorder = isDark 
            ? 'rgba(255, 255, 255, 0.2)'
            : 'rgba(15, 23, 42, 0.12)';
          
          const headerShadow = isDark
            ? 'inset 0 1px 1px rgba(255, 255, 255, 0.15), 0 4px 20px rgba(0, 0, 0, 0.3)'
            : 'inset 0 1px 1px rgba(255, 255, 255, 0.5), 0 2px 10px rgba(15, 23, 42, 0.08)';
          
          header.style.background = headerBg;
          header.style.borderBottom = \`1px solid \${headerBorder}\`;
          header.style.boxShadow = headerShadow;
          
          // Обновляем стиль меню dropdown
          if (menuDropdown) {
            const menuBg = isDark
              ? 'linear-gradient(135deg, rgba(26, 26, 26, 0.98), rgba(18, 18, 18, 0.98))'
              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(250, 250, 250, 0.98))';
            const menuBorder = isDark
              ? 'rgba(255, 255, 255, 0.15)'
              : 'rgba(15, 23, 42, 0.15)';
            const menuShadow = isDark
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.15)';
            
            menuDropdown.style.background = menuBg;
            menuDropdown.style.borderColor = menuBorder;
            menuDropdown.style.boxShadow = menuShadow;
          }
        };
        
        header.style.cssText = \`
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 30px !important;
          z-index: 165 !important;
          backdrop-filter: blur(20px) !important;
          -webkit-backdrop-filter: blur(20px) !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          padding: 0 12px !important;
          color: var(--text-primary) !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          -webkit-app-region: drag !important;
          box-sizing: border-box !important;          overflow: visible !important;        \`;
        
        // Применяем начальную тему
        updateHeaderTheme();
        
        // Наблюдаем за изменениями темы
        const themeObserver = new MutationObserver(() => updateHeaderTheme());
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['class', 'data-theme']
        });

        const titleWrapper = document.createElement('div');
        titleWrapper.style.cssText = 'display: flex; align-items: center; gap: 14px; pointer-events: none; margin-right: auto;';
        
        // Добавляем логотип
        const logo = document.createElement('img');
        logo.src = LOGO_DATA_URL;
        logo.alt = 'Shar OS';
        logo.style.cssText = \`
          width: 29px !important;
          height: 29px !important;
          object-fit: contain !important;
          display: block !important;
        \`;
        titleWrapper.appendChild(logo);
        
        const title = document.createElement('div');
        title.textContent = 'Шар OS';
        title.style.cssText = \`
          font-family: "Dela Gothic One", cursive !important;
          font-size: 13px !important;
          font-weight: 400 !important;
          color: var(--text-primary) !important;
          letter-spacing: -0.02em !important;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1) !important;
          transform: scaleX(1.4) !important;
        \`;
        titleWrapper.appendChild(title);

        const controls = document.createElement('div');
        controls.style.cssText = 'display: flex; gap: 6px; -webkit-app-region: no-drag; margin-left: auto; overflow: visible; position: relative; z-index: 99999999;';

        function createBtn(svg, action) {
          const btn = document.createElement('button');
          btn.innerHTML = svg;
          btn.style.cssText = \`
            width: 21px !important;
            height: 21px !important;
            border-radius: 50% !important;
            border: 1px solid var(--border-light) !important;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05)) !important;
            color: var(--text-primary) !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease !important;
            box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.2) !important;
            padding: 0 !important;
            line-height: 1 !important;
          \`;
          
          btn.onmouseenter = () => {
            if (action === 'close') {
              btn.style.background = '#dc2626 !important';
              btn.style.borderColor = '#dc2626 !important';
              btn.style.color = 'white !important';
            } else if (action === 'minimize') {
              btn.style.background = 'rgba(16, 185, 129, 0.2) !important';
              btn.style.borderColor = '#10b981 !important';
              btn.style.color = '#10b981 !important';
            } else if (action === 'maximize') {
              btn.style.background = 'rgba(245, 158, 11, 0.2) !important';
              btn.style.borderColor = '#f59e0b !important';
              btn.style.color = '#f59e0b !important';
            }
            btn.style.boxShadow = 'inset 0 1px 2px rgba(255, 255, 255, 0.25), 0 2px 8px rgba(0, 0, 0, 0.2) !important';
          };
          
          btn.onmouseleave = () => {
            btn.style.background = 'linear-gradient(135deg, rgba(255, 255, 255, 0.10), rgba(255, 255, 255, 0.05)) !important';
            btn.style.borderColor = 'var(--border-light) !important';
            btn.style.color = 'var(--text-primary) !important';
            btn.style.boxShadow = 'inset 0 1px 2px rgba(255, 255, 255, 0.2) !important';
          };
          
          btn.onclick = () => {
            if (window.sharDesktop?.windowControls) {
              if (action === 'minimize') window.sharDesktop.windowControls.minimize();
              else if (action === 'maximize') window.sharDesktop.windowControls.toggleMaximize();
              else if (action === 'close') window.sharDesktop.windowControls.close();
            }
          };
          return btn;
        }

        // Lucide-style иконки
        const minimizeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        const maximizeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
        const closeIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
        const moreIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>';
        const refreshIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>';
        const zoomInIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
        const zoomOutIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
        
        // Создаём контейнер меню
        const menuContainer = document.createElement('div');
        menuContainer.style.cssText = 'position: relative; margin-right: 8px; -webkit-app-region: no-drag; overflow: visible; z-index: 999999999;';
        
        const menuBtn = createBtn(moreIcon, null);
        menuBtn.style.marginRight = '0';
        
        menuDropdown = document.createElement('div');
        menuDropdown.style.cssText = \`
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: linear-gradient(135deg, rgba(26, 26, 26, 0.98), rgba(18, 18, 18, 0.98));
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          padding: 6px;
          display: none;
          z-index: 9999999999;
          overflow: visible;
        \`;
        
        function createMenuItem(icon, text, action) {
          const item = document.createElement('button');
          item.innerHTML = \`
            <span style="display: flex; align-items: center; justify-content: center; width: 20px; height: 20px;">\${icon}</span>
            <span>\${text}</span>
          \`;
          
          const updateMenuItemTheme = () => {
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.documentElement.getAttribute('data-theme') === 'dark';
            const textColor = isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)';
            
            item.style.cssText = \`
              width: 100%;
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 8px 12px;
              background: transparent;
              border: none;
              border-radius: 8px;
              color: \${textColor};
              font-size: 13px;
              cursor: pointer;
              transition: all 0.2s ease;
              text-align: left;
            \`;
          };
          
          updateMenuItemTheme();
          
          // Наблюдаем за изменением темы
          const observer = new MutationObserver(updateMenuItemTheme);
          observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
          
          item.onmouseenter = () => {
            const isDark = document.documentElement.classList.contains('dark') || 
                          document.documentElement.getAttribute('data-theme') === 'dark';
            item.style.background = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.08)';
          };
          
          item.onmouseleave = () => {
            item.style.background = 'transparent';
          };
          
          item.onclick = () => {
            menuDropdown.style.display = 'none';
            action();
          };
          
          return item;
        }
        
        menuDropdown.appendChild(createMenuItem(refreshIcon, 'Перезагрузить', () => {
          if (window.sharDesktop?.windowControls) {
            window.sharDesktop.windowControls.reload();
          }
        }));
        
        // Zoom control с инпутом
        const zoomControl = document.createElement('div');
        zoomControl.style.cssText = \`
          width: 100%;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        \`;
        
        const zoomLabel = document.createElement('span');
        zoomLabel.textContent = 'Масштаб:';
        zoomLabel.style.cssText = \`
          font-size: 13px;
          flex-shrink: 0;
        \`;
        
        const zoomInput = document.createElement('input');
        zoomInput.type = 'number';
        zoomInput.min = '50';
        zoomInput.max = '300';
        zoomInput.step = '10';
        zoomInput.value = '100';
        zoomInput.style.cssText = \`
          flex: 1;
          padding: 4px 8px;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.08);
          color: inherit;
          font-size: 13px;
          text-align: center;
          outline: none;
        \`;
        
        const zoomPercent = document.createElement('span');
        zoomPercent.textContent = '%';
        zoomPercent.style.cssText = \`
          font-size: 13px;
          flex-shrink: 0;
        \`;
        
        // Инициализация текущего зума
        if (window.sharDesktop?.windowControls?.getZoom) {
          window.sharDesktop.windowControls.getZoom().then(zoom => {
            zoomInput.value = Math.round(zoom * 100);
          });
        }
        
        zoomInput.addEventListener('change', () => {
          const value = parseInt(zoomInput.value, 10);
          if (isNaN(value)) {
            zoomInput.value = '100';
            return;
          }
          
          const clampedValue = Math.max(50, Math.min(300, value));
          zoomInput.value = clampedValue;
          
          if (window.sharDesktop?.windowControls?.setZoom) {
            window.sharDesktop.windowControls.setZoom(clampedValue / 100).then(actualZoom => {
              zoomInput.value = Math.round(actualZoom * 100);
            });
          }
        });
        
        zoomInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            zoomInput.blur();
          }
        });
        
        zoomControl.appendChild(zoomLabel);
        zoomControl.appendChild(zoomInput);
        zoomControl.appendChild(zoomPercent);
        menuDropdown.appendChild(zoomControl);
        
        menuBtn.onclick = () => {
          menuDropdown.style.display = menuDropdown.style.display === 'none' ? 'block' : 'none';
        };
        
        // Закрываем меню при клике вне его
        document.addEventListener('click', (e) => {
          if (!menuContainer.contains(e.target)) {
            menuDropdown.style.display = 'none';
          }
        });
        
        menuContainer.appendChild(menuBtn);
        menuContainer.appendChild(menuDropdown);
        
        controls.appendChild(createBtn(minimizeIcon, 'minimize'));
        controls.appendChild(createBtn(maximizeIcon, 'maximize'));
        controls.appendChild(createBtn(closeIcon, 'close'));

        header.appendChild(titleWrapper);
        header.appendChild(controls);
        controls.insertBefore(menuContainer, controls.firstChild);

        document.body.insertBefore(header, document.body.firstChild);

        // Добавляем data-атрибут для определения Electron окружения
        document.documentElement.setAttribute('data-electron-native', 'true');
        document.body.classList.add('electron-app');

        // Сдвигаем контент - компенсируем высоту header
        const style = document.createElement('style');
        style.id = 'electron-header-styles';
        style.textContent = \`
          :root {
            --electron-header-height: 30px;
          }
          
          /* Сдвигаем ВСЁ приложение вниз */
          body.electron-app {
            padding-top: 30px !important;
          }
          
          /* Удалён хардкод градиент */
          
          /* НЕ меняем высоту первого контейнера - пусть остается 100dvh */
          body.electron-app > div:first-child {
            height: 100dvh !important;
            max-height: 100dvh !important;
            overflow: hidden !important;
          }
          
          /* Компенсация для элементов с height: 100dvh внутри body */
          body.electron-app div[style*="height: 100dvh"],
          body.electron-app div[style*="height:100dvh"] {
            height: calc(100dvh - 30px) !important;
            max-height: calc(100dvh - 30px) !important;
          }
          
          /* Компенсация для страниц - добавляем padding-top вместо уменьшения высоты */
          body.electron-app main {
            padding-top: 0 !important;
          }
          
          /* Компенсация для полноэкранных страниц */
          body.electron-app > div:first-child > div[class*="h-screen"],
          body.electron-app > div:first-child > div[class*="min-h-screen"] {
            min-height: calc(100vh - 30px) !important;
            height: auto !important;
          }
          
          /* Компенсация для вложенных h-screen элементов (включая календарь) */
          /* НО НЕ для модальных окон и элементов с position: fixed */
          body.electron-app div.h-screen:not([style*="position: fixed"]):not([style*="position:fixed"]),
          body.electron-app div[class*=" h-screen"]:not([style*="position: fixed"]):not([style*="position:fixed"]),
          body.electron-app div[class*="h-screen "]:not([style*="position: fixed"]):not([style*="position:fixed"]) {
            height: calc(100vh - 30px) !important;
            max-height: calc(100vh - 30px) !important;
          }
          
          /* Исключаем fixed элементы полностью */
          body.electron-app div[style*="position: fixed"].h-screen,
          body.electron-app div[style*="position:fixed"].h-screen,
          body.electron-app div[style*="position: fixed"][class*="h-screen"],
          body.electron-app div[style*="position:fixed"][class*="h-screen"] {
            height: 100vh !important;
            max-height: 100vh !important;
            padding-top: 0 !important;
          }
          
          /* Отменяем компенсацию для h-screen внутри модальных окон */
          body.electron-app .fixed.inset-0 div.h-screen,
          body.electron-app .fixed.inset-0 div[class*="h-screen"],
          body.electron-app [class*="fixed"][class*="inset"] div.h-screen,
          body.electron-app [class*="fixed"][class*="inset"] div[class*="h-screen"],
          body.electron-app div[style*="position: fixed"] div.h-screen,
          body.electron-app div[style*="position:fixed"] div[class*="h-screen"] {
            height: 100vh !important;
            max-height: 100vh !important;
            padding-top: 0 !important;
          }
          
          /* Компенсация для нижнего мобильного меню */
          body.electron-app .bottom-nav-fixed {
            bottom: 0 !important;
            padding-bottom: calc(max(env(safe-area-inset-bottom), 12px)) !important;
          }
          
          /* Компенсация для десктопного нижнего меню (fixed) */
          body.electron-app [class*="fixed"][class*="bottom-0"] {
            bottom: 0 !important;
          }
        \`;
        document.head.appendChild(style);

        console.log('[MAIN INJECT] Emergency header created successfully');
      })();
    `).catch(err => {
      console.error('Failed to inject emergency UI:', err);
    });
  });

  mainWindow.loadURL(remoteUrl);
}

app.whenReady().then(() => {
  createWindow();
  
  // Проверка обновлений через 3 секунды после запуска
  setTimeout(() => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch(err => {
        console.error('Failed to check for updates:', err);
      });
    }
  }, 3000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
