const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');

function getLogoDataUrl() {
  const logoCandidates = [
    path.join(__dirname, 'icon.png'),
    path.resolve(__dirname, '../../../../Group 8.png'),
  ];

  for (const logoPath of logoCandidates) {
    try {
      if (!fs.existsSync(logoPath)) continue;
      const fileBuffer = fs.readFileSync(logoPath);
      return `data:image/png;base64,${fileBuffer.toString('base64')}`;
    } catch {
      // ignore and try next candidate
    }
  }

  return '/favicon.png';
}

const logoSrc = getLogoDataUrl();
const HEADER_ID = 'shar-electron-telegram-header';

let _appVersion = 'unknown';
try { _appVersion = require('../package.json').version; } catch {}

const CONTENT_ATTR = 'data-electron-content-root';
const CONTENT_OFFSET_ATTR = 'data-electron-header-offset';
const HEADER_HEIGHT = 46;

const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  reload: () => ipcRenderer.invoke('window:reload'),
  zoomIn: () => ipcRenderer.invoke('window:zoom-in'),
  zoomOut: () => ipcRenderer.invoke('window:zoom-out'),
  setZoom: (factor) => ipcRenderer.invoke('window:set-zoom', factor),
  getZoom: () => ipcRenderer.invoke('window:get-zoom'),
  onMaximizedChanged: (callback) => {
    if (typeof callback !== 'function') return () => {};

    const handler = (_, value) => callback(Boolean(value));
    ipcRenderer.on('window:maximized-changed', handler);
    return () => ipcRenderer.removeListener('window:maximized-changed', handler);
  },
};

contextBridge.exposeInMainWorld('sharDesktop', {
  platform: process.platform,
  appVersion: _appVersion,
  assets: {
    logoSrc,
  },
  openExternal: (url) => ipcRenderer.invoke('window:open-external', url),
  windowControls,
  showNotification: (data) => ipcRenderer.invoke('show-notification', data),
  onOpenChat: (callback) => {
    const handler = (_, chatId) => callback(chatId);
    ipcRenderer.on('open-chat', handler);
    return () => ipcRenderer.removeListener('open-chat', handler);
  },
  onOpenRoute: (callback) => {
    const handler = (_, url) => callback(url);
    ipcRenderer.on('open-route', handler);
    return () => ipcRenderer.removeListener('open-route', handler);
  },

  // ── Call window API ──────────────────────────────────────
  call: {
    // Open a call window. data: { callerName, callerInitials, callerAvatar?, callType: 'audio'|'video', direction: 'incoming'|'outgoing' }
    open: (data) => ipcRenderer.invoke('call:open', data),
    // Send island actions: 'answer' | 'reject' | 'hangup' | 'restore'
    islandAction: (action) => ipcRenderer.send('call:island-action', action),
    // Listen for call state updates → show/update island
    onIslandUpdate: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('call:island-update', handler);
      return () => ipcRenderer.removeListener('call:island-update', handler);
    },
    // Listen for actions from call window (answer, hangup, mute, etc.)
    onAction: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('call:action-from-main', handler);
      return () => ipcRenderer.removeListener('call:action-from-main', handler);
    },
    // Notify call window of state changes: 'connected' | 'idle'
    updateState: (state) => ipcRenderer.send('call:update-state', state),
  },

  // ── Auto-updater API ─────────────────────────────────────
  updater: {
    // callback({ state: 'downloading'|'downloaded', version?, percent? })
    onStatus: (callback) => {
      const handler = (_, data) => callback(data);
      ipcRenderer.on('updater:status', handler);
      return () => ipcRenderer.removeListener('updater:status', handler);
    },
    install: () => ipcRenderer.invoke('updater:install'),
  },

  // ── Photo preview API ────────────────────────────────────
  photo: {
    // Open photo preview. url: current image URL, urls: all URLs in the group, names: optional filename list
    open: (url, urls, names) => {
      // Convert relative URLs to absolute so photo.html (file:// page) can load them
      const toAbs = (u) => {
        if (u && typeof u === 'string' && !u.startsWith('http') && !u.startsWith('data:') && !u.startsWith('file:') && !u.startsWith('blob:')) {
          return window.location.origin + (u.startsWith('/') ? u : '/' + u);
        }
        return u;
      };
      return ipcRenderer.invoke('photo:open', {
        url: toAbs(url),
        urls: (urls || [url]).map(toAbs),
        names: names || [],
      });
    },
  },
});

