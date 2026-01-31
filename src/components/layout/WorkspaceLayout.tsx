"use client"

import React from "react"
import { MessageSquare, Edit3 } from "lucide-react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebar } from "@/components/app-sidebar"
import { Drawer, DrawerContent } from "@/components/ui/drawer"
import { useIsMobile } from "@/components/ui/use-mobile"

interface LayoutProps {
  children: {
    sidebar: React.ReactNode
    preview: React.ReactNode
  }
  isMobile: boolean
  tab: 'Generate' | 'Edit'
  setTab: (tab: 'Generate' | 'Edit') => void
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

export function Layout({ children, isMobile, tab, setTab, drawerOpen, setDrawerOpen }: LayoutProps) {
  if (isMobile) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-grow overflow-auto pb-16 px-4">
          {tab === 'Generate' ? (
            children.sidebar
          ) : (
            <div className="flex flex-col h-screen">
              {children.preview}
            </div>
          )}
        </div>
        <nav className="fixed bottom-0 left-0 right-0 z-10 flex bg-background border-t">
          <button
            onClick={() => setTab('Generate')}
            className={`flex-1 py-2 flex flex-col items-center justify-center ${
              tab === 'Generate' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <MessageSquare />
            <span className="text-xs">Chat</span>
          </button>
          <button
            onClick={() => setTab('Edit')}
            className={`flex-1 py-2 flex flex-col items-center justify-center ${
              tab === 'Edit' ? 'text-primary' : 'text-gray-500'
            }`}
          >
            <Edit3 />
            <span className="text-xs">Preview</span>
          </button>
        </nav>
        <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
          <DrawerContent className="p-4">
            {children.sidebar}
          </DrawerContent>
        </Drawer>
      </div>
    )
  }

  return (
    <SidebarProvider style={{ '--sidebar-width': '520px' } as React.CSSProperties}>
      <AppSidebar
        navMain={[
          { title: 'Generate', icon: MessageSquare },
          { title: 'Edit', icon: Edit3 },
        ]}
        activeTitle={tab}
        onSelect={(item) => setTab(item.title as 'Generate' | 'Edit')}
        content={() => (
          <div className="p-4 h-full">
            {children.sidebar}
          </div>
        )}
      />
      <SidebarInset>
        {children.preview}
      </SidebarInset>
    </SidebarProvider>
  )
} 