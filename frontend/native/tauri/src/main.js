const TARGET_URL = 'https://vokrug-sveta.shar-os.ru/account?tab=messages';

window.location.replace(TARGET_URL);

// WebView fallback for environments where replace() can be ignored.
window.setTimeout(() => {
  if (!window.location.href.startsWith('https://vokrug-sveta.shar-os.ru/')) {
    window.location.href = TARGET_URL;
  }
}, 350);
