import { NextRequest, NextResponse } from 'next/server'
import { readDB, writeDB } from '@/lib/db'

const DEFAULT_PRESETS = [
  { id: 'yandex', name: 'Яндекс', source: 'yandex', medium: 'cpc', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', description: 'Яндекс.Директ' },
  { id: 'google', name: 'Google', source: 'google', medium: 'cpc', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', description: 'Google Ads' },
  { id: 'vk', name: 'VK', source: 'vk', medium: 'social', color: 'bg-sky-500/20 text-sky-400 border-sky-500/30', description: 'ВКонтакте' },
  { id: 'tg', name: 'Telegram', source: 'telegram', medium: 'social', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30', description: 'Telegram' },
  { id: 'dzen', name: 'Дзен', source: 'dzen', medium: 'social', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', description: 'Яндекс.Дзен' },
  { id: 'email', name: 'Email', source: 'email', medium: 'email', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', description: 'Email-рассылка' },
  { id: 'qr', name: 'QR', source: 'qr', medium: 'offline', color: 'bg-green-500/20 text-green-400 border-green-500/30', description: 'Оффлайн (QR-код)' },
]

// GET - получить все пресеты
export async function GET() {
  try {
    const db = await readDB()
    const presets = db.utmPresets || DEFAULT_PRESETS
    return NextResponse.json(presets)
  } catch (error) {
    console.error('Error fetching UTM presets:', error)
    return NextResponse.json(DEFAULT_PRESETS)
  }
}

// POST - сохранить пресеты
export async function POST(request: NextRequest) {
  try {
    const presets = await request.json()
    
    if (!Array.isArray(presets)) {
      return NextResponse.json({ error: 'Presets must be an array' }, { status: 400 })
    }
    
    const db = await readDB()
    db.utmPresets = presets
    await writeDB(db)
    
    return NextResponse.json({ success: true, presets })
  } catch (error) {
    console.error('Error saving UTM presets:', error)
    return NextResponse.json({ error: 'Ошибка сохранения пресетов' }, { status: 500 })
  }
}

// DELETE - сбросить к дефолтным
export async function DELETE() {
  try {
    const db = await readDB()
    db.utmPresets = DEFAULT_PRESETS
    await writeDB(db)
    
    return NextResponse.json({ success: true, presets: DEFAULT_PRESETS })
  } catch (error) {
    console.error('Error resetting UTM presets:', error)
    return NextResponse.json({ error: 'Ошибка сброса пресетов' }, { status: 500 })
  }
}
