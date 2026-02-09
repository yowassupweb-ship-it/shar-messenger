// PROXY TO BACKEND
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function proxyToBackend(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/calendar-lists${url.search}`;
    
    const options: RequestInit = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (method === 'POST' || method === 'PUT') {
      const body = await request.json();
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(backendUrl, options);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: `Proxy error: ${error}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return proxyToBackend(request, 'GET');
}

export async function POST(request: NextRequest) {
  return proxyToBackend(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return proxyToBackend(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return proxyToBackend(request, 'DELETE');
}
