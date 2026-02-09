import { NextRequest, NextResponse } from 'next/server'

function hasDeepseekKey() {
  const apiKey = process.env.DEEPSEEK_API_KEY || 
                 process.env.DEEPSEEK_KEY ||
                 process.env.AI_API_KEY
  return Boolean(apiKey && apiKey.length > 10)
}

export async function GET(request: NextRequest) {
  try {
    const available = hasDeepseekKey()
    return NextResponse.json({ available })
  } catch (error) {
    return NextResponse.json({ available: false }, { status: 200 })
  }
}
