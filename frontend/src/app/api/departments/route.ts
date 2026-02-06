import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:8000/api/departments');
    
    if (!res.ok) {
      console.error('[Departments API] Backend error:', res.status);
      return NextResponse.json({ departments: [] }, { status: res.status });
    }
    
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Departments API] Error fetching from backend:', error);
    // Fallback: return empty array
    return NextResponse.json({ departments: [] }, { status: 200 });
  }
}
