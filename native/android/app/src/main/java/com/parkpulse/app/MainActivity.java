package com.parkpulse.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;
    private String parkingType;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        parkingType = extractParkingType(getIntent());

        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (parkingType != null) openParkingType(parkingType);
            }
        });
        webView.loadUrl("https://abhi1809sh.github.io/parkpulse/");
        setContentView(webView);
    }

    private String extractParkingType(Intent intent) {
        if (intent == null) return null;
        String extra = intent.getStringExtra("parking_type");
        if ("car".equals(extra) || "bike".equals(extra)) return extra;
        Uri data = intent.getData();
        if (data != null && !data.getPathSegments().isEmpty()) {
            String last = data.getPathSegments().get(data.getPathSegments().size() - 1);
            if ("car".equals(last) || "bike".equals(last)) return last;
        }
        return null;
    }

    private void openParkingType(String type) {
        if (webView == null) return;
        String id = "bike".equals(type) ? "bikeTab" : "carTab";
        String script = "(() => { const b=document.getElementById('" + id + "'); if(b){ b.click(); return true; } return false; })()";
        webView.evaluateJavascript(script, null);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        parkingType = extractParkingType(intent);
        if (parkingType != null) openParkingType(parkingType);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
