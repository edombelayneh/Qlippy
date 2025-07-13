"use client"

import { type LucideIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useConversations } from "@/app/hooks/use-conversations"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    isActive?: boolean
  }[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const { conversations, activeConversationId, deleteConversation } = useConversations()

  const handleNavigation = (url: string) => {
    // If navigating away from chat, check if current conversation is empty
    if (pathname.startsWith('/chat') && !url.startsWith('/chat') && activeConversationId) {
      const currentConversation = conversations.find(c => c.id === activeConversationId)
      if (currentConversation && 
          (!currentConversation.messages || 
           currentConversation.messages.length === 0 ||
           currentConversation.messages.every(m => !m.content?.trim()))) {
        console.log("Deleting empty conversation on navigation:", activeConversationId)
        deleteConversation(activeConversationId)
      }
    }
    
    router.push(url)
  }

  return (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton 
            isActive={pathname === item.url}
            onClick={(e) => {
              e.preventDefault()
              handleNavigation(item.url)
            }}
          >
            <item.icon />
            <span>{item.title}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
