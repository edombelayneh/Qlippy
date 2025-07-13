"use client"

import * as React from "react"
import {
  MessageCircleMore,
  Trash2,
} from "lucide-react"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { useConversations } from "@/app/hooks/use-conversations"
import { Conversation } from "@/lib/types"
import { useRouter, usePathname } from "next/navigation"

interface NavConversationsProps {
  conversations?: Conversation[]
  activeConversationId?: string
  onConversationSelect?: (id: string) => void
  onDeleteConversation?: (id: string) => void
}

export function NavConversations({ 
  conversations: propConversations,
  activeConversationId: propActiveConversationId,
  onConversationSelect,
  onDeleteConversation
}: NavConversationsProps) {
  const { 
    conversations: hookConversations, 
    deleteConversation, 
    activeConversationId: hookActiveConversationId, 
    setActiveConversationId 
  } = useConversations()
  
  // Use props if provided, otherwise fall back to hook
  const conversations = propConversations || hookConversations
  const activeConversationId = propActiveConversationId || hookActiveConversationId
  const handleConversationSelect = onConversationSelect || setActiveConversationId
  const handleDeleteConversation = onDeleteConversation || deleteConversation
  
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  const handleDeleteClick = (conversationId: string) => {
    setItemToDelete(conversationId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      const wasActiveConversation = itemToDelete === activeConversationId
      handleDeleteConversation(itemToDelete)
      
      // If we're deleting the active conversation, navigate to reset the page
      if (wasActiveConversation) {
        router.push('/chat')
      }
      
      setItemToDelete(null)
    }
  }

  const handleConversationClick = (id: string) => {
    // Before navigating, check if the current active conversation is empty
    const currentConversation = conversations.find(c => c.id === activeConversationId)
    if (currentConversation && 
        activeConversationId !== id && // Don't delete if clicking the same conversation
        (!currentConversation.messages || 
         currentConversation.messages.length === 0 ||
         currentConversation.messages.every(m => !m.content?.trim()))) {
      console.log("Deleting empty conversation before navigation:", activeConversationId)
      handleDeleteConversation(activeConversationId)
    }
    
    router.push(`/chat/${id}`)
  }

  // Don't render anything if there are no conversations
  if (conversations.length === 0) {
    return null
  }

  // Show only first 10 conversations in the sidebar
  const displayedConversations = conversations.slice(0, 10)

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <SidebarMenu>
            {displayedConversations.map((item: Conversation) => (
              <SidebarMenuItem 
                key={item.id}
              >
                <SidebarMenuButton 
                  isActive={item.id === activeConversationId && pathname === '/chat'}
                  onClick={(e) => {
                    e.preventDefault()
                    handleConversationClick(item.id)
                  }}
                  title={item.title}
                >
                  <span className="truncate">{item.title}</span>
                </SidebarMenuButton>
                <SidebarMenuAction 
                  showOnHover
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  onClick={(e) => {
                    e.preventDefault()
                    handleDeleteClick(item.id)
                  }}
                >
                  <Trash2 />
                  <span className="sr-only">Delete chat</span>
                </SidebarMenuAction>
              </SidebarMenuItem>
            ))}
            {/* Only show "All Chats" button when there are more than 10 conversations */}
            {conversations.length > 10 && (
              <SidebarMenuItem>
                <SidebarMenuButton 
                  className="text-sidebar-foreground/70"
                  onClick={(e) => {
                    e.preventDefault()
                    router.push('/search')
                  }}
                  title="All Chats"
                >
                  <MessageCircleMore />
                  <span>All Chats</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </div>
      </SidebarGroupContent>

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteItem}
        title="Delete chat?"
        description="Are you sure you want to delete this chat?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </SidebarGroup>
  )
} 