if (process.versions && process.versions.electron) {
  try {
    class ElectronBlockedNotification {
      static permission = 'denied';
      static requestPermission() {
        return Promise.resolve('denied');
      }
      constructor() {
        throw new Error('Browser Notification API disabled in Electron. Use window.sharDesktop.showNotification');
      }
      close() {
        // no-op
      }
    }

    Object.defineProperty(window, 'Notification', {
      configurable: true,
      writable: true,
      value: ElectronBlockedNotification,
    });
  } catch (error) {
    console.warn('[ELECTRON] Failed to disable browser Notification API:', error);
  }
}

function getRouteTitle(pathname) {
  const routeTitles = [
    [/^\/messages/, 'Чаты'],
    [/^\/todos/, 'Задачи'],
    [/^\/calendar/, 'Календарь'],
    [/^\/contacts/, 'Контакты'],
    [/^\/links/, 'Ссылки'],
    [/^\/content-plan/, 'Контент-план'],
    [/^\/utm-generator/, 'Генератор UTM'],
    [/^\/slovolov-pro/, 'Словолов PRO'],
    [/^\/slovolov/, 'Словолов'],
    [/^\/feed-editor/, 'Редактор фидов'],
    [/^\/transliterator/, 'Транслитератор'],
    [/^\/settings/, 'Настройки'],
    [/^\/account/, 'Аккаунт'],
    [/^\/admin/, 'Админка'],
    [/^\/$/, 'Shar OS'],
  ];

  for (const [pattern, title] of routeTitles) {
    if (pattern.test(pathname)) {
      return title;
    }
  }

  const lastSegment = pathname.split('/').filter(Boolean).pop();
  if (!lastSegment) return 'Shar OS';

  return lastSegment
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function maximizeIcon(isMaximized) {
  return isMaximized
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h10v10"></path><path d="M16 8h4v12H8v-4"></path><path d="M4 8h12v12H4z"></path></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7z"></path></svg>';
}

function hasVisibleReactShell() {
  const shell = document.querySelector('.electron-header-pill');
  if (!(shell instanceof HTMLElement)) return false;
  const rect = shell.getBoundingClientRect();
  return rect.height >= 20 && rect.width >= 120;
}

function shouldSkipHeader() {
  const skip = hasVisibleReactShell();
  console.log('[ELECTRON HEADER] shouldSkipHeader:', skip);
  return skip;
}

function getHeaderHeight() {
  return window.innerWidth <= 700 ? 42 : HEADER_HEIGHT;
}

function setStyles(element, styles) {
  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });
}

function styleSvgIcons(scope) {
  scope.querySelectorAll('svg').forEach((icon) => {
    if (!(icon instanceof SVGElement)) return;
    icon.style.width = '16px';
    icon.style.height = '16px';
    icon.style.stroke = 'currentColor';
    icon.style.strokeWidth = '2';
    icon.style.fill = 'none';
    icon.style.strokeLinecap = 'round';
    icon.style.strokeLinejoin = 'round';
    icon.style.pointerEvents = 'none';
  });
}

