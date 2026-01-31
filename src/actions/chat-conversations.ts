"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/prisma"
import { S3 } from "@aws-sdk/client-s3"
import { vfsToGitSnapshot, gitSnapshotToVfs } from "@/lib/git-utils"

// Types
export type MessagePart = {
  type: string;
  text?: string;
  reasoning?: string;
  details?: any;
  [key: string]: any;
};

export type Message = {
  id?: string;
  role: "user" | "assistant";
  content: any;
  createdAt?: string;
  parts?: MessagePart[];
  reasoning?: string;
  toolInvocations?: any[];
  experimental_attachments?: any;
}

export type ChatConversation = {
  id: string
  userId: string
  files: Record<string, string>
  messages: Message[]
  title?: string | null
  createdAt: string
  published: boolean
  publishedAt?: string | null
  deployedUrl?: string | null
  deployedAt?: string | null
}

/**
 * Load a specific chat conversation by ID
 */
export async function getChatConversation(id: string): Promise<ChatConversation> {
  const startTime = performance.now();
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const dbStartTime = performance.now();
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    const dbEndTime = performance.now();
    console.log(`Database query took ${(dbEndTime - dbStartTime).toFixed(2)}ms`);
    
    if (!project || project.userId !== session.user.id) {
      throw new Error("Project not found")
    }

    // Get files from git snapshot only
    let filesRecord: Record<string, string> = {};
    
    try {
      // Load files from git snapshot
      const snapshotStartTime = performance.now();
      filesRecord = await gitSnapshotToVfs(id);
      const snapshotEndTime = performance.now();
      console.log(`Loading git snapshot took ${(snapshotEndTime - snapshotStartTime).toFixed(2)}ms`);
      console.log(`Successfully loaded git snapshot for project ${id}`);
    } catch (snapshotError) {
      // Log but continue with empty file set
      console.log(`No git snapshot found for project ${id} or error loading it:`, snapshotError);
    }
    
    // Convert messages to expected format
    const messageStartTime = performance.now();
    const messages: Message[] = project.messages.map(msg => {
      // Handle potential JSON stored as string in content field
      let content = msg.content;
      try {
        if (typeof content === 'string' && (content.startsWith('{') || content.startsWith('['))) {
          content = JSON.parse(content);
        }
      } catch (e) {
        // Keep as string if parsing fails
      }
      
      // Convert DB message to API message format
      const message: Message = {
        id: msg.externalId || msg.id,
        role: msg.role as "user" | "assistant",
        content: content,
        createdAt: msg.createdAt.toISOString()
      };
      
      // Add parts if available
      if (msg.parts) {
        (message as any).parts = msg.parts;
      }
      
      // Add reasoning if available
      if (msg.reasoning) {
        (message as any).reasoning = msg.reasoning;
      }
      
      // Add toolInvocations if available
      if (msg.toolInvocations) {
        try {
          (message as any).toolInvocations = typeof msg.toolInvocations === 'string' 
            ? JSON.parse(msg.toolInvocations) 
            : msg.toolInvocations;
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Add experimental_attachments
      if (msg.experimental_attachments) {
        try {
          (message as any).experimental_attachments = typeof msg.experimental_attachments === 'string'
            ? JSON.parse(msg.experimental_attachments)
            : msg.experimental_attachments;
        } catch (e) {
          // Ignore parse errors for experimental_attachments
          console.log('Error parsing experimental_attachments:', e);
        }
      }
    
      return message;
    });
    const messageEndTime = performance.now();
    console.log(`Message processing took ${(messageEndTime - messageStartTime).toFixed(2)}ms`);
    
    const endTime = performance.now();
    console.log(`Total getChatConversation execution time: ${(endTime - startTime).toFixed(2)}ms`);
    
    return {
      id: project.id,
      userId: project.userId,
      files: filesRecord,
      messages: messages,
      title: project.title,
      createdAt: project.createdAt.toISOString(),
      published: project.published,
      publishedAt: project.publishedAt ? project.publishedAt.toISOString() : null,
      deployedUrl: project.deployedUrl || null,
      deployedAt: project.deployedAt ? project.deployedAt.toISOString() : null,
    };
  } catch (error) {
    const endTime = performance.now();
    console.error(`getChatConversation failed after ${(endTime - startTime).toFixed(2)}ms:`, error);
    throw new Error("Failed to retrieve conversation")
  }
}

/**
 * Deploy chat session by storing bundled HTML to S3
 */
export async function deployChatSession(id: string, html: string): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== session.user.id) {
      throw new Error("Not authorized to deploy this project");
    }

    // Configure S3 client
    const spacesEndpoint = process.env.SPACES_ENDPOINT;
    const spacesBucket = process.env.SPACES_BUCKET;

    if (!spacesEndpoint || !spacesBucket) {
      throw new Error("Storage configuration missing");
    }

    const s3 = new S3({
      endpoint: spacesEndpoint,
      region: process.env.SPACES_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.SPACES_KEY || '',
        secretAccessKey: process.env.SPACES_SECRET || '',
      },
      forcePathStyle: true,
    });

    // Process HTML to ensure proper resource paths
    const processedHtml = html
      .replace('<head>', '<head>\n  <base href="/">')
      .replace('</body>', `
  <div style="position: fixed; bottom: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; z-index: 9999;">
    <a href="https://ideaship.io" style="color: white; text-decoration: none;" target="_blank">
      Made with Ideaship
    </a>
  </div>
</body>`);

    // Generate key for the deployed HTML file
    const key = `sites/${id}/index.html`;

    // Upload the HTML file to S3
    await s3.putObject({
      Bucket: spacesBucket,
      Key: key,
      Body: Buffer.from(processedHtml),
      ACL: 'public-read',
      ContentType: 'text/html',
      CacheControl: 'max-age=3600',
    });

    // Save the deployed URL 
    const deployedUrl = `${spacesEndpoint}/${spacesBucket}/${key}`;
    const now = new Date();

    // Update the project with the deployed URL
    await prisma.project.update({
      where: { id },
      data: {
        deployedUrl,
        deployedAt: now
      }
    });

    // Revalidate paths
    revalidatePath(`/chat/${id}`);
    revalidatePath(`/sites/${id}`);

    return deployedUrl;
  } catch (err: any) {
    console.error('Deployment error:', err);
    throw new Error('Deployment failed: ' + err.message);
  }
}

