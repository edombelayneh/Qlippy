"use client"

import * as React from "react"
import { generateLLMStreamResponse } from "@/lib/utils"
import { toast } from "sonner"
import { AppError } from "@/lib/errors"
import { settingsApi } from "@/lib/api"
import { useConversations } from "./use-conversations"
import { Conversation } from "@/lib/types"

export function useChat() {
  const { 
    conversations, 
    activeConversationId,
    createNewConversation,
    deleteConversation,
    clearAllConversations,
    setActiveConversationId,
    loadMessagesForConversation,
    updateConversationTitle,
    isLoading: areConversationsLoading,
    setConversations
  } = useConversations()

  const [currentMessage, setCurrentMessage] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [streamingMessage, setStreamingMessage] = React.useState<string>("")
  
  // Add abort controller for stopping generation
  const abortControllerRef = React.useRef<AbortController | null>(null)
  
  // Track the previous active conversation ID to detect navigation changes
  const previousActiveConversationIdRef = React.useRef<string>("")

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId,
  )

  // Cleanup empty conversations when navigating away
  React.useEffect(() => {
    const previousId = previousActiveConversationIdRef.current
    
    // If we're navigating away from a conversation
    if (previousId && previousId !== activeConversationId) {
      // Find the previous conversation
      const previousConversation = conversations.find(c => c.id === previousId)
      
      // If it exists and has no messages (or only empty messages), delete it
      if (previousConversation && 
          (!previousConversation.messages || 
           previousConversation.messages.length === 0 ||
           previousConversation.messages.every(m => !m.content?.trim()))) {
        console.log("Deleting empty conversation:", previousId)
        deleteConversation(previousId)
      }
    }
    
    // Update the ref for next comparison
    previousActiveConversationIdRef.current = activeConversationId
  }, [activeConversationId, conversations, deleteConversation])

  // Stop generation function
  const stopGeneration = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
    setStreamingMessage("")
    toast.info("Response generation stopped")
  }, [])

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isGenerating) return

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()
      
      // Create new conversation if none exists
      let conversation = activeConversation
      if (!conversation) {
        console.log("No active conversation, creating new one...")
        try {
          const result = await settingsApi.createConversation("New Chat")
          console.log("Created conversation result:", result)
          const newConversation: Conversation = {
            id: result.id,
            title: "New Chat",
            messages: [],
            lastUpdated: new Date(),
          }
          setConversations((prev: Conversation[]) => [newConversation, ...prev])
          setActiveConversationId(newConversation.id)
          conversation = newConversation
        } catch (convError) {
          console.error("Failed to create conversation:", convError)
          toast.error("Failed to create new conversation. Please check if the server is running.")
          return
        }
      }

      // Check if this is the first message (empty messages array or default title)
      const isFirstMessage = (!conversation.messages || conversation.messages.length === 0) && 
                           (conversation.title === "New Chat")

      // Save user message to backend
      try {
        console.log("Adding user message to conversation:", conversation.id)
        await settingsApi.addMessage(conversation.id, "user", message)
        console.log("User message added successfully")
      } catch (msgError) {
        console.error("Failed to add user message:", msgError)
        toast.error("Failed to save message. Please check if the server is running.")
        return
      }
      
      // If this is the first message, update conversation title to the user's message
      if (isFirstMessage) {
        try {
          // Truncate message if too long and use it as title
          const title = message.length > 50 ? message.substring(0, 47) + "..." : message
          await settingsApi.updateConversationTitle(conversation.id, title)
          // Update local state immediately
          updateConversationTitle(conversation.id, title)
        } catch (titleError) {
          console.error("Failed to update conversation title:", titleError)
          // Non-critical error, continue
        }
      }
      
      // Reload messages to update UI
      try {
        await loadMessagesForConversation(conversation.id)
      } catch (loadError) {
        console.error("Failed to load conversation messages:", loadError)
        // Continue with generation even if reload fails
      }
      
      setCurrentMessage("")
      setIsGenerating(true)
      setStreamingMessage("") // Reset streaming message

      // Start LLM generation
      console.log("Starting LLM generation for message:", message)
      console.log("With conversation ID:", conversation.id)
      const stream = generateLLMStreamResponse(message, abortControllerRef.current.signal, conversation.id)
      let accumulatedText = ""

      // Create assistant message placeholder
      const assistantMessageResult = await settingsApi.addMessage(conversation.id, "assistant", "")
      console.log("Assistant message result:", assistantMessageResult)
      const assistantMessageId = assistantMessageResult.id // The fetchJson function returns data directly

      try {
        // Stream tokens in real-time
        for await (const chunk of stream) {
          // Check if we've been aborted
          if (abortControllerRef.current?.signal.aborted) {
            break
          }
          accumulatedText += chunk
          setStreamingMessage(accumulatedText) // Update UI in real-time
        }
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log("Generation was stopped by user")
          accumulatedText = accumulatedText || "Response generation was stopped."
        } else {
          console.error("Error during LLM streaming:", streamError)
          accumulatedText = "Sorry, I encountered an error while processing your request. Please try again."
        }
        setStreamingMessage(accumulatedText)
      }

      // Update the assistant message with final content (only if not aborted)
      if (!abortControllerRef.current?.signal.aborted && accumulatedText.trim()) {
        await settingsApi.updateMessage(conversation.id, assistantMessageId, accumulatedText)
      } else if (!accumulatedText.trim()) {
        // If no content was generated, add a fallback message
        await settingsApi.updateMessage(conversation.id, assistantMessageId, "I'm sorry, I couldn't generate a response. Please try again.")
      }
      
      // Clear streaming message and reload messages to update UI
      setStreamingMessage("")
      await loadMessagesForConversation(conversation.id)

    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to generate response"
      toast.error(errorMessage)
      
      // If we had started creating an assistant message, we should clean it up
      // For now, we'll just reload messages to ensure consistency
      if (activeConversationId) {
        await loadMessagesForConversation(activeConversationId)
      }
    } finally {
      setIsGenerating(false)
      setStreamingMessage("") // Ensure streaming message is cleared
      abortControllerRef.current = null
    }
  }

  const deleteCurrentConversation = async () => {
    await deleteConversation(activeConversationId)
  }

  const handleConversationSelect = async (conversationId: string) => {
    setActiveConversationId(conversationId)
    await loadMessagesForConversation(conversationId)
  }

  const handleRegenerateResponse = async (messageId: string) => {
    if (!activeConversation || !activeConversationId || isGenerating) return
    
    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()
      
      // Find the message to regenerate
      const messageIndex = activeConversation.messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return
      
      const messageToRegenerate = activeConversation.messages[messageIndex]
      if (messageToRegenerate.role !== "assistant") return
      
      // Find the corresponding user message (should be the previous one)
      const userMessageIndex = messageIndex - 1
      if (userMessageIndex < 0) return
      
      const userMessage = activeConversation.messages[userMessageIndex]
      if (userMessage.role !== "user") return
      
      // Delete the assistant message from the backend
      // Note: We'll need to add this API endpoint
      // For now, let's create a new assistant message to replace it
      
      setIsGenerating(true)
      setStreamingMessage("") // Reset streaming message

      // Start LLM generation with the user message
      console.log("Regenerating response for message:", userMessage.content)
      const stream = generateLLMStreamResponse(userMessage.content, abortControllerRef.current.signal, activeConversationId)
      let accumulatedText = ""

      // Update the existing assistant message or create a new one
      try {
        // Stream tokens in real-time
        for await (const chunk of stream) {
          // Check if we've been aborted
          if (abortControllerRef.current?.signal.aborted) {
            break
          }
          accumulatedText += chunk
          setStreamingMessage(accumulatedText) // Update UI in real-time
        }
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log("Regeneration was stopped by user")
          accumulatedText = accumulatedText || "Response generation was stopped."
        } else {
          console.error("Error during LLM streaming:", streamError)
          accumulatedText = "Sorry, I encountered an error while processing your request. Please try again."
        }
        setStreamingMessage(accumulatedText)
      }

      // Update the assistant message with final content (only if not aborted)
      if (!abortControllerRef.current?.signal.aborted && accumulatedText.trim()) {
        await settingsApi.updateMessage(activeConversationId, messageId, accumulatedText)
      } else if (!accumulatedText.trim()) {
        // If no content was generated, add a fallback message
        await settingsApi.updateMessage(activeConversationId, messageId, "I'm sorry, I couldn't generate a response. Please try again.")
      }
      
      // Clear streaming message and reload messages to update UI
      setStreamingMessage("")
      await loadMessagesForConversation(activeConversationId)

    } catch (error) {
      console.error("Error regenerating response:", error)
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to regenerate response"
      toast.error(errorMessage)
      
      // Reload messages to ensure consistency
      if (activeConversationId) {
        await loadMessagesForConversation(activeConversationId)
      }
    } finally {
      setIsGenerating(false)
      setStreamingMessage("") // Ensure streaming message is cleared
      abortControllerRef.current = null
    }
  }

  const handleEditUserMessage = async (messageId: string, newContent: string) => {
    if (!activeConversation || !activeConversationId || isGenerating) return
    
    try {
      // Update the user message in the backend
      await settingsApi.updateMessage(activeConversationId, messageId, newContent)
      
      // Find the message index
      const messageIndex = activeConversation.messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return
      
      // Remove all messages after this user message (including assistant responses)
      const messagesToRemove = activeConversation.messages.slice(messageIndex + 1)
      for (const message of messagesToRemove) {
        // We'll need to add a delete message API endpoint
        // For now, we'll just reload the conversation
      }
      
      // Reload messages to update UI
      await loadMessagesForConversation(activeConversationId)
      
    } catch (error) {
      console.error("Error editing user message:", error)
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to edit message"
      toast.error(errorMessage)
    }
  }

  const handleEditAndRegenerate = async (messageId: string, newContent: string) => {
    if (!activeConversation || !activeConversationId || isGenerating) return
    
    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()
      
      // Update the user message in the backend
      await settingsApi.updateMessage(activeConversationId, messageId, newContent)
      
      // Find the message index
      const messageIndex = activeConversation.messages.findIndex(m => m.id === messageId)
      if (messageIndex === -1) return
      
      // Remove all messages after this user message (including assistant responses)
      const messagesToRemove = activeConversation.messages.slice(messageIndex + 1)
      for (const message of messagesToRemove) {
        // We'll need to add a delete message API endpoint
        // For now, we'll just reload the conversation to remove them from UI
      }
      
      // Reload messages to update UI with the edited message
      await loadMessagesForConversation(activeConversationId)
      
      setIsGenerating(true)
      setStreamingMessage("") // Reset streaming message

      // Start LLM generation with the edited message
      console.log("Regenerating response for edited message:", newContent)
      const stream = generateLLMStreamResponse(newContent, abortControllerRef.current.signal, activeConversationId)
      let accumulatedText = ""

      // Create new assistant message
      const assistantMessageResult = await settingsApi.addMessage(activeConversationId, "assistant", "")
      const assistantMessageId = assistantMessageResult.id

      try {
        // Stream tokens in real-time
        for await (const chunk of stream) {
          // Check if we've been aborted
          if (abortControllerRef.current?.signal.aborted) {
            break
          }
          accumulatedText += chunk
          setStreamingMessage(accumulatedText) // Update UI in real-time
        }
      } catch (streamError) {
        if (streamError instanceof Error && streamError.name === 'AbortError') {
          console.log("Generation was stopped by user")
          accumulatedText = accumulatedText || "Response generation was stopped."
        } else {
          console.error("Error during LLM streaming:", streamError)
          accumulatedText = "Sorry, I encountered an error while processing your request. Please try again."
        }
        setStreamingMessage(accumulatedText)
      }

      // Update the assistant message with final content (only if not aborted)
      if (!abortControllerRef.current?.signal.aborted && accumulatedText.trim()) {
        await settingsApi.updateMessage(activeConversationId, assistantMessageId, accumulatedText)
      } else if (!accumulatedText.trim()) {
        // If no content was generated, add a fallback message
        await settingsApi.updateMessage(activeConversationId, assistantMessageId, "I'm sorry, I couldn't generate a response. Please try again.")
      }
      
      // Clear streaming message and reload messages to update UI
      setStreamingMessage("")
      await loadMessagesForConversation(activeConversationId)

    } catch (error) {
      console.error("Error editing and regenerating:", error)
      const errorMessage = error instanceof AppError ? error.userMessage : "Failed to edit message and regenerate response"
      toast.error(errorMessage)
      
      // Reload messages to ensure consistency
      if (activeConversationId) {
        await loadMessagesForConversation(activeConversationId)
      }
    } finally {
      setIsGenerating(false)
      setStreamingMessage("") // Ensure streaming message is cleared
      abortControllerRef.current = null
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  return {
    conversations,
    activeConversation,
    activeConversationId,
    currentMessage,
    isGenerating,
    streamingMessage,
    isLoading: areConversationsLoading,
    setCurrentMessage,
    setActiveConversationId,
    handleSendMessage,
    createNewConversation,
    deleteCurrentConversation,
    handleConversationSelect,
    clearAllConversations,
    handleRegenerateResponse,
    handleEditUserMessage,
    handleEditAndRegenerate,
    stopGeneration,
  }
} 