function createButton({ title, className, svg, onClick }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `shar-electron-tg-btn ${className}`;
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = svg;

  setStyles(button, {
    width: window.innerWidth <= 700 ? '40px' : '46px',
    height: '100%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: isAppDarkMode() ? 'rgba(255,255,255,0.86)' : 'rgba(15,23,42,0.68)',
    background: 'transparent',
    border: '0',
    outline: 'none',
    cursor: 'pointer',
    transition: 'background 140ms ease, color 140ms ease',
    WebkitAppRegion: 'no-drag',
    padding: '0',
  });

  button.addEventListener('mouseenter', () => {
    const dark = isAppDarkMode();
    button.style.background = className.includes('close')
      ? '#e81123'
      : (dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');
    button.style.color = className.includes('close') ? '#ffffff' : (dark ? '#ffffff' : 'rgba(15,23,42,0.9)');
  });

  button.addEventListener('mouseleave', () => {
    const dark = isAppDarkMode();
    button.style.background = 'transparent';
    button.style.color = dark ? 'rgba(255,255,255,0.86)' : 'rgba(15,23,42,0.68)';
  });

  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  return button;
}

function findContentRoot() {
  const selectors = ['#__next', 'main', '#root', '[data-nextjs-scroll-focus-boundary]'];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement && element.id !== HEADER_ID) {
      return element;
    }
  }

  const candidates = Array.from(document.body?.children || []).filter((element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.id === HEADER_ID) return false;
    const tag = element.tagName.toLowerCase();
    return tag !== 'script' && tag !== 'style' && tag !== 'link';
  });

  return candidates[0] || null;
}

function markContentRoot() {
  document.querySelectorAll(`[${CONTENT_ATTR}]`).forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.getAttribute(CONTENT_OFFSET_ATTR) === 'true') {
      element.style.marginTop = '';
    }
    element.removeAttribute(CONTENT_ATTR);
    element.removeAttribute(CONTENT_OFFSET_ATTR);
  });

  const root = findContentRoot();
  if (!root) return null;

  root.setAttribute(CONTENT_ATTR, 'true');
  root.setAttribute(CONTENT_OFFSET_ATTR, 'true');
  root.style.marginTop = `${getHeaderHeight()}px`;
  return root;
}

function updateTitle() {
  const titleNode = document.querySelector(`#${HEADER_ID} .shar-electron-tg-title`);
  if (titleNode) {
    titleNode.textContent = getRouteTitle(window.location.pathname);
  }
}

function updateMaximizeButton(button, isMaximized) {
  if (!button) return;
  const title = isMaximized ? 'Восстановить' : 'Развернуть';
  button.title = title;
  button.setAttribute('aria-label', title);
  button.innerHTML = maximizeIcon(isMaximized);
  styleSvgIcons(button);
}

function isAppDarkMode() {
  return (
    document.documentElement.classList.contains('dark') ||
    document.documentElement.getAttribute('data-theme') === 'dark'
  );
}

function applyHeaderTheme(headerEl) {
  if (!headerEl) return;
  const dark = isAppDarkMode();
  if (dark) {
    headerEl.style.background = 'linear-gradient(180deg, rgba(15,20,30,0.93), rgba(18,25,35,0.91))';
    headerEl.style.borderBottom = '1px solid rgba(255,255,255,0.08)';
    headerEl.style.boxShadow = '0 1px 0 rgba(255,255,255,0.04) inset';
    headerEl.style.color = '#ffffff';
  } else {
    headerEl.style.background = 'rgba(255,255,255,0.92)';
    headerEl.style.borderBottom = '1px solid rgba(0,0,0,0.09)';
    headerEl.style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)';
    headerEl.style.color = '#0f172a';
  }
  // Buttons
  headerEl.querySelectorAll('.shar-electron-tg-btn').forEach((btn) => {
    btn.style.color = dark ? 'rgba(255,255,255,0.86)' : 'rgba(15,23,42,0.68)';
  });
  // Logo background
  const logoEl = headerEl.querySelector('.shar-electron-tg-logo');
  if (logoEl instanceof HTMLElement) {
    logoEl.style.background = dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    logoEl.style.border = dark ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.08)';
  }
  // Title
  const titleEl = headerEl.querySelector('.shar-electron-tg-title');
  if (titleEl instanceof HTMLElement) {
    titleEl.style.color = dark ? '#ffffff' : '#0f172a';
  }
  // App name
  const appNameEl = headerEl.querySelector('.shar-electron-tg-appname');
  if (appNameEl instanceof HTMLElement) {
    appNameEl.style.color = dark ? 'rgba(255,255,255,0.84)' : 'rgba(15,23,42,0.60)';
  }
}