/**
 * Delete a chat conversation by ID
 */
export async function deleteChatConversation(id: string): Promise<void> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== session.user.id) {
      throw new Error("Project not found");
    }

    // Delete all associated messages and files first
    await prisma.message.deleteMany({ where: { projectId: id } });
    await prisma.file.deleteMany({ where: { projectId: id } });
    
    // Then delete the project
    await prisma.project.delete({ where: { id } });
    revalidatePath('/chat');
  } catch (error) {
    console.error("Failed to delete chat conversation:", error);
    throw new Error("Failed to delete conversation");
  }
}

/**
 * Get list of chat conversations for the current user
 */
export async function listChatConversations(): Promise<{ id: string, title: string | null, createdAt: string, published: boolean, publishedAt: string | null }[]> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const projects = await prisma.project.findMany({
      where: { userId: session.user.id },
      select: { id: true, createdAt: true, title: true, published: true, publishedAt: true },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map(proj => ({
      id: proj.id,
      title: proj.title,
      createdAt: proj.createdAt.toISOString(),
      published: proj.published,
      publishedAt: proj.publishedAt ? proj.publishedAt.toISOString() : null
    }));
  } catch (error) {
    console.error("Failed to list chat conversations:", error)
    throw new Error("Failed to list conversations")
  }
}

/**
 * Save or update a chat conversation
 */
