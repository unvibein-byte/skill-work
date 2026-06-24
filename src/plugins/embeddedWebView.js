import { registerPlugin } from '@capacitor/core';

export const EmbeddedWebView = registerPlugin('EmbeddedWebView', {
  web: () => import('./embeddedWebView.web.js').then((m) => new m.EmbeddedWebViewWeb()),
});
