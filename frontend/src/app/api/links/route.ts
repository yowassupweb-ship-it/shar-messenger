import { NextRequest, NextResponse } from 'next/server';
import { readJsonFile, writeJsonFile, generateId } from '@/lib/dataStore';

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

const DEFAULT_CATEGORIES: LinkCategory[] = [];

const DEFAULT_LISTS: LinkList[] = [
  {
    id: 'work',
    name: 'Работа',
    color: '#3b82f6',
    icon: '',
    order: 0,
    createdAt: new Date().toISOString(),
    createdBy: '',
    allowedUsers: [],
    allowedDepartments: [],
    isPublic: true,
  },
];

const DEFAULT_DATA: LinksData = {
  links: [],
  lists: DEFAULT_LISTS,
  categories: DEFAULT_CATEGORIES
};

function normalizeLinksData(input: LinksData): LinksData {
  const lists = (input.lists || []).map((list, index) => {
    const allowedUsers = Array.isArray((list as Partial<LinkList>).allowedUsers)
      ? ((list as Partial<LinkList>).allowedUsers as string[]).filter(Boolean)
      : [];
    const allowedDepartments = Array.isArray((list as Partial<LinkList>).allowedDepartments)
      ? ((list as Partial<LinkList>).allowedDepartments as string[]).filter(Boolean)
      : [];
    const explicitPublic = (list as Partial<LinkList>).isPublic;

    return {
      ...list,
      order: typeof list.order === 'number' ? list.order : index,
      createdAt: list.createdAt || new Date().toISOString(),
      createdBy: (list as Partial<LinkList>).createdBy || '',
      allowedUsers,
      allowedDepartments,
      isPublic: typeof explicitPublic === 'boolean' ? explicitPublic : allowedUsers.length === 0 && allowedDepartments.length === 0,
    } as LinkList;
  });

  return {
    links: input.links || [],
    categories: input.categories || [],
    lists,
  };
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
    
    const rawData = readJsonFile<LinksData>('links.json', DEFAULT_DATA);
    const data = normalizeLinksData(rawData);

    if (JSON.stringify(rawData) !== JSON.stringify(data)) {
      writeJsonFile('links.json', data);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading links:', error);
    return NextResponse.json({ error: 'Failed to read links' }, { status: 500 });
  }
}

