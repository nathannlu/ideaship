import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { forkChatConversation } from '@/actions/chat-conversations'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sourceId = params.id
    if (!sourceId) {
      return NextResponse.json(
        { error: 'Missing source ID' },
        { status: 400 }
      )
    }

    const result = await forkChatConversation(sourceId)
    
    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error forking chat conversation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fork chat conversation' },
      { status: 500 }
    )
  }
}