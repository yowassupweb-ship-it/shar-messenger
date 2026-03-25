import { invoke } from '@tauri-apps/api/core';
import './styles.css';

const statusEl = document.getElementById('status');
const remoteUrlEl = document.getElementById('remote-url');
const hintEl = document.getElementById('hint');
const retryButton = document.getElementById('retry-button');

function withPlatformParam(remoteUrl) {
  const sep = remoteUrl.includes('?') ? '&' : '?';
  return remoteUrl + sep + '_platform=tauri';
}

// Inject mobile fixes into remote app
function injectMobileFixes() {
  // Add viewport meta if not exists
  let viewport = document.querySelector('meta[name="viewport"]');
  if (!viewport) {
    viewport = document.createElement('meta');
    viewport.name = 'viewport';
    document.head.appendChild(viewport);
  }
  viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover';
  
  // Add mobile web app capable meta
  if (!document.querySelector('meta[name="mobile-web-app-capable"]')) {
    const meta = document.createElement('meta');
    meta.name = 'mobile-web-app-capable';
    meta.content = 'yes';
    document.head.appendChild(meta);
  }
  
  // Add safe-area CSS
  const style = document.createElement('style');
  style.textContent = `
    html, body {
      padding-top: env(safe-area-inset-top, 20px) !important;
      padding-bottom: env(safe-area-inset-bottom, 0px) !important;
      padding-left: env(safe-area-inset-left, 0px) !important;
      padding-right: env(safe-area-inset-right, 0px) !important;
    }
    
    /* Fix for common header/navbar positioning */
    header, nav, .header, .navbar {
      top: env(safe-area-inset-top, 20px) !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ Mobile fixes injected');
}

async function redirectToRemoteApp() {
  try {
    const remoteUrl = await invoke('get_remote_url');

    if (remoteUrlEl) {
      remoteUrlEl.textContent = remoteUrl;
    }

    if (statusEl) {
      statusEl.textContent = 'перенаправление';
    }

    if (hintEl) {
      hintEl.textContent = 'Если автоматический переход не сработает, используйте кнопку ниже.';
    }

    if (retryButton) {
      retryButton.addEventListener('click', () => {
        window.location.replace(withPlatformParam(remoteUrl));
      });
    }

    // Try to inject fixes before redirect
    setTimeout(() => {
      injectMobileFixes();
    }, 100);

    window.setTimeout(() => {
      window.location.replace(withPlatformParam(remoteUrl));
    }, 700);
  } catch (error) {
    if (statusEl) {
      statusEl.textContent = 'ошибка';
    }

    if (hintEl) {
      hintEl.textContent = `Не удалось получить REMOTE_WEB_URL: ${String(error)}`;
    }
  }
}

// Listen for page load to inject fixes
window.addEventListener('load', () => {
  setTimeout(injectMobileFixes, 300);
});

redirectToRemoteApp();
