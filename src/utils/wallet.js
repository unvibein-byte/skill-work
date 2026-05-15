/** Sum rewards from locally stored completed tasks (offline / backfill). */
export function sumLocalTaskRewards() {
  try {
    const list = JSON.parse(localStorage.getItem('sw_completed') || '[]');
    return list.reduce((sum, t) => sum + (Number(t.reward) || 0), 0);
  } catch {
    return 0;
  }
}

export function formatInr(amount) {
  return Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
