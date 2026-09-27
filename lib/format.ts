// Turkish-aware slugify + display helpers

const TR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  I: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
}

export function slugify(text: string): string {
  return text
    .split('')
    .map((c) => TR_MAP[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000)
  if (seconds < 60) return 'az önce'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} dk önce`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} sa önce`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} gün önce`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} ay önce`
  return `${Math.floor(months / 12)} yıl önce`
}

export function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}B` // Turkish: 1.2B = 1200 (bin)
  return String(n)
}

// XP needed for a given level: level^2 * 50
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(xp / 50)))
}

export function xpForNextLevel(level: number): number {
  return (level + 1) * (level + 1) * 50
}