export async function saveChatConversation(input: {
  id?: string
  files: Record<string, string>
  messages: Message[]
}): Promise<{ id: string, title: string | null, createdAt: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  if (!input.files || typeof input.files !== 'object' || Array.isArray(input.files)) {
    throw new Error("Missing or invalid files property")
  }
  
  if (!input.messages || !Array.isArray(input.messages)) {
    throw new Error("Missing or invalid messages property")
  }

  // Extract title from first ideashipArtifact tag in assistant messages
  let conversationTitle: string | null = null
  for (const msg of input.messages) {
    if (msg.role === 'assistant' && typeof msg.content === 'string') {
      const match = msg.content.match(/<ideashipArtifact[^>]*\btitle=\"([^\"]+)\"[^>]*>/i)
      if (match) {
        conversationTitle = match[1]
        break
      }
    }
  }

  try {
    let project: { id: string; title: string | null; createdAt: Date }
    
    if (input.id) {
      // Update existing project
      const existing = await prisma.project.findUnique({ 
        where: { id: input.id } 
      })
      
      if (!existing || existing.userId !== session.user.id) {
        throw new Error("Project not found")
      }

      // Update the project
      project = await prisma.project.update({
        where: { id: input.id },
        data: { 
          title: conversationTitle || existing.title
        },
      })

      // Save files to git snapshot only, not in database
      try {
        // Get existing files from git snapshot
        let allFiles: Record<string, string> = {};
        
        try {
          // Try to load existing files from git snapshot
          allFiles = await gitSnapshotToVfs(input.id);
          console.log(`Successfully loaded existing git snapshot for project ${input.id}`);
        } catch (err) {
          console.log(`No existing git snapshot found for project ${input.id} or error loading it:`, err);
          // If there's no git snapshot yet, we start with an empty VFS
        }
        
        // Merge with new files (new files take precedence)
        for (const [path, content] of Object.entries(input.files)) {
          allFiles[path] = content;
        }
        
        // Save to git snapshot
        await vfsToGitSnapshot(input.id, allFiles);
        console.log(`Successfully created git snapshot for updated project ${input.id}`);
      } catch (snapshotError) {
        console.error('Error creating git snapshot for updated project:', snapshotError);
        throw new Error('Failed to save files to git snapshot');
      }

      // Update messages
      await prisma.message.deleteMany({
        where: { projectId: input.id }
      })
      
      await Promise.all(input.messages.map(msg => 
        prisma.message.create({
          data: {
            projectId: input.id!,
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            externalId: msg.id,
            parts: msg.parts,
            reasoning: msg.reasoning,
            toolInvocations: msg.toolInvocations ? JSON.stringify(msg.toolInvocations) : null,
            createdAt: new Date()
          }
        })
      ))
    } else {
      // Create a new project
      project = await prisma.project.create({
        data: {
          userId: session.user.id,
          title: conversationTitle,
        },
      })

      // Save files to git snapshot only, not in database
      try {
        await vfsToGitSnapshot(project.id, input.files);
        console.log(`Successfully created git snapshot for new project ${project.id}`);
      } catch (snapshotError) {
        console.error('Error creating git snapshot for new project:', snapshotError);
        throw new Error('Failed to save files to git snapshot');
      }

      // Create messages
      await Promise.all(input.messages.map(msg => 
        prisma.message.create({
          data: {
            projectId: project.id,
            role: msg.role,
            content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
            externalId: msg.id,
            parts: msg.parts,
            reasoning: msg.reasoning,
            toolInvocations: msg.toolInvocations ? JSON.stringify(msg.toolInvocations) : null,
            createdAt: new Date()
          }
        })
      ))
    }

    // Revalidate paths
    revalidatePath('/chat')
    revalidatePath(`/chat/${project.id}`)
    
    return {
      id: project.id,
      title: project.title,
      createdAt: project.createdAt.toISOString()
    }
  } catch (error) {
    console.error("Failed to save chat conversation:", error)
    throw new Error("Failed to save conversation")
  }
}

/**
 * Publish or unpublish a chat conversation
 */
export async function publishChatConversation(id: string, publish: boolean): Promise<{ published: boolean, publishedAt: string | null }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== session.user.id) {
      throw new Error("Project not found");
    }

    // Update the published status
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        published: publish,
        publishedAt: publish ? new Date() : null
      },
    });

    // Revalidate paths
    revalidatePath('/chat');
    revalidatePath(`/chat/${id}`);
    revalidatePath('/community');

    return {
      published: updatedProject.published,
      publishedAt: updatedProject.publishedAt ? updatedProject.publishedAt.toISOString() : null
    };
  } catch (error) {
    console.error("Failed to update publish status:", error);
    throw new Error("Failed to update publish status");
  }
}

/**
 * List published community chat conversations
 */
export async function listPublishedConversations(): Promise<{
  id: string,
  title: string | null,
  createdAt: string,
  publishedAt: string | null,
  userId: string
}[]> {
  try {
    const publishedProjects = await prisma.project.findMany({
      where: { published: true },
      select: {
        id: true,
        createdAt: true,
        title: true,
        publishedAt: true,
        userId: true
      },
      orderBy: { publishedAt: 'desc' },
    });

    return publishedProjects.map(proj => ({
      id: proj.id,
      title: proj.title,
      createdAt: proj.createdAt.toISOString(),
      publishedAt: proj.publishedAt ? proj.publishedAt.toISOString() : null,
      userId: proj.userId
    }));
  } catch (error) {
    console.error("Failed to list published conversations:", error);
    throw new Error("Failed to list published conversations");
  }
}

/**
 * Fork a published chat conversation to create a new one for the current user
 */
