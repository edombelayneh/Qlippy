"use client"

import * as React from "react"
import { useRouter, useParams } from "next/navigation"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { ChatHeader } from "@/components/chat/chat-header"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { useChat } from "@/app/hooks/use-chat"
import { useVoice } from "@/app/hooks/use-voice"
import { useModels } from "@/app/hooks/use-models"
import { useElectron } from "@/app/hooks/use-electron"

export default function ChatByIdPage() {
  const router = useRouter()
  const params = useParams()
  const conversationId = params?.id as string

  const {
    conversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    currentMessage,
    setCurrentMessage,
    isGenerating,
    streamingMessage,
    handleSendMessage,
    createNewConversation,
    deleteCurrentConversation,
    handleConversationSelect,
    handleRegenerateResponse,
    handleEditUserMessage,
    handleEditAndRegenerate,
    stopGeneration,
  } = useChat()

  const {
    isRecording,
    isProcessing,
    isWaiting,
    recordingMetrics,
    handleVoiceInput,
  } = useVoice(setCurrentMessage)

  const { selectedModel, setSelectedModel, availableModels, isLoading: modelsLoading } = useModels()
  
  useElectron(setCurrentMessage)

  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages])

  React.useEffect(() => {
    scrollToBottom()
  }, [isGenerating])

  React.useEffect(() => {
    scrollToBottom()
  }, [streamingMessage])

  React.useEffect(() => {
    if (conversationId && conversationId !== activeConversationId) {
      setActiveConversationId(conversationId)
    }
  }, [conversationId, activeConversationId, setActiveConversationId])

  // Cleanup empty conversation on unmount
  React.useEffect(() => {
    return () => {
      // When the component unmounts, check if the active conversation is empty
      if (activeConversation && 
          (!activeConversation.messages || 
           activeConversation.messages.length === 0 ||
           activeConversation.messages.every(m => !m.content?.trim()))) {
        console.log("Cleaning up empty conversation on unmount:", activeConversationId)
        deleteCurrentConversation()
      }
    }
  }, [activeConversation, activeConversationId, deleteCurrentConversation])

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage(currentMessage)
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const confirmDelete = () => {
    deleteCurrentConversation()
    setShowDeleteDialog(false)
    // Navigate to the base chat page after deletion
    router.push('/chat')
  }

  const handleNavSelect = (id: string) => {
    router.push(`/chat/${id}`)
  }

  // Check if this is a new conversation (no messages)
  const isNewConversation = !activeConversation || activeConversation.messages?.length === 0

  return (
    <SidebarProvider>
      <AppSidebar
        conversations={conversations}
        activeConversationId={conversationId}
        onConversationSelect={handleNavSelect}
        onDeleteConversation={deleteCurrentConversation}
        onNewConversation={createNewConversation}
      />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {isNewConversation ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-full max-w-4xl px-6">
                <ChatInput
                  currentMessage={currentMessage}
                  setCurrentMessage={setCurrentMessage}
                  isGenerating={isGenerating}
                  isRecording={isRecording}
                  isProcessing={isProcessing}
                  isWaiting={isWaiting}
                  recordingMetrics={recordingMetrics}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  availableModels={availableModels}
                  handleSendMessage={() => handleSendMessage(currentMessage)}
                  handleVoiceInput={handleVoiceInput}
                  handleKeyPress={handleKeyPress}
                  handleStopGeneration={stopGeneration}
                  placeholder="How may I help you?"
                />
              </div>
            </div>
          ) : (
            <>
              <ChatHeader onDelete={handleDeleteClick} />
              <MessageList
                messages={activeConversation?.messages || []}
                isGenerating={isGenerating}
                streamingMessage={streamingMessage}
                messagesEndRef={messagesEndRef}
                onRegenerateResponse={handleRegenerateResponse}
                onEditUserMessage={handleEditUserMessage}
                onEditAndRegenerate={handleEditAndRegenerate}
                onStopGeneration={stopGeneration}
              />

              <ChatInput
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                isGenerating={isGenerating}
                isRecording={isRecording}
                isProcessing={isProcessing}
                isWaiting={isWaiting}
                recordingMetrics={recordingMetrics}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                availableModels={availableModels}
                handleSendMessage={() => handleSendMessage(currentMessage)}
                handleVoiceInput={handleVoiceInput}
                handleKeyPress={handleKeyPress}
                handleStopGeneration={stopGeneration}
              />
            </>
          )}
        </div>
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={confirmDelete}
          title="Delete chat?"
          description="Are you sure you want to delete this chat?"
          confirmText="Delete"
          cancelText="Cancel"
        />
      </SidebarInset>
    </SidebarProvider>
  )
} 