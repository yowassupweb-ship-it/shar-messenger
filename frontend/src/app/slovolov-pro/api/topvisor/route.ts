import { NextResponse } from 'next/server';
import { getTopvisorConfig, saveTopvisorConfig, TopvisorConfig } from '@/lib/topvisor';

// Get config
export async function GET() {
  try {
    const config = getTopvisorConfig();
    if (config) {
      // Hide API key partially for security
      const configWithMask = {
        ...config,
        apiKeyMasked: config.apiKey ? config.apiKey.slice(0, 8) + '...' + config.apiKey.slice(-4) : ''
      };
      return NextResponse.json({ success: true, config: configWithMask });
    }
    return NextResponse.json({ success: true, config: { apiKey: '', userId: '', projectId: '' } });
  } catch (error) {
    console.error('Error reading topvisor config:', error);
    return NextResponse.json({ success: false, error: 'Failed to read config' }, { status: 500 });
  }
}

// Save config
export async function POST(request: Request) {
  try {
    const config: TopvisorConfig = await request.json();
    
    const success = saveTopvisorConfig(config);
    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
  } catch (error) {
    console.error('Error saving topvisor config:', error);
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
  }
}
