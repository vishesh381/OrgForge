export const formatDate = (date) => {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export const formatDuration = (ms) => {
  if (!ms && ms !== 0) return '—'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
}

export const formatPercent = (value, decimals = 1) =>
  value == null ? '—' : `${Number(value).toFixed(decimals)}%`

export const formatNumber = (value) =>
  value == null ? '—' : new Intl.NumberFormat('en-US').format(value)

export const formatBytes = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
