// Small formatting helpers shared across views.

export function timeAgo(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Bucket a timestamp by submission age for the Help Desk kanban grouping.
export function ageBucket(iso, now = Date.now()) {
  const hrs = (now - new Date(iso).getTime()) / 3600000;
  if (hrs < 24) return 'Today';
  if (hrs < 72) return 'This Week';
  return 'Older';
}
