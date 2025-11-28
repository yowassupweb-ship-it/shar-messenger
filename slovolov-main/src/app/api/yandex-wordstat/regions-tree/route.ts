import { NextRequest, NextResponse } from 'next/server'
import { YandexWordstatAPI } from '@/lib/yandex-wordstat'
import { getYandexToken } from '@/lib/token-utils'
import { fallbackRegions } from '@/lib/fallback-regions'

const API_URL = process.env.YANDEX_WORDSTAT_API_URL || 'https://api.wordstat.yandex.net'

function createAPI(token: string) {
  return new YandexWordstatAPI({
    apiUrl: API_URL,
    oauthToken: token
  })
}

export async function POST() {
  try {
    const token = getYandexToken()
    if (!token) {
      console.log('Нет токена, используем fallback регионы')
      return NextResponse.json({ regions: fallbackRegions })
    }

    const api = createAPI(token)

    try {
      const result = await api.getRegionsTree()
      
      // Логируем результат для отладки
      console.log('Regions from Yandex API:', result?.length || 0, 'регионов')
      
      // Проверяем, что API вернул данные
      if (!result || (Array.isArray(result) && result.length === 0)) {
        console.log('API вернул пустой массив, используем fallback')
        return NextResponse.json({ regions: fallbackRegions })
      }

      // Нормализуем формат Yandex API в наш формат
      // РЕКУРСИВНАЯ функция для обхода всех уровней дерева
      function normalizeRegions(regions: any[], parentId?: number): any[] {
        const normalized: any[] = []
        
        for (const region of regions) {
          const regionId = parseInt(region.value)
          const regionName = region.label
          
          // Добавляем текущий регион
          normalized.push({
            regionId,
            regionName,
            parentId: parentId || undefined
          })
          
          // РЕКУРСИВНО обрабатываем дочерние регионы
          if (region.children && Array.isArray(region.children) && region.children.length > 0) {
            const childRegions = normalizeRegions(region.children, regionId)
            normalized.push(...childRegions)
          }
        }
        
        return normalized
      }
      
      const normalizedRegions = normalizeRegions(result)
      console.log('Normalized regions from API:', normalizedRegions.length)
      
      // Объединяем с fallback: используем API данные, дополняем fallback
      const regionMap = new Map<number, any>()
      
      // Сначала добавляем все из API
      normalizedRegions.forEach(r => regionMap.set(r.regionId, r))
      
      // Затем добавляем из fallback те, которых нет в API
      fallbackRegions.forEach(r => {
        if (!regionMap.has(r.regionId)) {
          regionMap.set(r.regionId, r)
        }
      })
      
      const mergedRegions = Array.from(regionMap.values())
      console.log('Total regions after merge:', mergedRegions.length)
      
      return NextResponse.json({ regions: mergedRegions })
    } catch (apiError) {
      console.error('Ошибка вызова Yandex API:', apiError)
      console.log('Используем fallback регионы из-за ошибки API')
      return NextResponse.json({ regions: fallbackRegions })
    }
  } catch (error) {
    console.error('Общая ошибка в API regions-tree:', error)
    console.log('Используем fallback регионы из-за общей ошибки')
    
    // Возвращаем fallback регионы при любой ошибке
    return NextResponse.json({ regions: fallbackRegions })
  }
}