function createHeader() {
  console.log('[ELECTRON HEADER] createHeader called');
  
  const header = document.createElement('div');
  header.id = HEADER_ID;

  const inner = document.createElement('div');
  inner.className = 'shar-electron-tg-inner';

  const left = document.createElement('div');
  left.className = 'shar-electron-tg-left';

  const logo = document.createElement('div');
  logo.className = 'shar-electron-tg-logo';
  const image = document.createElement('img');
  image.src = logoSrc;
  image.alt = 'Shar OS';
  setStyles(image, {
    width: '18px',
    height: '18px',
    objectFit: 'contain',
    display: 'block',
  });
  logo.appendChild(image);

  const appName = document.createElement('div');
  appName.className = 'shar-electron-tg-appname';
  appName.textContent = 'Шар OS';

  const title = document.createElement('div');
  title.className = 'shar-electron-tg-title';
  title.textContent = getRouteTitle(window.location.pathname);

  const controls = document.createElement('div');
  controls.className = 'shar-electron-tg-controls';

  const minimizeButton = createButton({
    title: 'Свернуть',
    className: 'minimize',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"></path></svg>',
    onClick: () => {
      console.log('[ELECTRON HEADER] Minimize clicked');
      windowControls.minimize();
    },
  });

  const maximizeButton = createButton({
    title: 'Развернуть',
    className: 'maximize',
    svg: maximizeIcon(false),
    onClick: async () => {
      console.log('[ELECTRON HEADER] Maximize clicked');
      const value = await windowControls.toggleMaximize();
      updateMaximizeButton(maximizeButton, Boolean(value));
    },
  });

  const closeButton = createButton({
    title: 'Закрыть',
    className: 'close',
    svg: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12"></path><path d="M18 6l-12 12"></path></svg>',
    onClick: () => {
      console.log('[ELECTRON HEADER] Close clicked');
      windowControls.close();
    },
  });

  const compact = window.innerWidth <= 520;
  const small = window.innerWidth <= 700;
  const height = getHeaderHeight();

  setStyles(header, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    height: `${height}px`,
    zIndex: '99999999',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitAppRegion: 'drag',
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    transition: 'background 0.2s ease, border-color 0.2s ease',
  });

  // Apply theme colors and observe future theme changes
  applyHeaderTheme(header);
  const _themeObserver = new MutationObserver(() => applyHeaderTheme(header));
  _themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  setStyles(inner, {
    position: 'relative',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: `0 ${small ? 8 : 12}px`,
    boxSizing: 'border-box',
  });

  setStyles(left, {
    display: 'flex',
    alignItems: 'center',
    gap: compact ? '0px' : '10px',
    minWidth: '0',
    maxWidth: compact ? '40px' : 'calc(50% - 88px)',
  });

  setStyles(logo, {
    width: '26px',
    height: '26px',
    borderRadius: '999px',
    overflow: 'hidden',
    flexShrink: '0',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  setStyles(appName, {
    fontSize: '13px',
    lineHeight: '1',
    color: 'rgba(255,255,255,0.84)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: compact ? 'none' : 'block',
  });

  setStyles(title, {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    maxWidth: small ? 'min(42vw, 220px)' : 'min(48vw, 420px)',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontSize: small ? '16px' : '20px',
    lineHeight: '1',
    fontWeight: '500',
    color: '#ffffff',
    pointerEvents: 'none',
  });

  setStyles(controls, {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'stretch',
    height: '100%',
    WebkitAppRegion: 'no-drag',
  });

  left.append(logo, appName);
  controls.append(minimizeButton, maximizeButton, closeButton);
  inner.append(left, title, controls);
  header.appendChild(inner);

  styleSvgIcons(header);

  windowControls.isMaximized().then((value) => {
    updateMaximizeButton(maximizeButton, Boolean(value));
  }).catch(() => {});

  return header;
}

function ensureHeader() {
  console.log('[ELECTRON HEADER] ensureHeader: body exists:', !!document.body);
  
  if (!document.body) {
    console.log('[ELECTRON HEADER] ensureHeader: no body, aborting');
    return null;
  }

  const skip = shouldSkipHeader();
  console.log('[ELECTRON HEADER] ensureHeader: shouldSkipHeader =', skip);
  
  if (skip) {
    removeHeader();
    return null;
  }

  markContentRoot();

  let header = document.getElementById(HEADER_ID);
  console.log('[ELECTRON HEADER] ensureHeader: existing header found:', !!header);
  
  if (!header) {
    header = createHeader();
    console.log('[ELECTRON HEADER] ensureHeader: created new header, prepending to body');
    document.body.prepend(header);
    console.log('[ELECTRON HEADER] ensureHeader: header prepended, checking if in DOM:', document.body.contains(header));
  }

  header.style.height = `${getHeaderHeight()}px`;
  updateTitle();
  markContentRoot();

  console.log('[ELECTRON HEADER] ensureHeader: completed, header in DOM:', !!document.getElementById(HEADER_ID));
  return header;
}

function removeHeader() {
  const header = document.getElementById(HEADER_ID);
  if (header) {
    header.remove();
  }

  document.querySelectorAll(`[${CONTENT_ATTR}]`).forEach((element) => {
    if (!(element instanceof HTMLElement)) return;
    if (element.getAttribute(CONTENT_OFFSET_ATTR) === 'true') {
      element.style.marginTop = '';
    }
    element.removeAttribute(CONTENT_ATTR);
    element.removeAttribute(CONTENT_OFFSET_ATTR);
  });
}

function bootHeader() {
  console.log('[ELECTRON HEADER] bootHeader called, document.body exists:', !!document.body);
  
  let activePath = window.location.pathname;

  const syncHeader = () => {
    console.log('[ELECTRON HEADER] syncHeader called, body exists:', !!document.body);
    const result = ensureHeader();
    console.log('[ELECTRON HEADER] ensureHeader returned:', !!result);
    updateTitle();
  };

  // Немедленный запуск
  syncHeader();
  
  // Повторные попытки с увеличивающимися интервалами
  setTimeout(syncHeader, 50);
  setTimeout(syncHeader, 150);
  setTimeout(syncHeader, 300);
  setTimeout(syncHeader, 600);
  setTimeout(syncHeader, 1000);
  setTimeout(syncHeader, 1500);
  setTimeout(syncHeader, 2500);

  const unsubscribe = windowControls.onMaximizedChanged((value) => {
    const button = document.querySelector(`#${HEADER_ID} .shar-electron-tg-btn.maximize`);
    if (button) {
      updateMaximizeButton(button, value);
    }
  });

  const observer = new MutationObserver(() => {
    if (window.location.pathname !== activePath) {
      activePath = window.location.pathname;
      updateTitle();
    }

    if (!document.getElementById(HEADER_ID) && !shouldSkipHeader()) {
      console.log('[ELECTRON HEADER] MutationObserver: header missing, recreating');
      syncHeader();
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('resize', syncHeader);

  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    window.removeEventListener('resize', syncHeader);
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  }, { once: true });
}

console.log('[ELECTRON HEADER] Preload script loaded, readyState:', document.readyState);

// ── Dynamic Island (call status pill inside header) ─────────────────────────
function bootIsland() {
  const ISLAND_ID = 'call-dynamic-island-preload';
  const existingIsland = document.getElementById(ISLAND_ID);
  if (existingIsland) existingIsland.remove();

  if (!document.getElementById('island-keyframes-preload')) {
    const kf = document.createElement('style');
    kf.id = 'island-keyframes-preload';
    kf.textContent = '@keyframes isl-dot{0%,100%{opacity:.4;transform:scale(.78)}50%{opacity:1;transform:scale(1)}}' +
      '@keyframes isl-in{from{opacity:0;transform:translateX(-50%) scaleX(.7)}to{opacity:1;transform:translateX(-50%) scaleX(1)}}';
    document.head.appendChild(kf);
  }

  const islandWrap = document.createElement('div');
  islandWrap.id = ISLAND_ID;
  Object.assign(islandWrap.style, {
    position: 'absolute', left: '50%', top: '0', bottom: '0',
    transform: 'translateX(-50%)', display: 'none', alignItems: 'center',
    zIndex: '99999999999', pointerEvents: 'auto', WebkitAppRegion: 'no-drag',
  });

  const pill = document.createElement('div');
  Object.assign(pill.style, {
    background: 'rgba(12,12,12,0.96)', backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)', borderRadius: '999px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', gap: '5px', padding: '3px 7px 3px 5px',
    maxWidth: '250px', minWidth: '0', overflow: 'hidden', color: 'white',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    whiteSpace: 'nowrap', height: '24px', cursor: 'pointer',
    animation: 'isl-in .25s ease', transition: 'max-width .3s ease',
  });
  islandWrap.appendChild(pill);

  // Attach to the preload header; retry until it appears (header may not be in DOM yet)
  let _attachAttempts = 0;
  function _tryAttachIsland() {
    const header = document.getElementById(HEADER_ID);
    if (header) {
      header.style.overflow = 'visible';
      header.appendChild(islandWrap);
      return true;
    }
    _attachAttempts++;
    if (_attachAttempts < 20) {
      setTimeout(_tryAttachIsland, 300);
    } else {
      // Last-resort: fixed at top-center so it doesn't overlap content
      Object.assign(islandWrap.style, { position: 'fixed', top: '6px', bottom: 'auto' });
      document.body.appendChild(islandWrap);
    }
    return false;
  }
  _tryAttachIsland();

  let timerInterval = null;
  let callStartMs = null;

  function fmtMs(ms) {
    const s = Math.floor(ms / 1000) % 60, m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
    if (h > 0) return h + ':' + String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
    return m + ':' + String(s).padStart(2,'0');
  }
  function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

  const SVG_OFF = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="transform:rotate(135deg)"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.49a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.22-1.22a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const SVG_ON  = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.49a2 2 0 0 1 1.99-2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.96a16 16 0 0 0 6.13 6.13l1.22-1.22a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
  const SVG_MAX = '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';

  function mkAvatar(initials) {
    const av = document.createElement('div');
    Object.assign(av.style, { width:'18px', height:'18px', borderRadius:'50%',
      background:'linear-gradient(135deg,#3b82f6,#7c3aed)', display:'flex',
      alignItems:'center', justifyContent:'center', fontSize:'7px', fontWeight:'700',
      color:'white', flexShrink:'0' });
    av.textContent = (initials || '?').slice(0,2).toUpperCase();
    return av;
  }
  function mkDot(color) {
    const d = document.createElement('div');
    Object.assign(d.style, { width:'7px', height:'7px', borderRadius:'50%',
      background:color, flexShrink:'0', animation:'isl-dot 1.4s ease-in-out infinite' });
    return d;
  }
  function mkSpan(text, css) {
    const el = document.createElement('span');
    el.textContent = text;
    Object.assign(el.style, { fontSize:'11px', fontWeight:'500',
      color:'rgba(255,255,255,0.85)', overflow:'hidden', textOverflow:'ellipsis',
      maxWidth:'100px', ...css });
    return el;
  }
  function mkBtn(bg, svg, action, ttl) {
    const btn = document.createElement('button');
    btn.title = ttl; btn.innerHTML = svg;
    Object.assign(btn.style, { width:'20px', height:'20px', borderRadius:'50%',
      background:bg, border:'none', cursor:'pointer', display:'flex',
      alignItems:'center', justifyContent:'center', flexShrink:'0',
      color:'white', padding:'0', transition:'opacity .15s' });
    btn.onmouseenter = () => { btn.style.opacity = '.8'; };
    btn.onmouseleave = () => { btn.style.opacity = '1'; };
    btn.onclick = (e) => { e.stopPropagation(); ipcRenderer.send('call:island-action', action); };
    return btn;
  }
  function trunc(str, n) { return str && str.length > n ? str.slice(0,n) + '\u2026' : str || ''; }

  function renderIsland(data) {
    pill.innerHTML = '';
    stopTimer();
    if (!data || !data.state) {
      islandWrap.style.display = 'none';
      callStartMs = null;
      return;
    }
    islandWrap.style.display = 'flex';
    const { state, callerName, callerInitials, callType } = data;
    const name = trunc(callerName || 'Звонок', 12);

    if (state === 'ringing-in') {
      pill.appendChild(mkAvatar(callerInitials));
      const col = document.createElement('div');
      Object.assign(col.style, { display:'flex', flexDirection:'column', minWidth:0, maxWidth:'90px' });
      const nm = document.createElement('span'); nm.textContent = name;
      Object.assign(nm.style, { fontSize:'10px', fontWeight:'600', color:'white', overflow:'hidden', textOverflow:'ellipsis', lineHeight:'13px' });
      const sub = document.createElement('span');
      sub.textContent = callType === 'video' ? '\uD83D\uDCF9 Видео' : '\uD83D\uDCDE Звонок';
      Object.assign(sub.style, { fontSize:'9px', color:'rgba(255,255,255,.5)', lineHeight:'11px' });
      col.appendChild(nm); col.appendChild(sub); pill.appendChild(col);
      pill.appendChild(mkBtn('rgba(34,197,94,.9)', SVG_ON, 'answer', 'Принять'));
      pill.appendChild(mkBtn('rgba(239,68,68,.9)', SVG_OFF, 'hangup', 'Отклонить'));
      pill.onclick = (e) => { if (e.target === pill || !e.target.closest('button')) ipcRenderer.send('call:island-action', 'restore'); };
    } else if (state === 'ringing-out') {
      pill.appendChild(mkDot('#60a5fa'));
      pill.appendChild(mkSpan(name, { maxWidth:'110px' }));
      const dots = document.createElement('span');
      dots.style.cssText = 'font-size:11px;color:rgba(255,255,255,.36);flex-shrink:0';
      dots.textContent = '\u2026'; pill.appendChild(dots);
      pill.appendChild(mkBtn('rgba(239,68,68,.9)', SVG_OFF, 'hangup', 'Завершить'));
      pill.onclick = (e) => { if (!e.target.closest('button')) ipcRenderer.send('call:island-action', 'restore'); };
    } else if (state === 'active') {
      if (!callStartMs) callStartMs = Date.now();
      pill.appendChild(mkDot('#34d399'));
      pill.appendChild(mkSpan(name, { maxWidth:'72px' }));
      const timerEl = document.createElement('span');
      Object.assign(timerEl.style, { fontSize:'11px', color:'rgba(255,255,255,.6)', fontVariantNumeric:'tabular-nums', letterSpacing:'.4px', flexShrink:'0' });
      timerEl.textContent = fmtMs(Date.now() - callStartMs);
      timerInterval = setInterval(() => { timerEl.textContent = fmtMs(Date.now() - callStartMs); }, 1000);
      pill.appendChild(timerEl);
      pill.appendChild(mkBtn('rgba(255,255,255,.14)', SVG_MAX, 'restore', 'Развернуть'));
      pill.appendChild(mkBtn('rgba(239,68,68,.9)', SVG_OFF, 'hangup', 'Завершить'));
      pill.onclick = (e) => { if (!e.target.closest('button')) ipcRenderer.send('call:island-action', 'restore'); };
    }
  }

  ipcRenderer.on('call:island-update', (_, data) => {
    if (data && data.state === 'active' && !callStartMs) callStartMs = Date.now();
    if (!data || !data.state) callStartMs = null;
    renderIsland(data);
  });

  console.log('[ELECTRON HEADER] Dynamic Island ready (preload)');
}

// HEADER RENDERING DISABLED - Now handled by React component ElectronShell
// Old DOM-based header creation commented out to prevent hydration conflicts
/*
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[ELECTRON HEADER] DOMContentLoaded fired');
    bootHeader();
    setTimeout(bootIsland, 500);
  }, { once: true });
} else {
  bootHeader();
  setTimeout(bootIsland, 500);
}

// Emergency check: recreate header if it disappears
setTimeout(() => {
  if (!document.getElementById(HEADER_ID)) {
    console.log('[ELECTRON HEADER] Emergency check: header missing, recreating');
    bootHeader();
  }
  if (!document.getElementById('call-dynamic-island-preload')) {
    bootIsland();
  }
}, 3000);
*/
