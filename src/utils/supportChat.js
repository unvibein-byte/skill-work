/**
 * Build support chat URL with user phone/name for Hostinger chat page.
 */
export function buildSupportChatUrl(baseUrl, phone, name) {
  const normalized = String(phone || '').replace(/\D/g, '');
  const digits =
    normalized.length === 12 && normalized.startsWith('91')
      ? normalized.slice(2)
      : normalized.slice(-10);

  const url = new URL(baseUrl);
  url.searchParams.set('phone', digits);
  url.searchParams.set('embed', '1');
  if (name?.trim()) {
    url.searchParams.set('name', name.trim());
  }
  return url.toString();
}
