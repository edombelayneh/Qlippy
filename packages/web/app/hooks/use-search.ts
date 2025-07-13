"use client"

import * as React from "react"
import { useConversations } from "./use-conversations"

export function useSearch() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const { conversations, deleteConversation } = useConversations()
  const [filteredConversations, setFilteredConversations] =
    React.useState(conversations)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [conversationToDelete, setConversationToDelete] = React.useState<
    string | null
  >(null)

  React.useEffect(() => {
    setFilteredConversations(conversations)
  }, [conversations])

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations)
    } else {
      const filtered = conversations.filter((conv) => {
        const lastMessage =
          conv.messages.length > 0
            ? conv.messages[conv.messages.length - 1].content
            : ""
        return (
          conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
        )
      })
      setFilteredConversations(filtered)
    }
  }, [searchQuery, conversations])

  const handleDeleteClick = (
    conversationId: string,
    event: React.MouseEvent,
  ) => {
    event.stopPropagation() // Prevent card click
    setConversationToDelete(conversationId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteConversation = () => {
    if (conversationToDelete) {
      deleteConversation(conversationToDelete)
      setConversationToDelete(null)
    }
  }

  return {
    searchQuery,
    setSearchQuery,
    filteredConversations,
    showDeleteDialog,
    setShowDeleteDialog,
    handleDeleteClick,
    confirmDeleteConversation,
  }
} 