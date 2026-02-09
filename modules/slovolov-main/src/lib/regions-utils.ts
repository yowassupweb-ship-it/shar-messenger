// Утилита для работы с регионами Яндекс
import { Region } from '@/types/yandex-wordstat'
import { fallbackRegions } from './fallback-regions'

let regionsCache: Region[] | null = null

export async function loadRegionsTree(): Promise<Region[]> {
  if (regionsCache) {
    return regionsCache
  }

  try {
    const response = await fetch('/api/yandex-wordstat/regions-tree', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    
    if (!response.ok) {
      console.warn('regions-tree API вернул ошибку:', response.status, '- используем fallback')
      regionsCache = fallbackRegions
      return fallbackRegions
    }
    
    const payload = await response.json()
    const regions = Array.isArray(payload) ? payload : payload?.regions
    
    if (!Array.isArray(regions) || regions.length === 0) {
      console.warn('API вернул пустой массив регионов - используем fallback')
      regionsCache = fallbackRegions
      return fallbackRegions
    }
    
    console.log('Загружено регионов из API:', regions.length)
    regionsCache = regions
    return regions
  } catch (error) {
    console.error('Ошибка загрузки регионов:', error, '- используем fallback')
    regionsCache = fallbackRegions
    return fallbackRegions
  }
}

export function getRegionNameById(regionId: number, regions: Region[]): string {
  // Try to find in provided regions (API-merged). If it exists and has a name, return it.
  const region = regions.find(r => r.regionId === regionId)
  if (region && region.regionName) return region.regionName

  // If API didn't provide a name (or used placeholders), try fallback list maintained locally.
  const fallback = fallbackRegions.find(r => r.regionId === regionId)
  if (fallback && fallback.regionName) return fallback.regionName

  // Last resort: return generic placeholder.
  return `Регион ${regionId}`
}

export function clearRegionsCache() {
  regionsCache = null
}