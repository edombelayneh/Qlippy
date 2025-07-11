"use client"

import * as React from "react"
import {
  MessageCircleMore,
  Trash2,
} from "lucide-react"


import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

export function NavFavorites({
  favorites,
}: {
  favorites: {
    name: string
    url: string
    emoji: string
  }[]
}) {
  const { isMobile } = useSidebar()
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<string | null>(null)

  const handleDeleteClick = (itemName: string) => {
    setItemToDelete(itemName)
    setShowDeleteDialog(true)
  }

  const confirmDeleteItem = () => {
    if (itemToDelete) {
      console.log('Delete chat:', itemToDelete)
      // Here you would handle the actual deletion logic
      setItemToDelete(null)
    }
  }

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Chats</SidebarGroupLabel>
      <SidebarMenu>
        {favorites.map((item) => (
          <SidebarMenuItem key={item.name}>
            <SidebarMenuButton asChild>
              <a href={item.url} title={item.name}>
                <span>{item.emoji}</span>
                <span>{item.name}</span>
              </a>
            </SidebarMenuButton>
            <SidebarMenuAction 
              showOnHover
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={(e) => {
                e.preventDefault()
                handleDeleteClick(item.name)
              }}
            >
              <Trash2 />
              <span className="sr-only">Delete chat</span>
            </SidebarMenuAction>
          </SidebarMenuItem>
        ))}
        <SidebarMenuItem>
          <SidebarMenuButton asChild className="text-sidebar-foreground/70">
            <a href="/search" title="All Chats">
              <MessageCircleMore />
              <span>All Chats</span>
            </a>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Delete Confirmation Dialog */}
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
