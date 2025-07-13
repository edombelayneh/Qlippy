import React from "react"
import { type LucideIcon } from "lucide-react"
import { useRouter, usePathname } from "next/navigation"
import { useConversations } from "@/app/hooks/use-conversations"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavSecondary({
  items,
  ...props
}: {
  items: {
    title: string
    url: string
    icon: LucideIcon
    badge?: React.ReactNode
  }[]
} & React.ComponentPropsWithoutRef<typeof SidebarGroup>) {
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
        console.log("Deleting empty conversation on secondary navigation:", activeConversationId)
        deleteConversation(activeConversationId)
      }
    }
    
    router.push(url)
  }

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                isActive={pathname === item.url}
                onClick={(e) => {
                  e.preventDefault()
                  handleNavigation(item.url)
                }}
                title={item.title}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
              {item.badge && <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>}
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
