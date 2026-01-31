import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * Persist chat session using the new Project, Message models with files
 * Endpoint: POST /api/chat/save
 */
export async function POST(request: Request) {
  // Ensure the user is authenticated
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // Parse request body (expect files and messages)
  let body: { 
    id?: string;
    files: Record<string, string>; 
    messages: any[];
    userId?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 }
    );
  }

  // Ensure files is at least an empty object
  if (!body.files || typeof body.files !== 'object' || Array.isArray(body.files)) {
    body.files = {};
    console.log("Missing files property, using empty object instead");
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'Missing or invalid "messages" property' }, { status: 400 });
  }

  // Use the user ID from the session for security
  const userId = session.user.id;

  // Extract session title from first ideashipArtifact tag in assistant messages
  let projectTitle: string | null = null;
  for (const msg of body.messages) {
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      const m = msg.content.match(/<ideashipArtifact[^>]*\btitle=\"([^\"]+)\"[^>]*>/i);
      if (m) {
        projectTitle = m[1];
        break;
      }
    }
  }

  try {
    // First, handle backward compatibility with existing ChatSession model
    let chatSession;
    try {
      if (body.id) {
        // Update existing chat session for backward compatibility
        const existing = await prisma.chatSession.findUnique({ where: { id: body.id } });
        if (existing && existing.userId === userId) {
          // Merge previous files with incoming diffs
          const mergedFiles = { ...existing.files, ...body.files };
          chatSession = await prisma.chatSession.update({
            where: { id: body.id },
            data: { files: mergedFiles, messages: body.messages },
          });
        }
      } else {
        // Create a new chat session record with optional title for backward compatibility
        chatSession = await prisma.chatSession.create({
          data: {
            userId,
            files: body.files,
            messages: body.messages,
            title: projectTitle,
          },
        });
      }
    } catch (chatSessionError) {
      console.error("Error with ChatSession compatibility:", chatSessionError);
      // Continue even if this fails
    }

    // Now, handle the new Project and Message models
    let project;
    let projectId = body.id;

    // Check if project exists
    if (projectId) {
      project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      // Verify ownership
      if (project && project.userId !== userId) {
        return NextResponse.json({ error: 'Not authorized to access this project' }, { status: 403 });
      }
    }

    // Create new project if needed
    if (!project) {
      project = await prisma.project.create({
        data: {
          userId,
          title: projectTitle || "New Chat",
        },
      });
      projectId = project.id;
    }

    // Store the files
    for (const [path, content] of Object.entries(body.files)) {
      // Check if file exists
      const existingFile = await prisma.file.findUnique({
        where: {
          projectId_path: {
            projectId,
            path
          }
        }
      });

      if (existingFile) {
        // Update existing file
        await prisma.file.update({
          where: {
            projectId_path: {
              projectId,
              path
            }
          },
          data: { content }
        });
      } else {
        // Create new file
        await prisma.file.create({
          data: {
            projectId,
            path,
            content
          }
        });
      }
    }

    // Delete existing messages for this project (we'll replace them)
    await prisma.message.deleteMany({
      where: {
        projectId
      }
    });

    // Sort messages by createdAt to ensure correct order
    const sortedMessages = [...body.messages].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB; // Ascending order
    });
    
    // Save messages in correct order
    for (const message of sortedMessages) {
      // Extract message data
      const { 
        id: externalId, 
        role, 
        content, 
        parts, 
        createdAt,
        reasoning,
        toolInvocations 
      } = message;

      // Convert createdAt to Date if it's a string
      const messageCreatedAt = typeof createdAt === 'string' 
        ? new Date(createdAt) 
        : createdAt || new Date();

      // Save the message with parts as JSON
      await prisma.message.create({
        data: {
          externalId: externalId || undefined,
          projectId,
          role,
          content: typeof content === 'string' ? content : JSON.stringify(content),
          reasoning: reasoning || undefined,
          createdAt: messageCreatedAt,
          parts: parts || undefined,
          toolInvocations: toolInvocations || undefined,
        },
      });
    }

    return NextResponse.json(
      { 
        success: true, 
        id: projectId, 
        createdAt: project.createdAt,
        title: project.title 
      },
      { status: body.id ? 200 : 201 }
    );
  } catch (error) {
    console.error('Failed to save chat session:', error);
    return NextResponse.json({ error: 'Failed to persist chat session' }, { status: 500 });
  }
}