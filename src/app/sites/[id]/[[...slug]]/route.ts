import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; slug?: string[] } }
) {
  try {
    const { id, slug } = await params
    // Determine the requested path (root or nested)
    const relativePath = '/' 

    const project = await prisma.project.findFirst({
      where: { id },
    })

    if (!project) {
      return new Response('Site not found', { status: 404 })
    }

    // If the site has not been deployed, redirect to the main page
    if (!project.deployedUrl) {
      return NextResponse.redirect(new URL(`/sites/${id}`, request.url))
    }

    // Build the CDN URL based on the requested path
    let cdnUrl = project.deployedUrl
    if (relativePath !== '/') {
      // Remove trailing index.html if present
      cdnUrl = cdnUrl.replace(/\/index\.html$/, '')
      // Append the nested path
      cdnUrl = `${cdnUrl}${relativePath}`
    }

    const response = await fetch(cdnUrl)
    if (!response.ok) {
      if (response.status === 404 && relativePath !== '/') {
        // Fallback to main index on 404 for nested paths
        return NextResponse.redirect(new URL(`/sites/${id}`, request.url))
      }
      return new Response(`Failed to load content: ${response.status}`, {
        status: response.status,
      })
    }

    const content = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'text/html'

    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch (error) {
    console.error('Error proxying site content:', error)
    return new Response('Server error', { status: 500 })
  }
}
