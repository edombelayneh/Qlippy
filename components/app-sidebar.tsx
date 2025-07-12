"use client"

import * as React from "react"
import {
  Blocks,
  Brain,
  Search,
  Settings,
  SquarePen
} from "lucide-react"

import { NavFavorites } from "@/components/nav-favorites"
import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavSpaces } from "@/components/nav-spaces"
import { ConversationList } from "@/components/conversation-list"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

interface Space {
  id: string
  name: string
  icon: string
  color: string
  conversationCount?: number
}

interface Conversation {
  id: string
  title: string
  messages: any[]
  messageCount: number
  lastUpdated: Date
  folder?: string
}

interface Plugin {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface AIModel {
  id: string
  name: string
  description: string
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  // Legacy props for backward compatibility
  spaces?: Space[]
  selectedSpace?: string | null
  onSpaceSelect?: (spaceId: string | null) => void
  onAddSpace?: () => void
  
  // New props for conversation management
  conversations?: Conversation[]
  activeConversationId?: string | null
  onConversationSelect?: (id: string) => void
  onCreateConversation?: () => void
  onDeleteConversation?: () => void
  
  // Plugin and model management
  plugins?: Plugin[]
  onTogglePlugin?: (pluginId: string) => void
  availableModels?: AIModel[]
  selectedModel?: string
  onModelSelect?: (modelId: string) => void
  
  // Space selection for new conversations
  selectedSpaceForNewConversation?: string | null
  onSelectSpaceForNewConversation?: (spaceId: string | null) => void
}

export function AppSidebar({ 
  spaces = [],
  selectedSpace = null,
  onSpaceSelect,
  onAddSpace,
  conversations = [],
  activeConversationId,
  onConversationSelect,
  onCreateConversation,
  onDeleteConversation,
  plugins = [],
  onTogglePlugin,
  availableModels = [],
  selectedModel,
  onModelSelect,
  selectedSpaceForNewConversation,
  onSelectSpaceForNewConversation,
  ...props 
}: AppSidebarProps) {
  const { state } = useSidebar()
  const isExpanded = state === "expanded"

  // This is sample data.
  const data = {
    teams: [
      {
        name: "Qlippy",
        logo: Brain,
        plan: "Enterprise",
      }
    ],
    navMain: [
      {
        title: "New Chat",
        url: "/chat",
        icon: SquarePen,
        onClick: onCreateConversation,
      },
      {
        title: "Search Chats",
        url: "/search",
        icon: Search,
      },
      {
        title: "Plugins",
        url: "/plugins",
        icon: Blocks,
      },
    ],
    navSecondary: [
      {
        title: "Settings",
        url: "/settings",
        icon: Settings,
      },
    ],
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center">
                <SidebarTrigger className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg mr-3" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-xl font-bold">Qlippy</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        {/* Show conversations only when sidebar is expanded */}
        {isExpanded && conversations.length > 0 ? (
          <ConversationList
            conversations={conversations}
            activeConversationId={activeConversationId || ""}
            onConversationSelect={onConversationSelect || (() => {})}
            onNewConversation={onCreateConversation || (() => {})}
            folders={spaces.map(space => ({
              id: space.id,
              name: space.name,
              icon: space.icon,
              color: space.color
            }))}
            selectedFolder={selectedSpace}
            onFolderSelect={onSpaceSelect || (() => {})}
            onAddFolder={(conversationId, folderId) => {
              // This would need to be implemented
              console.log('Add folder to conversation:', conversationId, folderId)
            }}
            onRemoveFolder={(conversationId) => {
              // This would need to be implemented
              console.log('Remove folder from conversation:', conversationId)
            }}
          />
        ) : isExpanded && (
          <NavSpaces 
            spaces={spaces}
            selectedSpace={selectedSpace}
            onSpaceSelect={onSpaceSelect || (() => {})}
            onAddSpace={onAddSpace}
          />
        )}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
