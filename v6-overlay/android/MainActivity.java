package com.johnnydebaets.wildforge;

import android.graphics.Color;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final String TAG = "WildforgeBoot";
    private static final String BOOT_PREFS = "wildforge_boot";
    private static final String LAST_VERSION = "last_version";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(5, 7, 10));
        getWindow().setNavigationBarColor(Color.rgb(5, 7, 10));
        clearStaleWebAssetsAfterUpdate();

        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) {
            WebView.setWebContentsDebuggingEnabled(true);
            new Handler(Looper.getMainLooper()).postDelayed(this::reportBootState, 8000);
        }
    }

    private void clearStaleWebAssetsAfterUpdate() {
        SharedPreferences preferences = getSharedPreferences(BOOT_PREFS, Context.MODE_PRIVATE);
        String previousVersion = preferences.getString(LAST_VERSION, null);
        String currentVersion = currentVersionName();
        preferences.edit().putString(LAST_VERSION, currentVersion).apply();

        if (previousVersion == null || previousVersion.equals(currentVersion) ||
            getBridge() == null || getBridge().getWebView() == null) return;

        WebView webView = getBridge().getWebView();
        webView.postDelayed(() -> webView.evaluateJavascript(
            "(async()=>{try{" +
                "if('serviceWorker'in navigator){const r=await navigator.serviceWorker.getRegistrations();" +
                "await Promise.all(r.map(x=>x.unregister()));}" +
                "if('caches'in window){const k=await caches.keys();" +
                "await Promise.all(k.map(x=>caches.delete(x)));}" +
            "}finally{location.reload();}})()",
            value -> Log.i(TAG, "stale web cache cleared for " + currentVersion)
        ), 700);
    }

    private String currentVersionName() {
        try {
            String versionName = getPackageManager()
                .getPackageInfo(getPackageName(), 0)
                .versionName;
            return versionName == null ? "unknown" : versionName;
        } catch (Exception error) {
            Log.w(TAG, "could not resolve app version", error);
            return "unknown";
        }
    }

    private void reportBootState() {
        if (isFinishing() || getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript(
            "document.body.classList.contains('wildforge-ready')?'WILDFORGE_READY':'WILDFORGE_NOT_READY'",
            value -> Log.i(TAG, "state=" + value)
        );
    }
}
