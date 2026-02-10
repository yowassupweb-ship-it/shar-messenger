import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'content-plan.json');

interface Comment {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
  readBy?: string[];
}

interface ContentPost {
  id: string;
  title: string;
  postText?: string;
  platform?: 'telegram' | 'vk' | 'dzen' | 'max' | 'site';
  platforms?: ('telegram' | 'vk' | 'dzen' | 'site')[];
  contentType: 'post' | 'story' | 'video' | 'article' | 'mailing';
  publishDate: string;
  publishTime?: string;
  mediaUrls?: string[];
  postStatus: 'draft' | 'scheduled' | 'published' | 'approved';
  roles?: ('smm' | 'manager')[];
  participants?: string[];
  assignedById?: string;
  assignedToIds?: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  comments?: Comment[];
}

interface ContentPlanData {
  posts: ContentPost[];
}

function ensureDataFile() {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ posts: [] }, null, 2));
  }
}

function readData(): ContentPlanData {
  ensureDataFile();
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeData(data: ContentPlanData) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// PATCH - частичное обновление поста (например, только комментарии)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const data = readData();
    
    const postIndex = data.posts.findIndex(p => p.id === params.id);
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Обновляем только переданные поля
    if (body.comments !== undefined) {
      data.posts[postIndex].comments = body.comments;
    }
    
    data.posts[postIndex].updatedAt = new Date().toISOString();
    
    writeData(data);
    
    return NextResponse.json(data.posts[postIndex]);
  } catch (error) {
    console.error('Error patching post:', error);
    return NextResponse.json({ error: 'Failed to patch post' }, { status: 500 });
  }
}
