import { invoke } from '@tauri-apps/api/core';
import './styles.css';

const statusEl = document.getElementById('status');
const remoteUrlEl = document.getElementById('remote-url');
const hintEl = document.getElementById('hint');
const retryButton = document.getElementById('retry-button');

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
        window.location.replace(remoteUrl);
      });
    }

    window.setTimeout(() => {
      window.location.replace(remoteUrl);
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

redirectToRemoteApp();
