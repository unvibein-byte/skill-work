/**
 * Resolves the first screen after splash (or when /login is opened while already signed in).
 * Relies on localStorage written at login and when onboarding finishes.
 */
export function getPostSplashPath() {
  const name = localStorage.getItem('sw_name');
  const phone = localStorage.getItem('sw_phone');
  if (!name?.trim() || !phone?.trim()) return '/login';

  const onboarding = localStorage.getItem('sw_onboarding_complete');
  if (onboarding === 'false') return '/onboarding-1';

  // 'true', or missing key (installs from before this flag) → home
  return '/main';
}
