import { NextRequest, NextResponse } from 'next/server'
import { YandexWordstatAPI } from '@/lib/yandex-wordstat'
import { getYandexToken } from '@/lib/token-utils'

const API_URL = process.env.YANDEX_WORDSTAT_API_URL || 'https://api.wordstat.yandex.net'

function createAPI(token: string) {
  return new YandexWordstatAPI({
    apiUrl: API_URL,
    oauthToken: token
  })
}

function fmtDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function POST(request: NextRequest) {
  try {
    const { phrase, period, fromDate, toDate, regions, devices } = await request.json()
    
    const token = await getYandexToken()
    if (!token) {
      return NextResponse.json(
        { error: 'Отсутствует OAuth токен' }, 
        { status: 401 }
      )
    }

    const api = createAPI(token)

    // Normalize dates for monthly/weekly to satisfy upstream validation
    const finalPeriod = (period || 'monthly') as 'monthly' | 'weekly' | 'daily'
  let normalizedFrom = fromDate as string | undefined
  let normalizedTo = toDate as string | undefined

    if (finalPeriod === 'monthly' && (fromDate || toDate)) {
      const base = new Date((fromDate || toDate) + 'T00:00:00')
      if (!isNaN(base.getTime())) {
        const first = new Date(base.getFullYear(), base.getMonth(), 1)
        const last = new Date(base.getFullYear(), base.getMonth() + 1, 0)
        normalizedFrom = fmtDateLocal(first)
        // if toDate provided, snap to its end-of-month; else use same month as from
        if (toDate) {
          const t = new Date(toDate + 'T00:00:00')
          if (!isNaN(t.getTime())) {
            normalizedTo = fmtDateLocal(new Date(t.getFullYear(), t.getMonth() + 1, 0))
          } else {
            normalizedTo = fmtDateLocal(last)
          }
        } else {
          normalizedTo = fmtDateLocal(last)
        }
      }
    }

    // Debug: log normalization
    console.log('[dynamics] input:', { phrase, period, fromDate, toDate, regions, devices })
    console.log('[dynamics] normalized:', { period: finalPeriod, fromDate: normalizedFrom || fromDate, toDate: normalizedTo })

    // Ensure types match DynamicsRequest: fromDate must be string
    const basePayload = {
      phrase,
      period: finalPeriod,
      fromDate: (normalizedFrom || new Date().toISOString().split('T')[0]) as string,
      toDate: normalizedTo,
      regions,
      devices,
    }

    let result
    try {
      result = await api.getDynamics(basePayload)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // If upstream complains about monthly boundary, force strict month bounds and retry once
      if (finalPeriod === 'monthly' && /first day of the month/i.test(msg)) {
        // Determine month boundaries strictly
        const src = normalizedFrom || fromDate || normalizedTo || toDate
        if (src) {
          const d = new Date(String(src) + 'T00:00:00')
          if (!isNaN(d.getTime())) {
            const strictFrom = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0]
            const strictTo = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0]
            const retryPayload = {
              ...basePayload,
              fromDate: strictFrom,
              toDate: basePayload.toDate || strictTo,
            }
            console.warn('[dynamics] retry with strict month bounds', retryPayload)
            result = await api.getDynamics(retryPayload)
          } else {
            throw e
          }
        } else {
          throw e
        }
      } else {
        throw e
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Ошибка в API dynamics:', error)

    const msg = error instanceof Error ? error.message : String(error)
    if (/first day of the month/i.test(msg)) {
      return NextResponse.json(
        { error: 'Для периода monthly параметр fromDate должен быть первым днём месяца. Даты будут скорректированы автоматически, попробуйте снова.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ error: msg || 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}