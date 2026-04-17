package ru.shar.tauri

import android.os.Build
import android.os.Bundle
import android.webkit.CookieManager
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import kotlin.math.max

class MainActivity : TauriActivity() {
  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)

    // Align WebView behavior with modern mobile browsers (Chrome-like defaults).
    val settings = webView.settings
    settings.javaScriptEnabled = true
    settings.domStorageEnabled = true
    settings.databaseEnabled = true
    settings.useWideViewPort = true
    settings.loadWithOverviewMode = true
    settings.loadsImagesAutomatically = true
    settings.allowFileAccess = true
    settings.allowContentAccess = true
    settings.mediaPlaybackRequiresUserGesture = false
    settings.setSupportMultipleWindows(false)
    settings.builtInZoomControls = false
    settings.displayZoomControls = false
    settings.textZoom = 100

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
      CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      settings.safeBrowsingEnabled = true
    }

    CookieManager.getInstance().setAcceptCookie(true)
    webView.isFocusable = true
    webView.isFocusableInTouchMode = true

    val rootView = window.decorView
    ViewCompat.setOnApplyWindowInsetsListener(rootView) { _, insets ->
      val imeBottom = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
      val barsBottom = insets.getInsets(WindowInsetsCompat.Type.systemBars()).bottom
      val keyboardInset = max(0, imeBottom - barsBottom)
      val js = """
        (function() {
          var inset = ${keyboardInset};
          document.documentElement.style.setProperty('--shar-mobile-keyboard-inset', inset + 'px');
          window.dispatchEvent(new CustomEvent('shar-keyboard-inset-change', { detail: { inset: inset } }));
          if (typeof window.__setSharKeyboardInset === 'function') {
            window.__setSharKeyboardInset(inset);
          }
        })();
      """.trimIndent()
      webView.post {
        webView.evaluateJavascript(js, null)
      }
      insets
    }
    ViewCompat.requestApplyInsets(rootView)
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }
}
