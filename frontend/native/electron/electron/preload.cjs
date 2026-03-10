const fs = require('fs');
const path = require('path');
const { contextBridge, ipcRenderer } = require('electron');

function getLogoDataUrl() {
  try {
    const logoPath = path.resolve(__dirname, '../../../../favicon.png');
    const fileBuffer = fs.readFileSync(logoPath);
    return `data:image/png;base64,${fileBuffer.toString('base64')}`;
  } catch {
    return '/favicon.png';
  }
}

const logoSrc = getLogoDataUrl();
const HEADER_ID = 'shar-electron-telegram-header';
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
});

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
    icon.style.width = '13px';
    icon.style.height = '13px';
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
    color: 'rgba(255,255,255,0.86)',
    background: 'transparent',
    border: '0',
    outline: 'none',
    cursor: 'pointer',
    transition: 'background 140ms ease, color 140ms ease',
    WebkitAppRegion: 'no-drag',
    padding: '0',
  });

  button.addEventListener('mouseenter', () => {
    button.style.background = className.includes('close') ? '#e81123' : 'rgba(255,255,255,0.08)';
    button.style.color = '#ffffff';
  });

  button.addEventListener('mouseleave', () => {
    button.style.background = 'transparent';
    button.style.color = 'rgba(255,255,255,0.86)';
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
  appName.textContent = 'Shar OS';

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
    position: 'fixed !important',
    top: '0 !important',
    left: '0 !important',
    right: '0 !important',
    height: `${height}px`,
    zIndex: '99999999',
    display: 'flex !important',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, rgba(23,33,43,0.98), rgba(24,34,45,0.96))',
    borderBottom: '3px solid rgba(255,0,0,0.5)',
    boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 20px rgba(255,0,0,0.3)',
    color: '#ffffff',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitAppRegion: 'drag',
    pointerEvents: 'auto',
    boxSizing: 'border-box',
    visibility: 'visible !important',
    opacity: '1 !important',
  });

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

// Header создается из main.cjs через executeJavaScript, поэтому здесь отключаем
/*
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', () => {
    console.log('[ELECTRON HEADER] DOMContentLoaded fired');
    bootHeader();
  }, { once: true });
} else {
  bootHeader();
}

// Дополнительная страховка
setTimeout(() => {
  console.log('[ELECTRON HEADER] Emergency check after 3s');
  if (!document.getElementById(HEADER_ID)) {
    console.log('[ELECTRON HEADER] Header still missing after 3s, forcing creation');
    bootHeader();
  }
}, 3000);
*/
