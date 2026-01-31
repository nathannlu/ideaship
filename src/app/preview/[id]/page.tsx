import React from 'react'
import { redirect, notFound } from 'next/navigation'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { prisma } from '@/lib/prisma'
import ChatSessionPreview from '@/components/ChatSessionPreview'
import { gitSnapshotToVfs } from '@/lib/git-utils'

interface PageProps {
  params: { id: string }
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  // Authenticate user
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.id) {
    // Redirect to sign-in with callback
    redirect(`/api/auth/signin?callbackUrl=/preview/${id}`)
  }

  // Fetch project and ensure ownership
  const project = await prisma.project.findUnique({
    where: { id: id }
  })
  
  if (!project || project.userId !== session.user.id) {
    notFound()
  }

  // Load files from git snapshot
  let files: Record<string, string> = {}
  try {
    const rawFiles = await gitSnapshotToVfs(id)
    // Normalize file paths to start with "/"
    files = Object.entries(rawFiles).reduce((acc, [path, content]) => {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`
      acc[normalizedPath] = content
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    console.error('Error loading git snapshot:', error)
    // If git snapshot fails, we'll show an empty preview
  }

  // Fullscreen preview of generated files
  return (
    <div className="fixed inset-0">
      <ChatSessionPreview files={files} />
    </div>
  )
}
