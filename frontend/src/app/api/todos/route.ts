// PROXY TO BACKEND - All requests forwarded to backend API
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://127.0.0.1:8000';

console.log('=== TODOS ROUTE (PROXY MODE) - Backend:', BACKEND_URL, '===');
console.log('=== process.env.BACKEND_URL:', process.env.BACKEND_URL, '===');

// Helper function to forward requests to backend
async function proxyToBackend(request: NextRequest, method: string) {
  try {
    const url = new URL(request.url);
    const backendUrl = `${BACKEND_URL}/api/todos${url.search}`;
    
    console.log(`[PROXY] ${method} ${backendUrl}`);
    
    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    // Add body for POST/PUT requests
    if (method === 'POST' || method === 'PUT') {
      const body = await request.json();
      console.log(`[PROXY] ${method} Request body:`, JSON.stringify(body).substring(0, 200));
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(backendUrl, options);
    console.log(`[PROXY] ${method} Response status:`, response.status);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error(`[PROXY] Error forwarding ${method} request:`, error);
    return NextResponse.json(
      { error: `Failed to forward request to backend: ${error}` },
      { status: 500 }
    );
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
