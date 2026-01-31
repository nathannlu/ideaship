import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * List all chat sessions for the authenticated user.
 * Endpoint: GET /api/chat/list
 */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId: session.user.id },
      select: { id: true, createdAt: true, title: true },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('Failed to list chat sessions:', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}