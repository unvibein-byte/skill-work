package com.rohit.pdftaskapp;

import android.view.ViewGroup;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "EmbeddedWebView")
public class EmbeddedWebViewPlugin extends Plugin {

    private WebView embeddedWebView;

    @PluginMethod
    public void open(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Must provide URL");
            return;
        }

        int topPx = call.getInt("topPx", 56);

        getBridge().executeOnMainThread(() -> {
            closeInternal();

            ViewGroup root = (ViewGroup) getBridge().getWebView().getParent();
            if (root == null) {
                call.reject("Unable to attach WebView");
                return;
            }

            embeddedWebView = new WebView(getContext());
            FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            );
            params.topMargin = topPx;
            root.addView(embeddedWebView, params);

            WebSettings settings = embeddedWebView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            embeddedWebView.setWebViewClient(new WebViewClient());
            embeddedWebView.loadUrl(url);

            call.resolve();
        });
    }

    @PluginMethod
    public void close(PluginCall call) {
        getBridge().executeOnMainThread(() -> {
            closeInternal();
            call.resolve();
        });
    }

    private void closeInternal() {
        if (embeddedWebView == null) {
            return;
        }

        embeddedWebView.stopLoading();
        ViewGroup parent = (ViewGroup) embeddedWebView.getParent();
        if (parent != null) {
            parent.removeView(embeddedWebView);
        }
        embeddedWebView.destroy();
        embeddedWebView = null;
    }
}
