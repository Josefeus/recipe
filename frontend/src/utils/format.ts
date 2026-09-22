import { QUICK_MINUTES } from '@/types/recipe'

/** 用菜名生成稳定的色相，没有实拍图时用同一套色系画占位图。 */
export function dishHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) % 360
  }
  return hash
}

export function dishInitial(name: string): string {
  return Array.from(name.replace(/[（(].*?[)）]/g, ''))[0] ?? '菜'
}

export function formatMinutes(minutes: number | null): string | null {
  if (!minutes) return null
  if (minutes < QUICK_MINUTES) return `约 ${minutes} 分钟`
  if (minutes < 60) return `约 ${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest ? `约 ${hours} 小时 ${rest} 分` : `约 ${hours} 小时`
}

export function isQuick(minutes: number | null): boolean {
  return minutes !== null && minutes > 0 && minutes <= QUICK_MINUTES
}
