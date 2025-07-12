"use client"

import * as React from "react"

import { ConfirmationDialog } from "@/components/confirmation-dialog"

import { ChatHeader } from "@/components/chat/chat-header"
import { MessageList } from "@/components/chat/message-list"
import { ChatInput } from "@/components/chat/chat-input"
import { Message, Conversation, AIModel } from "@/lib/types"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { toast } from "sonner"

export default function ChatPage() {
  const [currentMessage, setCurrentMessage] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isRecording, setIsRecording] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [recordingMetrics, setRecordingMetrics] = React.useState<{
    max_amplitude?: number;
    mean_amplitude?: number;
    duration?: number;
  } | null>(null)
  const wsRef = React.useRef<WebSocket | null>(null)
  const [conversations, setConversations] = React.useState<Conversation[]>([
    {
      id: "1",
      title: "Getting Started",
      messages: [],
      lastUpdated: new Date(Date.now() - 3600000),
    },
    {
      id: "2",
      title: "Work Project Planning",
      messages: [
        {
          id: "3",
          role: "user",
          content: "Help me plan a new project for work",
          timestamp: new Date(Date.now() - 7200000),
        },
      ],
      lastUpdated: new Date(Date.now() - 7200000),
    },
    {
      id: "3",
      title: "Personal Finance Tips",
      messages: [
        {
          id: "4",
          role: "user",
          content: "What are some good personal finance tips?",
          timestamp: new Date(Date.now() - 10800000),
        },
      ],
      lastUpdated: new Date(Date.now() - 10800000),
    },
    {
      id: "4",
      title: "Side Project Ideas",
      messages: [
        {
          id: "5",
          role: "user",
          content: "I want to start a side project, any ideas?",
          timestamp: new Date(Date.now() - 14400000),
        },
      ],
      lastUpdated: new Date(Date.now() - 14400000),
    },
    {
      id: "5",
      title: "Photography Tips",
      messages: [
        {
          id: "6",
          role: "user",
          content: "How can I improve my photography skills?",
          timestamp: new Date(Date.now() - 18000000),
        },
      ],
      lastUpdated: new Date(Date.now() - 18000000),
    },
  ])

  const [activeConversationId, setActiveConversationId] = React.useState("1")
  const [selectedModel, setSelectedModel] = React.useState("gpt-4")
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

  const [availableModels] = React.useState<AIModel[]>([
    {
      id: "gpt-4",
      name: "GPT-4",
      description: "Most capable model, best for complex tasks"
    },
    {
      id: "gpt-3.5-turbo",
      name: "GPT-3.5 Turbo",
      description: "Fast and efficient for most tasks"
    },
    {
      id: "claude-3",
      name: "Claude 3",
      description: "Excellent for analysis and reasoning"
    },
    {
      id: "llama-2",
      name: "Llama 2",
      description: "Open source alternative"
    }
  ])

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const isNewConversation = activeConversation?.messages.length === 0

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isGenerating) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: currentMessage,
      timestamp: new Date(),
    }

    // Add user message
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, userMessage],
              lastUpdated: new Date(),
            }
          : conv,
      ),
    )

    setCurrentMessage("")
    // setUploadedFiles([]) // This state is now in ChatInput
    setIsGenerating(true)

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I understand you said: "${userMessage.content}". This is a simulated response using ${availableModels.find(m => m.id === selectedModel)?.name}. In a real implementation, this would be connected to an AI model to generate meaningful responses based on your input.`,
        timestamp: new Date(),
      }

      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: [...conv.messages, assistantMessage],
                lastUpdated: new Date(),
              }
            : conv,
        ),
      )
      setIsGenerating(false)
    }, 1500)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Handle voice commands from Electron main process
  React.useEffect(() => {
    const handleVoiceCommand = (transcription: string) => {
      // Set the transcribed text as the current message
      if (transcription && typeof transcription === 'string') {
        setCurrentMessage(transcription)
      }
      
      // Stop recording state and processing state
      setIsRecording(false)
      setIsProcessing(false)
      
      // Focus the textarea - This might need to be handled differently now
      // textareaRef.current?.focus()
    }

    const handleRecordingError = (error: string) => {
      toast.error(error, {
        duration: 10000,
      })
      setIsRecording(false)
      setIsProcessing(false)
    }

    const handleProcessingComplete = () => {
      setIsProcessing(false)
    }

    // Function to set up electron listeners with retry logic
    const setupElectronListeners = () => {
      if (typeof window !== 'undefined') {
        if ((window as any).electron && typeof (window as any).electron.on === 'function') {
          try {
            (window as any).electron.on('voice-command', handleVoiceCommand)
            (window as any).electron.on('recording-error', handleRecordingError)
            (window as any).electron.on('processing-complete', handleProcessingComplete)
            return true
          } catch (error) {
            console.error('❌ Error setting up electron listeners:', error)
            return false
          }
        } else {
          return false
        }
      }
      return false
    }

    // Try to set up listeners immediately
    if (!setupElectronListeners()) {
      // If it fails, retry after a short delay (preload script might still be loading)
      const retryTimeout = setTimeout(() => {
        if (!setupElectronListeners()) {
          // One more retry after a longer delay
          const finalRetryTimeout = setTimeout(() => {
            if (!setupElectronListeners()) {
              console.error('❌ Failed to set up electron listeners after multiple attempts')
            }
          }, 500)
          
          return () => clearTimeout(finalRetryTimeout)
        }
      }, 100)
      
      return () => clearTimeout(retryTimeout)
    }

    return () => {
      if (typeof window !== 'undefined' && (window as any).electron && typeof (window as any).electron.removeListener === 'function') {
        try {
          (window as any).electron.removeListener('voice-command', handleVoiceCommand)
          (window as any).electron.removeListener('recording-error', handleRecordingError)
          (window as any).electron.removeListener('processing-complete', handleProcessingComplete)
        } catch (error) {
          console.error('❌ Error cleaning up electron listeners:', error)
        }
      }
    }
  }, [])

  const handleVoiceInput = () => {
    setRecordingMetrics(null)
    
    if (isRecording) {
      // Stop recording
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('stop')
      }
      setIsRecording(false)
      setIsProcessing(true)
    } else {
      // Start recording
      const ws = new WebSocket('ws://localhost:8000/ws/record')
      
      ws.onopen = () => {
        setIsRecording(true)
      }
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        switch (data.status) {
          case 'recording':
            setIsRecording(true)
            setIsProcessing(false)
            break
            
          case 'processing':
            setIsRecording(false)
            setIsProcessing(true)
            if (data.metrics) {
              setRecordingMetrics(data.metrics)
            }
            break
            
          case 'success':
            setIsRecording(false)
            setIsProcessing(false)
            if (data.transcription) {
              setCurrentMessage(data.transcription)
            }
            break
            
          case 'error':
            setIsRecording(false)
            setIsProcessing(false)
            toast.error(data.message, {
              duration: 10000,
            })
            break
        }
      }
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        toast.error("Connection error", {
          duration: 5000,
        })
        setIsRecording(false)
        setIsProcessing(false)
      }
      
      ws.onclose = () => {
        setIsRecording(false)
        setIsProcessing(false)
      }
      
      wsRef.current = ws
    }
  }

  // Cleanup WebSocket on unmount
  React.useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  const createNewConversation = () => {
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: "New Conversation",
      messages: [],
      lastUpdated: new Date(),
    }
    setConversations((prev) => [newConversation, ...prev])
    setActiveConversationId(newConversation.id)
  }

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const deleteCurrentConversation = () => {
    if (conversations.length <= 1) {
      // Don't delete the last conversation, just clear its messages
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? { ...conv, messages: [], title: "New Conversation" }
            : conv,
        ),
      )
    } else {
      // Delete the conversation and switch to another one
      const remainingConversations = conversations.filter((conv) => conv.id !== activeConversationId)
      setConversations(remainingConversations)
      setActiveConversationId(remainingConversations[0].id)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
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
                  recordingMetrics={recordingMetrics}
                  selectedModel={selectedModel}
                  setSelectedModel={setSelectedModel}
                  availableModels={availableModels}
                  handleSendMessage={handleSendMessage}
                  handleVoiceInput={handleVoiceInput}
                  handleKeyPress={handleKeyPress}
                  placeholder="How may I help you?"
                />
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <ChatHeader
                onDelete={handleDeleteClick}
              />

              {/* Chat Messages */}
              <MessageList
                messages={activeConversation?.messages || []}
                isGenerating={isGenerating}
                messagesEndRef={messagesEndRef}
              />

              {/* Message Input - Fixed at bottom */}
              <ChatInput
                currentMessage={currentMessage}
                setCurrentMessage={setCurrentMessage}
                isGenerating={isGenerating}
                isRecording={isRecording}
                isProcessing={isProcessing}
                recordingMetrics={recordingMetrics}
                selectedModel={selectedModel}
                setSelectedModel={setSelectedModel}
                availableModels={availableModels}
                handleSendMessage={handleSendMessage}
                handleVoiceInput={handleVoiceInput}
                handleKeyPress={handleKeyPress}
              />
            </>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <ConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={deleteCurrentConversation}
          title="Delete chat?"
          description="Are you sure you want to delete this chat?"
          confirmText="Delete"
          cancelText="Cancel"
        />
      </SidebarInset>
    </SidebarProvider>
  )
} 