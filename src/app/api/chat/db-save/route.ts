import { NextResponse, NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

// Internal API to save chat: validates NextAuth session and project ownership
// Meant to be called by the /api/generate-code route
export async function POST(request: NextRequest) {
  // Authenticate via NextAuth JWT in cookie
  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
  if (!token?.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = token.userId;
  
  let body: {
    id?: string;
    messages: any[];
    files?: Record<string, string>;
  };

  try {
    body = await request.json();
  } catch (error) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }


  if (!body.messages || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Missing messages" }, { status: 400 });
  }

  // Ensure files is at least an empty object
  if (!body.files) {
    body.files = {};
  }

  try {
    // Extract title from first ideashipArtifact tag in assistant messages
    let projectTitle: string | null = null;
    for (const msg of body.messages) {
      if (msg.role === "assistant" && typeof msg.content === "string") {
        const m = msg.content.match(
          /<ideashipArtifact[^>]*\btitle=\"([^\"]+)\"[^>]*>/i
        );
        if (m) {
          projectTitle = m[1];
          break;
        }
      }
    }

    // Handle the new Project and Message models
    let project;
    let projectId = body.id;

    // Check if project exists
    if (projectId) {
      project = await prisma.project.findUnique({ where: { id: projectId } });
      // Ensure the project belongs to the authenticated user
      if (project && project.userId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      // Update project title if it's missing and we have a projectTitle
      if (project && (!project.title || project.title === "New Chat") && projectTitle) {
        project = await prisma.project.update({
          where: { id: projectId },
          data: { title: projectTitle },
        });
      }
    }

    // Create new project if needed
    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: userId,
          title: projectTitle || "New Chat",
        },
      });
      projectId = project.id;
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
        toolInvocations,
        experimental_attachments,
      } = message;

      // Convert createdAt to Date if it's a string
      const messageCreatedAt =
        typeof createdAt === "string"
          ? new Date(createdAt)
          : createdAt || new Date();

      // Save the message with parts as JSON
      await prisma.message.create({
        data: {
          externalId: externalId || undefined,
          projectId,
          role,
          content: typeof content === "string" ? content : JSON.stringify(content),
          reasoning: reasoning || undefined,
          createdAt: messageCreatedAt,
          parts: parts || undefined,
          toolInvocations: toolInvocations || undefined,
          experimental_attachments: experimental_attachments || undefined,
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        id: projectId,
        createdAt: project.createdAt,
        title: project.title,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving chat:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save chat" },
      { status: 500 }
    );
  }
}
