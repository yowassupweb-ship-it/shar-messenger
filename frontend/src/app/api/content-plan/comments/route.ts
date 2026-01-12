import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'content-plan.json');

interface Comment {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
}

interface ContentPost {
  id: string;
  comments?: Comment[];
}

interface ContentPlanData {
  posts: ContentPost[];
}

function readData(): ContentPlanData {
  const content = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(content);
}

function writeData(data: ContentPlanData) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// POST - добавление комментария
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postId, text, authorId } = body;
    
    if (!postId || !text) {
      return NextResponse.json({ error: 'Post ID and text required' }, { status: 400 });
    }
    
    const data = readData();
    const postIndex = data.posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    const newComment: Comment = {
      id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text,
      authorId: authorId || '',
      createdAt: new Date().toISOString()
    };
    
    if (!data.posts[postIndex].comments) {
      data.posts[postIndex].comments = [];
    }
    data.posts[postIndex].comments!.push(newComment);
    
    writeData(data);
    
    return NextResponse.json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
  }
}

// DELETE - удаление комментария
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const postId = searchParams.get('postId');
    const commentId = searchParams.get('commentId');
    
    if (!postId || !commentId) {
      return NextResponse.json({ error: 'Post ID and Comment ID required' }, { status: 400 });
    }
    
    const data = readData();
    const postIndex = data.posts.findIndex(p => p.id === postId);
    
    if (postIndex === -1) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }
    
    if (data.posts[postIndex].comments) {
      data.posts[postIndex].comments = data.posts[postIndex].comments!.filter(c => c.id !== commentId);
    }
    
    writeData(data);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}