export async function forkChatConversation(sourceId: string): Promise<{ id: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    const sourceProject = await prisma.project.findUnique({
      where: { id: sourceId, published: true },
      include: {
        files: true
      }
    });

    if (!sourceProject) {
      throw new Error("Published project not found");
    }

    // Create a new project based on the source
    const forkedProject = await prisma.project.create({
      data: {
        userId: session.user.id,
        title: `Fork of ${sourceProject.title || 'Untitled Project'}`,
        published: false
      },
    });

    // Get files from git snapshot if available
    let allFiles: Record<string, string> = {};
    
    // First, try to get files from git snapshot
    try {
      allFiles = await gitSnapshotToVfs(sourceId);
      console.log(`Successfully loaded git snapshot for source project ${sourceId}`);
    } catch (snapshotError) {
      console.log(`No git snapshot found for source project ${sourceId} or error loading it:`, snapshotError);
      
      // Fallback to database files if git snapshot not available
      // This is for backward compatibility with projects created before this change
      for (const file of sourceProject.files) {
        allFiles[file.path] = file.content;
      }
    }
    
    // Create a git snapshot for the new project (save files only to git snapshot, not to db)
    try {
      await vfsToGitSnapshot(forkedProject.id, allFiles);
      console.log(`Successfully created git snapshot for forked project ${forkedProject.id}`);
    } catch (snapshotError) {
      console.error('Error creating git snapshot for forked project:', snapshotError);
      throw new Error('Failed to save files to git snapshot');
    }

    // Revalidate paths
    revalidatePath('/chat');

    return { id: forkedProject.id };
  } catch (error) {
    console.error("Failed to fork conversation:", error);
    throw new Error("Failed to fork conversation");
  }
}


// TO DEPRECATE
/**
 * Upload an image for chat
 */
export async function uploadChatImage(formData: FormData): Promise<{ url: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const file = formData.get('file')
  if (!file || !(file instanceof Blob)) {
    throw new Error("No valid file provided")
  }

  // Read file data
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Configure S3 client for DigitalOcean Spaces
  const spacesEndpoint = process.env.SPACES_ENDPOINT
  const spacesBucket = process.env.SPACES_BUCKET
  
  if (!spacesEndpoint || !spacesBucket) {
    throw new Error("Storage configuration missing")
  }
  
  const s3 = new S3({
    endpoint: spacesEndpoint,
    region: process.env.SPACES_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.SPACES_KEY || '',
      secretAccessKey: process.env.SPACES_SECRET || '',
    },
    forcePathStyle: true,
  })

  // Generate unique key for the file
  const filename = (file as File).name
  const key = `chat/${session.user.id}/${Date.now()}-${filename}`
  
  try {
    await s3.putObject({
      Bucket: spacesBucket,
      Key: key,
      Body: buffer,
      ACL: 'public-read',
      ContentType: (file as File).type,
    })
    
    // Construct public URL (path style)
    const url = `${spacesEndpoint}/${spacesBucket}/${key}`
    return { url }
  } catch (err: any) {
    console.error('Image upload error:', err)
    throw new Error('Image upload failed: ' + err.message)
  }
}

export async function saveFiles(id: string, createdFiles: Record<string, string>) {
  const startTime = performance.now();
  try {
    // First verify the project exists and user has access
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project || project.userId !== session.user.id) {
      throw new Error("Project not found");
    }

    let allFiles: Record<string, string> = createdFiles;
    
    // Save all files to git snapshot (not to database)
    try {
      const snapshotStartTime = performance.now();
      await vfsToGitSnapshot(id, allFiles);
      const snapshotEndTime = performance.now();
      console.log(`Successfully created git snapshot for project ${id} in ${(snapshotEndTime - snapshotStartTime).toFixed(2)}ms`);
    } catch (snapshotError) {
      console.error('Error creating git snapshot:', snapshotError);
      throw new Error('Failed to save files to git snapshot');
    }

    // Revalidate the chat page to reflect changes
    //revalidatePath(`/chat/${id}`);
    
    const endTime = performance.now();
    console.log(`Total time to save files: ${(endTime - startTime).toFixed(2)}ms`);
    
    return { 
      success: true,
      timing: {
        total: (endTime - startTime).toFixed(2)
      }
    };
  } catch (error) {
    const endTime = performance.now();
    console.error(`Error saving files (took ${(endTime - startTime).toFixed(2)}ms):`, error);
    throw new Error('Failed to save files');
  }
}