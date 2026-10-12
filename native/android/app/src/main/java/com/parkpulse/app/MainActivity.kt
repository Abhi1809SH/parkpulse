package com.parkpulse.app

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var parkingType: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        parkingType = intent.getStringExtra("parking_type")
            ?: intent.data?.pathSegments?.lastOrNull()?.takeIf { it == "car" || it == "bike" }

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView?, url: String?) {
                    super.onPageFinished(view, url)
                    parkingType?.let { type -> openParkingType(type) }
                }
            }
            loadUrl("https://abhi1809sh.github.io/parkpulse/")
        }
        setContentView(webView)
    }

    private fun openParkingType(type: String) {
        val id = if (type == "bike") "bikeTab" else "carTab"
        webView.evaluateJavascript(
            "(() => { const b=document.getElementById('$id'); if(b){ b.click(); return true; } return false; })()",
            null
        )
    }

    override fun onNewIntent(intent: android.content.Intent?) {
        super.onNewIntent(intent)
        setIntent(intent)
        parkingType = intent?.getStringExtra("parking_type")
            ?: intent?.data?.pathSegments?.lastOrNull()?.takeIf { it == "car" || it == "bike" }
        parkingType?.let { openParkingType(it) }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (::webView.isInitialized && webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}
