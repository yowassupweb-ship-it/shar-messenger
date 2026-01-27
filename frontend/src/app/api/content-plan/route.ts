import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data', 'content-plans');
const OLD_DATA_FILE = path.join(process.cwd(), 'data', 'content-plan.json');

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

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getPlanFilePath(planId: string): string {
  ensureDataDir();
  return path.join(DATA_DIR, `${planId}.json`);
}

function readData(planId: string = 'default'): ContentPlanData {
  const planFile = getPlanFilePath(planId);
  
  // Миграция старых данных для default плана
  if (planId === 'default' && !fs.existsSync(planFile) && fs.existsSync(OLD_DATA_FILE)) {
    try {
      const oldData = fs.readFileSync(OLD_DATA_FILE, 'utf-8');
      fs.writeFileSync(planFile, oldData);
    } catch (error) {
      console.error('Error migrating old data:', error);
    }
  }
  
  if (!fs.existsSync(planFile)) {
    fs.writeFileSync(planFile, JSON.stringify({ posts: [] }, null, 2));
  }
  
  const content = fs.readFileSync(planFile, 'utf-8');
  return JSON.parse(content);
}

function writeData(data: ContentPlanData, planId: string = 'default') {
  const planFile = getPlanFilePath(planId);
  fs.writeFileSync(planFile, JSON.stringify(data, null, 2));
}

function generateId(): string {
  return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// GET - получение постов
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId') || 'default';
    const data = readData(planId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading content plan:', error);
    return NextResponse.json({ posts: [] });
  }
}

// POST - создание поста
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId') || 'default';
    const body = await request.json();
    const data = readData(planId);
    
    const newPost: ContentPost = {
      id: generateId(),
      title: body.title,
      postText: body.postText || '',
      platforms: body.platforms || [],
      contentType: body.contentType || 'post',
      publishDate: body.publishDate,
      publishTime: body.publishTime || '12:00',
      mediaUrls: body.mediaUrls || [],
      postStatus: body.postStatus || 'draft',
      roles: body.roles || [],
      participants: body.participants || [],
      createdBy: body.createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      comments: []
    };
    
    data.posts.push(newPost);
    writeData(data, planId);
    
    return NextResponse.json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

// PUT - обновление поста
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get('planId') || 'default';
    const body = await request.json();
    const data = readData(planId);
    
    const postIndex = data.posts.findIndex(p => p.id === body.id);
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    data.posts[postIndex] = {
      ...data.posts[postIndex],
      title: body.title ?? data.posts[postIndex].title,
      postText: body.postText ?? data.posts[postIndex].postText,
      platform: body.platform ?? data.posts[postIndex].platform,
      platforms: body.platforms ?? data.posts[postIndex].platforms,
      contentType: body.contentType ?? data.posts[postIndex].contentType,
      publishDate: body.publishDate ?? data.posts[postIndex].publishDate,
      publishTime: body.publishTime ?? data.posts[postIndex].publishTime,
      mediaUrls: body.mediaUrls ?? data.posts[postIndex].mediaUrls,
      postStatus: body.postStatus ?? data.posts[postIndex].postStatus,
      roles: body.roles ?? data.posts[postIndex].roles,
      participants: body.participants ?? data.posts[postIndex].participants,
      assignedById: body.assignedById ?? data.posts[postIndex].assignedById,
      assignedToIds: body.assignedToIds ?? data.posts[postIndex].assignedToIds,
      updatedAt: new Date().toISOString()
    };
    
    writeData(data, planId);
    
    return NextResponse.json(data.posts[postIndex]);
  } catch (error) {
    console.error('Error updating post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

// PATCH - частичное обновление поста (например, только комментарии)
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const planId = searchParams.get('planId') || 'default';
    
    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }
    
    const body = await request.json();
    const data = readData(planId);
    
    const postIndex = data.posts.findIndex(p => p.id === id);
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    // Обновляем только переданные поля
    if (body.comments !== undefined) {
      data.posts[postIndex].comments = body.comments;
    }
    
    data.posts[postIndex].updatedAt = new Date().toISOString();
    
    writeData(data, planId);
    
    return NextResponse.json(data.posts[postIndex]);
  } catch (error) {
    console.error('Error patching post:', error);
    return NextResponse.json({ error: 'Failed to patch post' }, { status: 500 });
  }
}

// DELETE - удаление поста
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const planId = searchParams.get('planId') || 'default';
    
    if (!id) {
      return NextResponse.json({ error: 'Post ID required' }, { status: 400 });
    }
    
    const data = readData(planId);
    data.posts = data.posts.filter(p => p.id !== id);
    writeData(data, planId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