// POST - создать ссылку, список или категорию
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type } = body;
    
    const data = normalizeLinksData(readJsonFile<LinksData>('links.json', DEFAULT_DATA));
    
    if (type === 'link') {
      const { url, listId, categoryId, tags = [] } = body;
      
      // Fetch metadata
      const metadata = await fetchUrlMetadata(url);
      
      const newLink: LinkItem = {
        id: generateId(),
        url,
        title: metadata.title || new URL(url).hostname,
        description: metadata.description,
        favicon: metadata.favicon,
        image: metadata.image,
        siteName: metadata.siteName,
        listId: listId || data.lists[0]?.id || 'work',
        categoryId,
        tags,
        isBookmarked: false,
        isPinned: false,
        clickCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        order: data.links.length
      };
      
      data.links.push(newLink);
      writeJsonFile('links.json', data);
      
      return NextResponse.json(newLink);
    }
    
    if (type === 'list') {
      const {
        name,
        color = '#3b82f6',
        icon = '📁',
        createdBy = '',
        allowedUsers = [],
        allowedDepartments = [],
      } = body;
      const normalizedAllowedUsers = Array.isArray(allowedUsers) ? allowedUsers.filter(Boolean) : [];
      const normalizedAllowedDepartments = Array.isArray(allowedDepartments) ? allowedDepartments.filter(Boolean) : [];
      
      const newList: LinkList = {
        id: generateId(),
        name,
        color,
        icon,
        order: data.lists.length,
        createdAt: new Date().toISOString(),
        createdBy,
        allowedUsers: normalizedAllowedUsers,
        allowedDepartments: normalizedAllowedDepartments,
        isPublic: normalizedAllowedUsers.length === 0 && normalizedAllowedDepartments.length === 0,
      };
      
      data.lists.push(newList);
      writeJsonFile('links.json', data);
      
      return NextResponse.json(newList);
    }
    
    if (type === 'category') {
      const { name, color = '#6b7280', icon = '📂' } = body;
      
      if (!data.categories) data.categories = [];
      
      const newCategory: LinkCategory = {
        id: generateId(),
        name,
        color,
        icon,
        order: data.categories.length
      };
      
      data.categories.push(newCategory);
      writeJsonFile('links.json', data);
      
      return NextResponse.json(newCategory);
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error creating:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

// PUT - обновить ссылку, список или категорию
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, id, ...updates } = body;
    
    const data = normalizeLinksData(readJsonFile<LinksData>('links.json', DEFAULT_DATA));
    
    if (type === 'link') {
      const linkIndex = data.links.findIndex(l => l.id === id);
      if (linkIndex === -1) {
        return NextResponse.json({ error: 'Link not found' }, { status: 404 });
      }
      
      // If URL changed and no title provided, refetch metadata (only favicon, image, siteName)
      if (updates.url && updates.url !== data.links[linkIndex].url && !updates.title) {
        const metadata = await fetchUrlMetadata(updates.url);
        // Only update non-title fields from metadata
        updates.favicon = metadata.favicon;
        updates.image = metadata.image;
        updates.siteName = metadata.siteName;
      }
      
      data.links[linkIndex] = {
        ...data.links[linkIndex],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      writeJsonFile('links.json', data);
      return NextResponse.json(data.links[linkIndex]);
    }
    
    if (type === 'list') {
      const listIndex = data.lists.findIndex(l => l.id === id);
      if (listIndex === -1) {
        return NextResponse.json({ error: 'List not found' }, { status: 404 });
      }

      const nextUpdates = { ...updates };
      if ('allowedUsers' in nextUpdates) {
        nextUpdates.allowedUsers = Array.isArray(nextUpdates.allowedUsers)
          ? nextUpdates.allowedUsers.filter(Boolean)
          : [];
      }
      if ('allowedDepartments' in nextUpdates) {
        nextUpdates.allowedDepartments = Array.isArray(nextUpdates.allowedDepartments)
          ? nextUpdates.allowedDepartments.filter(Boolean)
          : [];
      }
      
      const merged = { ...data.lists[listIndex], ...nextUpdates } as LinkList;
      const derivedPublic =
        ('allowedUsers' in nextUpdates || 'allowedDepartments' in nextUpdates) && !('isPublic' in nextUpdates)
          ? (merged.allowedUsers?.length || 0) === 0 && (merged.allowedDepartments?.length || 0) === 0
          : merged.isPublic;

      data.lists[listIndex] = {
        ...merged,
        isPublic: typeof derivedPublic === 'boolean' ? derivedPublic : true,
      };
      writeJsonFile('links.json', data);
      return NextResponse.json(data.lists[listIndex]);
    }
    
    if (type === 'category') {
      if (!data.categories) data.categories = [];
      const catIndex = data.categories.findIndex(c => c.id === id);
      if (catIndex === -1) {
        return NextResponse.json({ error: 'Category not found' }, { status: 404 });
      }
      
      data.categories[catIndex] = { ...data.categories[catIndex], ...updates };
      writeJsonFile('links.json', data);
      return NextResponse.json(data.categories[catIndex]);
    }
    
    if (type === 'reorder-links') {
      const { linkIds } = body;
      linkIds.forEach((linkId: string, index: number) => {
        const link = data.links.find(l => l.id === linkId);
        if (link) link.order = index;
      });
      writeJsonFile('links.json', data);
      return NextResponse.json({ success: true });
    }
    
    if (type === 'reorder-lists') {
      const { listIds } = body;
      listIds.forEach((listId: string, index: number) => {
        const list = data.lists.find(l => l.id === listId);
        if (list) list.order = index;
      });
      writeJsonFile('links.json', data);
      return NextResponse.json({ success: true });
    }
    
    if (type === 'click') {
      const linkIndex = data.links.findIndex(l => l.id === id);
      if (linkIndex !== -1) {
        data.links[linkIndex].clickCount++;
        data.links[linkIndex].lastClickedAt = new Date().toISOString();
        writeJsonFile('links.json', data);
        return NextResponse.json(data.links[linkIndex]);
      }
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error updating:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

// DELETE - удалить ссылку, список или категорию
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    
    if (!id || !type) {
      return NextResponse.json({ error: 'ID and type are required' }, { status: 400 });
    }
    
    const data = readJsonFile<LinksData>('links.json', DEFAULT_DATA);
    
    if (type === 'link') {
      data.links = data.links.filter(l => l.id !== id);
      writeJsonFile('links.json', data);
      return NextResponse.json({ success: true });
    }
    
    if (type === 'list') {
      // Move links to first list or delete them
      const firstList = data.lists.find(l => l.id !== id);
      if (firstList) {
        data.links.forEach(link => {
          if (link.listId === id) {
            link.listId = firstList.id;
          }
        });
      } else {
        data.links = data.links.filter(l => l.listId !== id);
      }
      data.lists = data.lists.filter(l => l.id !== id);
      writeJsonFile('links.json', data);
      return NextResponse.json({ success: true });
    }
    
    if (type === 'category') {
      if (!data.categories) data.categories = [];
      // Remove category from links
      data.links.forEach(link => {
        if (link.categoryId === id) {
          link.categoryId = undefined;
        }
      });
      data.categories = data.categories.filter(c => c.id !== id);
      writeJsonFile('links.json', data);
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
