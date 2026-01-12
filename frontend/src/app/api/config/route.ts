import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    defaultResultsLimit: parseInt(process.env.DEFAULT_RESULTS_LIMIT || '500'),
    apiUrl: process.env.YANDEX_WORDSTAT_API_URL || 'https://api.wordstat.yandex.net'
  })
}
