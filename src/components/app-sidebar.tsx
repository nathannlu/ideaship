"use client"

import * as React from "react"
import { ArchiveX, Command, File, Inbox, Send, Trash2 } from "lucide-react"
import { Logo } from "@/components/Logo"

import { NavUser } from "@/components/nav-user"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { useSession } from "next-auth/react"


// Extend AppSidebar to support custom nav items and optional content pane
interface NavItem {
  title: string
  url?: string
  icon: React.ComponentType<any>
  isActive?: boolean
}
interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navMain?: NavItem[]
  /**
   * Callback when a nav item is selected. Receives the selected NavItem.
   */
  onSelect?: (item: NavItem) => void
  /**
   * Whether to show the secondary content pane (default true). Set to false for icon-only sidebar.
   */
  showContent?: boolean
  /**
   * Controlled active tab title. If provided, AppSidebar becomes controlled for active state.
   */
  activeTitle?: string
  /**
   * Optional render function for the secondary content pane (receives the active nav item).
   */
  content?: (item: NavItem) => React.ReactNode
}
export function AppSidebar({ navMain, onSelect, showContent = true, content, activeTitle, ...props }: AppSidebarProps) {
  // Determine navigation items (default to sample data)
  const items: NavItem[] = navMain
  // Note: using state to show active item. IRL you should use the url/router.
  // Support controlled active tab (if activeTitle provided) or fallback to internal state
  const [internalActiveItem, setInternalActiveItem] = React.useState<NavItem>(() => {
    const preset = items.find((i) => i.isActive)
    return preset ?? items[0]
  })
  const isControlled = activeTitle !== undefined
  const activeItem: NavItem = isControlled
    ? items.find((i) => i.title === activeTitle) ?? internalActiveItem
    : internalActiveItem
  const { setOpen } = useSidebar()

  const { data: session, status } = useSession()

  return (
      <Sidebar
        collapsible="icon"
        className="overflow-hidden [&>[data-sidebar=sidebar]]:flex-row"
        {...props}
      >
      {/* This is the first sidebar */}
      {/* We disable collapsible and adjust width to icon. */}
      {/* This will make the sidebar appear as icons. */}
      {/* Icon-only sidebar */}
      <Sidebar
        collapsible="none"
        className="!w-[calc(var(--sidebar-width-icon)_+_1px)] border-r"
      >
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild className="md:h-8 md:p-0">
                <a href="/">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <Logo width={24} height={24} />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">Acme Inc</span>
                    <span className="truncate text-xs">Enterprise</span>
                  </div>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent className="px-1.5 md:px-0">
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      tooltip={{ children: item.title, hidden: false }}
                      onClick={() => {
                        // update active highlight if uncontrolled
                        if (!isControlled) {
                          setInternalActiveItem(item)
                        }
                        if (onSelect) {
                          onSelect(item)
                          return
                        }
                        setOpen(true)
                      }}
                      isActive={activeItem?.title === item.title}
                      className="px-2.5 md:px-2"
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={session?.user} />
        </SidebarFooter>
      </Sidebar>

      {/* This is the second sidebar */}
      {/* We disable collapsible and let it fill remaining space */}
      {showContent && (
        <Sidebar collapsible="none" className="hidden flex-1 md:flex">
          {/* Secondary panel: custom content or default mail list */}
          {content ? (
            content(activeItem)
          ) : (
            <>
              <SidebarHeader className="gap-3.5 border-b p-4">
                <div className="flex w-full items-center justify-between">
                  <div className="text-base font-medium text-foreground">
                    {activeItem?.title}
                  </div>
                  <Label className="flex items-center gap-2 text-sm">
                    <span>Unreads</span>
                    <Switch className="shadow-none" />
                  </Label>
                </div>
                <SidebarInput placeholder="Type to search..." />
              </SidebarHeader>
              <SidebarContent>
                <SidebarGroup className="px-0">
                  <SidebarGroupContent>
                    {mails.map((mail) => (
                      <a
                        href="#"
                        key={mail.email}
                        className="flex flex-col items-start gap-2 whitespace-nowrap border-b p-4 text-sm leading-tight last:border-b-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      >
                        <div className="flex w-full items-center gap-2">
                          <span>{mail.name}</span>{" "}
                          <span className="ml-auto text-xs">{mail.date}</span>
                        </div>
                        <span className="font-medium">{mail.subject}</span>
                        <span className="line-clamp-2 w-[260px] whitespace-break-spaces text-xs">
                          {mail.teaser}
                        </span>
                      </a>
                    ))}
                  </SidebarGroupContent>
                </SidebarGroup>
              </SidebarContent>
              <SidebarFooter>
                <NavUser user={session?.user} />
              </SidebarFooter>
            </>
          )}
        </Sidebar>
      )}
    </Sidebar>
  )
}
