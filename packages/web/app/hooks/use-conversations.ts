"use client"

import * as React from "react"
import { Conversation } from "@/lib/types"
import { settingsApi } from "@/lib/api"
import { toast } from "sonner"
import { AppError } from "@/lib/errors"

export function useConversations() {
  const [conversations, setConversations] = React.useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)

  const loadMessagesForConversation = async (conversationId: string) => {
    try {
      const messages = await settingsApi.getConversationMessages(conversationId)
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, messages: messages.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) })) }
          : conv
      ))
    } catch (error) {
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to load messages"
      toast.error(errorMessage)
    }
  }

  const updateConversationTitle = (conversationId: string, title: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, title, lastUpdated: new Date() }
        : conv
    ))
  }

  React.useEffect(() => {
    const loadConversations = async () => {
      try {
        setIsLoading(true)
        const data = await settingsApi.getConversations()
        
        if (data.length === 0) {
          // Don't create any conversations automatically
          setConversations([])
          setActiveConversationId("")
        } else {
          // Ensure all conversations have a messages array
          const conversationsWithMessages = data.map((conv: any) => ({
            ...conv,
            messages: conv.messages || [], // Add empty messages array if missing
            lastUpdated: new Date(conv.lastUpdated)
          }))
          setConversations(conversationsWithMessages)
          setActiveConversationId(conversationsWithMessages[0].id)
          
          // Load messages for the first conversation
          if (conversationsWithMessages.length > 0) {
            await loadMessagesForConversation(conversationsWithMessages[0].id)
          }
        }
      } catch (error) {
        const errorMessage = error instanceof AppError ? error.userMessage : "Failed to load conversations"
        toast.error(errorMessage)
      } finally {
        setIsLoading(false)
      }
    }

    loadConversations()
  }, [])

  const createNewConversation = async () => {
    try {
      const result = await settingsApi.createConversation("New Chat")
      const newConversation: Conversation = {
        id: result.id,
        title: "New Chat",
        messages: [],
        lastUpdated: new Date(),
      }
      
      setConversations((prev) => [newConversation, ...prev])
      setActiveConversationId(newConversation.id)
      
      // Return the new conversation ID so components can navigate to it
      return newConversation.id
    } catch (error) {
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to create conversation"
      toast.error(errorMessage)
      return null
    }
  }

  const deleteConversation = async (conversationId: string) => {
    try {
      await settingsApi.deleteConversation(conversationId)
      const remainingConversations = conversations.filter(
        (conv) => conv.id !== conversationId,
      )
      setConversations(remainingConversations)
      
      if (activeConversationId === conversationId) {
        // If we're deleting the active conversation
        if (remainingConversations.length > 0) {
          // Set to first remaining conversation and load its messages
          const nextConversationId = remainingConversations[0].id
          setActiveConversationId(nextConversationId)
          await loadMessagesForConversation(nextConversationId)
        } else {
          // No remaining conversations, clear everything
          setActiveConversationId("")
        }
      }
    } catch (error) {
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to delete conversation"
      toast.error(errorMessage)
    }
  }

  const clearAllConversations = async () => {
    try {
      // Delete all conversations one by one
      const deletePromises = conversations.map(conv => settingsApi.deleteConversation(conv.id))
      await Promise.all(deletePromises)
      
      // Clear all local state
      setConversations([])
      setActiveConversationId("")
      
      toast.success("All conversations have been cleared")
    } catch (error) {
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to clear all conversations"
      toast.error(errorMessage)
    }
  }

  return {
    conversations,
    activeConversationId,
    isLoading,
    createNewConversation,
    deleteConversation,
    clearAllConversations,
    setActiveConversationId,
    loadMessagesForConversation,
    updateConversationTitle,
    setConversations,
  }
} 