"use client"

import * as React from "react"
import {
  Blocks,
  Brain,
  Search,
  Settings,
  SquarePen
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useNavigation } from "@/app/hooks/use-navigation"
import { NavConversations } from "@/components/nav-conversations"
import { Conversation } from "@/lib/types"
import { useRouter } from "next/navigation"

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  conversations?: Conversation[]
  activeConversationId?: string
  onConversationSelect?: (id: string) => void
  onDeleteConversation?: (id: string) => void
  onNewConversation?: () => Promise<string | null>
}

export function AppSidebar({
  conversations,
  activeConversationId,
  onConversationSelect,
  onDeleteConversation,
  onNewConversation,
  ...props
}: AppSidebarProps) {
  const data = useNavigation()
  const router = useRouter()

  const handleNewChat = async () => {
    // Check if the current active conversation is empty before creating a new one
    if (activeConversationId && conversations) {
      const currentConversation = conversations.find(c => c.id === activeConversationId)
      if (currentConversation && 
          (!currentConversation.messages || 
           currentConversation.messages.length === 0 ||
           currentConversation.messages.every(m => !m.content?.trim()))) {
        console.log("Deleting empty conversation before creating new:", activeConversationId)
        if (onDeleteConversation) {
          onDeleteConversation(activeConversationId)
        }
      }
    }
    
    if (onNewConversation) {
      // If we have a new conversation handler, use it
      const newConversationId = await onNewConversation()
      if (newConversationId) {
        router.push(`/chat/${newConversationId}`)
      }
    } else {
      // Fallback to navigation
      router.push('/chat')
    }
  }

  // Filter out "New Chat" from the main nav since we'll handle it specially
  const filteredNavMain = data.navMain.filter(item => item.title !== "New Chat")

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <div className="flex items-center">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg mr-3">
                  <img
                    src="/qlippy-avatar.png"
                    alt="Qlippy"
                    width={32}
                    height={32}
                    className="rounded-lg"
                  />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate text-xl font-bold">Qlippy</span>
                </div>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Special New Chat Button */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton 
              onClick={(e) => {
                e.preventDefault()
                handleNewChat()
              }}
            >
              <SquarePen />
              <span>New Chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <NavMain items={filteredNavMain} />
        <NavConversations 
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={onConversationSelect}
          onDeleteConversation={onDeleteConversation}
        />
      </SidebarHeader>
      <SidebarContent>
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
