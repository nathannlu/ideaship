"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useParams } from "next/navigation"
import { useFileManager } from "@/vfs"
import { ChatConversation, publishChatConversation } from "@/actions/chat-conversations"
import { toast } from "@/hooks/use-toast"
import { EditingPanel } from "@/features/editor/EditingPanel"
import { ChatPanel } from "@/features/chat/ChatPanel"
import { PreviewPanel } from "@/features/preview/PreviewPanel"

import { SupportPopup } from "@/components/SupportPopup"


import { useElementSelection } from "@/lib/element-selection-stream"
import { useIsMobile } from "@/components/ui/use-mobile"
import { Layout } from "@/components/layout/WorkspaceLayout"

interface ChatPageComponentProps {
  initialConversation: ChatConversation | null
}

// Main chat page component with sidebar and preview panels
function ChatPageComponent({ initialConversation }: ChatPageComponentProps) {
  const [tab, setTab] = useState<'Generate' | 'Edit'>('Generate')
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const params = useParams()

  const { files, createFilesBulk } = useFileManager() as { files: Record<string, string>; createFilesBulk: (files: Record<string, string>) => Record<string, string> };
  const selectedElement = useElementSelection((s) => s.selectedElement);


  const [publishLoading, setPublishLoading] = useState<boolean>(false)
  const [deployLoading, setDeployLoading] = useState<boolean>(false)
  const conversationId = typeof params.id === 'string' ? params.id : null
  const previewRef = useRef<any>(null) as React.RefObject<any>;
  
  const initialMessages = initialConversation?.messages || []
  const [previewError, setPreviewError] = useState<string | null>(null);
  const initialFilesRef = useRef(false)

  const handleFix = () => {
    if (!previewError) return;
    
    // Store the error in localStorage to be processed when chat is ready
    localStorage.setItem('chatToProcess', JSON.stringify({ message: previewError }));
    
    // Dispatch a custom event to notify about the change
    window.dispatchEvent(new Event('localStorageChange'));
    
    setPreviewError(null)
    // Switch to Generate tab
    setTab('Generate');
    if (isMobile) {
      setDrawerOpen(true);
    }
  }

  
  useEffect(() => {
    if (initialConversation?.files && !initialFilesRef.current) {
      createFilesBulk(initialConversation.files)
      initialFilesRef.current = true
    }
  }, [initialConversation, createFilesBulk])

  useEffect(() => {
    if (selectedElement !== null) {
      setTab("Edit")
      if (isMobile) {
        setDrawerOpen(true)
      }
    }
  }, [selectedElement, isMobile])

  const handlePublishToggle = async () => {
    if (!conversationId) return

    try {
      setPublishLoading(true)
      const publishStatus = initialConversation?.published || false
      await publishChatConversation(conversationId, !publishStatus)
      window.location.reload()
    } catch (err) {
      console.error('Error toggling publish status:', err)
    } finally {
      setPublishLoading(false)
    }
  }

  const handleDeploy = async () => {
    if (conversationId) {
      setDeployLoading(true);

      try {
        toast({
          title: "Deploying site...",
          description: "Building and uploading your site to CDN",
          variant: "default" as const,
        });

        const previewIframe = previewRef.current;
        if (!previewIframe) {
          throw new Error("Preview not available. Please try again.");
        }

        const bundledHtml = await previewIframe.getBundledHtml();
        if (!bundledHtml) {
          throw new Error("Failed to generate preview. Please try again.");
        }

        const response = await fetch('/api/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: conversationId, html: bundledHtml }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to deploy site");
        }

        toast({
          title: "Site deployed successfully!",
          description: "Your site is now live on our CDN",
          variant: "default" as const,
        });

        window.open(`https://${conversationId}.ideaship.io`, '_blank');
        window.location.reload();
      } catch (error) {
        console.error("Failed to deploy site:", error);
        toast({
          title: "Deployment failed",
          description: error instanceof Error ? error.message : "Unknown error occurred",
          variant: "destructive" as const,
        });
      } finally {
        setDeployLoading(false);
      }
    }
  }

  return (
    <>
      <Layout
        isMobile={isMobile}
        tab={tab}
        setTab={setTab}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      >
        {{
          sidebar: tab === 'Generate' ? (
            <ChatPanel 
              initialMessages={initialMessages} 
            />
          ) : (
            <EditingPanel
              conversationId={conversationId}
              previewRef={previewRef}
              setTab={setTab}
            />
          ),
          preview: (
            <>
              <header className="sticky top-0 flex shrink-0 items-center gap-2 border-b bg-background px-4 py-2">
                {!isMobile && (
                  <>
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                  </>
                )}

                <div className="ml-auto flex gap-2">
                  {/*conversationId && (
                    <Button
                      variant={initialConversation?.published ? "destructive" : "default"}
                      onClick={handlePublishToggle}
                      disabled={publishLoading}
                    >
                      {publishLoading ? "Processing..." : initialConversation?.published ? "Unpublish" : "Publish to Community"}
                    </Button>
                  )*/}
                  {conversationId && initialConversation?.deployedUrl && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(`https://${conversationId}.ideaship.io`, '_blank');
                      }}
                    >
                      View Site
                    </Button>
                  )}
                  <Button
                    onClick={handleDeploy}
                    disabled={!conversationId || deployLoading}
                  >
                    {deployLoading ? "Deploying..." : "Preview & Deploy"}
                  </Button>
                </div>
              </header>

              <PreviewPanel
                files={files}
                previewError={previewError}
                generating={false}
                onError={setPreviewError}
                onFix={handleFix}
                previewRef={previewRef}
              />
            </>
          )
        }}
      </Layout>
      <SupportPopup />
    </>
  )
}

export default ChatPageComponent