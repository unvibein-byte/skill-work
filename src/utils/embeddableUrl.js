const NON_EMBEDDABLE_HOSTS = [
  'sites.google.com',
  'drive.google.com',
  'docs.google.com',
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  't.me',
  'telegram.org',
  'telegram.me',
];

/** Google Sites and similar hosts block iframe embedding (X-Frame-Options). */
export function isIframeEmbeddableUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, '').toLowerCase();
    return !NON_EMBEDDABLE_HOSTS.some(
      (blocked) => host === blocked || host.endsWith(`.${blocked}`),
    );
  } catch {
    return false;
  }
}
