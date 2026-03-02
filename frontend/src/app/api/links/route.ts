import { NextRequest, NextResponse } from 'next/server';
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || 'http://127.0.0.1:8000';

export interface LinkCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
}

export interface LinkList {
  id: string;
  name: string;
  color: string;
  icon: string;
  order: number;
  createdAt: string;
  createdBy?: string;
  allowedUsers: string[];
  allowedDepartments: string[];
  isPublic: boolean;
}

export interface LinkItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  favicon?: string;
  image?: string;
  siteName?: string;
  listId: string;
  categoryId?: string;
  tags: string[];
  isBookmarked: boolean;
  isPinned: boolean;
  clickCount: number;
  lastClickedAt?: string;
  createdAt: string;
  updatedAt: string;
  order: number;
}

interface LinksData {
  links: LinkItem[];
  lists: LinkList[];
  categories: LinkCategory[];
}

async function proxyToBackend(request: NextRequest, method: 'GET' | 'POST' | 'PUT' | 'DELETE') {
  const url = new URL(request.url);
  const backendUrl = `${BACKEND_URL}/api/links${url.search}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  };

  if (method === 'POST' || method === 'PUT') {
    const body = await request.json();
    options.body = JSON.stringify(body);
  }

  const response = await fetch(backendUrl, options);
  const text = await response.text();

  let data: any = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { error: text };
    }
  }

  return NextResponse.json(data ?? {}, { status: response.status });
}

// Fetch metadata from URL
async function fetchUrlMetadata(url: string): Promise<Partial<LinkItem>> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) {
      return { title: new URL(url).hostname };
    }
    
    const html = await response.text();
    
    // Parse metadata
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const ogTitleMatch = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i) ||
                         html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:title"/i);
    const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i) ||
                      html.match(/<meta[^>]*content="([^"]+)"[^>]*name="description"/i);
    const ogDescMatch = html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i) ||
                        html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:description"/i);
    const ogImageMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i) ||
                         html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);
    const ogSiteMatch = html.match(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i) ||
                        html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:site_name"/i);
    
    const urlObj = new URL(url);
    const favicon = `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    
    let image = ogImageMatch?.[1];
    if (image && !image.startsWith('http')) {
      image = new URL(image, url).href;
    }
    
    return {
      title: ogTitleMatch?.[1] || titleMatch?.[1] || urlObj.hostname,
      description: ogDescMatch?.[1] || descMatch?.[1],
      favicon,
      image,
      siteName: ogSiteMatch?.[1] || urlObj.hostname
    };
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    const urlObj = new URL(url);
    return {
      title: urlObj.hostname,
      favicon: `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`
    };
  }
}

// GET - получить все ссылки
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fetchMeta = searchParams.get('fetchMeta');
    const url = searchParams.get('url');
    
    // Fetch metadata for a single URL
    if (fetchMeta === 'true' && url) {
      const metadata = await fetchUrlMetadata(url);
      return NextResponse.json(metadata);
    }

    const proxied = await proxyToBackend(request, 'GET');
    const payload = await proxied.json();
    const normalized: LinksData = {
      links: Array.isArray(payload?.links) ? payload.links : [],
      lists: Array.isArray(payload?.lists) ? payload.lists : [],
      categories: Array.isArray(payload?.categories) ? payload.categories : [],
    };

    return NextResponse.json(normalized, { status: proxied.status });
  } catch (error) {
    console.error('Error reading links:', error);
    return NextResponse.json({ error: 'Failed to read links' }, { status: 500 });
  }
}

// POST - создать ссылку, список или категорию
export async function POST(request: NextRequest) {
  try {
    return proxyToBackend(request, 'POST');
  } catch (error) {
    console.error('Error creating:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

// PUT - обновить ссылку, список или категорию
export async function PUT(request: NextRequest) {
  try {
    return proxyToBackend(request, 'PUT');
  } catch (error) {
    console.error('Error updating:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - удалить ссылку, список или категорию
export async function DELETE(request: NextRequest) {
  try {
    return proxyToBackend(request, 'DELETE');
  } catch (error) {
    console.error('Error deleting:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
