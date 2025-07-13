"use client"

import * as React from "react"

import { ConfirmationDialog } from "@/components/confirmation-dialog"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useConversations } from "@/hooks/use-conversations"
import { qlippyAPI, Message as APIMessage, Conversation as APIConversation } from "@/lib/api"
import { AppSidebar } from "@/components/app-sidebar"
import { AddSpaceDialog } from "@/components/add-space-dialog"
import { ChatInput } from "@/components/chat/chat-input"
import { ChatHeader } from "@/components/chat/chat-header"
import { MessageList } from "@/components/chat/message-list"
import { Message, Conversation, Plugin, AIModel, Space, UploadedFile } from "@/lib/types"

export default function ChatPage() {
  const {
    conversations: apiConversations,
    activeConversation,
    loading: conversationsLoading,
    error: conversationsError,
    loadConversations,
    createConversation,
    loadConversation,
    addMessage,
    updateConversation,
    deleteConversation,
    setActiveConversation,
  } = useConversations()

  const [isLoading, setIsLoading] = React.useState(true)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [currentMessage, setCurrentMessage] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [isRecording, setIsRecording] = React.useState(false)
  const [isProcessing, setIsProcessing] = React.useState(false)
  const [recordingMetrics, setRecordingMetrics] = React.useState<{ max_amplitude?: number; mean_amplitude?: number; duration?: number; } | null>(null)
  const [hasStartedConversation, setHasStartedConversation] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState("gpt-4")
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null)
  const [showFolderDialog, setShowFolderDialog] = React.useState(false)
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null)
  const [showAddSpaceDialog, setShowAddSpaceDialog] = React.useState(false)
  const [selectedSpaceForNewConversation, setSelectedSpaceForNewConversation] = React.useState<string | null>(null)
  const [spaces, setSpaces] = React.useState<Space[]>([
    { id: "work", name: "Work", icon: "💼", color: "blue", conversationCount: 0 },
    { id: "personal", name: "Personal", icon: "👤", color: "green", conversationCount: 0 },
    { id: "side-projects", name: "Side Projects", icon: "🚀", color: "purple", conversationCount: 0 },
    { id: "hobbies", name: "Hobbies", icon: "🎨", color: "orange", conversationCount: 0 },
  ])
  const [selectedSpace, setSelectedSpace] = React.useState<string | null>(null)
  const hasSetInitialConversation = React.useRef(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const [plugins, setPlugins] = React.useState<Plugin[]>([
    {
      id: "1",
      name: "Code Assistant",
      description: "Helps with programming and code review",
      enabled: true,
    },
    {
      id: "2",
      name: "Document Analyzer",
      description: "Analyzes and summarizes documents",
      enabled: false,
    },
    {
      id: "3",
      name: "Web Search",
      description: "Search the web for current information",
      enabled: true,
    },
  ])

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

  // Convert API conversations to frontend format and filter by selected space
  const conversations: Conversation[] = React.useMemo(() => {
    console.log('Converting conversations:', {
      apiConversationsLength: apiConversations.length,
      activeConversationId: activeConversation?.id,
      activeConversationMessages: activeConversation?.messages?.length || 0,
      selectedSpace
    })
    
    let filteredConversations = apiConversations
    
    // Filter conversations by selected space
    if (selectedSpace) {
      filteredConversations = apiConversations.filter(conv => conv.folder === selectedSpace)
    } else {
      // When no space is selected, show conversations that don't have a folder assigned
      filteredConversations = apiConversations.filter(conv => !conv.folder || conv.folder === "")
    }
    
    console.log('Filtering conversations:', {
      selectedSpace,
      totalConversations: apiConversations.length,
      filteredCount: filteredConversations.length,
      conversationsWithFolders: apiConversations.filter(conv => conv.folder).length,
      conversationsWithoutFolders: apiConversations.filter(conv => !conv.folder).length,
      folderValues: apiConversations.map(conv => ({ id: conv.id, folder: conv.folder }))
    })
    
    return filteredConversations.map(apiConv => {
      const messages = activeConversation?.id === apiConv.id 
        ? (activeConversation.messages || []).map(msg => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.timestamp)
          }))
        : []
      
      console.log(`Conversation ${apiConv.id}:`, {
        title: apiConv.title,
        messageCount: messages.length,
        activeConversationId: activeConversation?.id,
        isActive: activeConversation?.id === apiConv.id,
        folder: apiConv.folder
      })
      
      return {
        id: apiConv.id,
        title: apiConv.title,
        messages,
        messageCount: apiConv.message_count || 0,
        lastUpdated: new Date(apiConv.last_updated),
        folder: apiConv.folder || undefined
      }
    })
  }, [apiConversations, activeConversation, selectedSpace])

  // Update space conversation counts
  React.useEffect(() => {
    const updatedSpaces = spaces.map(space => {
      const count = apiConversations.filter(conv => conv.folder === space.id).length
      return { ...space, conversationCount: count }
    })
    setSpaces(updatedSpaces)
  }, [apiConversations])

  const currentConversation = conversations.find((c) => c.id === activeConversationId)
  
  // Check if this is truly a new conversation (no messages yet)
  const hasMessages = activeConversation?.messages && activeConversation.messages.length > 0
  const isNewConversation = (!activeConversationId || !activeConversation || !hasMessages) && !hasStartedConversation
  
  // Debug logging
  console.log('Chat state debug:', {
    activeConversationId,
    hasActiveConversation: !!activeConversation,
    activeConversationMessages: activeConversation?.messages?.length || 0,
    hasMessages,
    isNewConversation,
    currentConversationMessages: currentConversation?.messages?.length || 0
  })

  // Load conversations on component mount
  React.useEffect(() => {
    console.log('useEffect for loading conversations:', {
      conversationsLoading,
      shouldLoad: !conversationsLoading
    })
    
    if (!conversationsLoading) {
      loadConversations()
    }
  }, [conversationsLoading, loadConversations])

  // Set first conversation as active if none selected
  React.useEffect(() => {
    console.log('useEffect for setting active conversation:', {
      conversationsLength: conversations.length,
      activeConversationId,
      hasSetInitial: hasSetInitialConversation.current,
      shouldSet: conversations.length > 0 && !activeConversationId && !hasSetInitialConversation.current
    })
    
    if (conversations.length > 0 && !activeConversationId && !hasSetInitialConversation.current) {
      hasSetInitialConversation.current = true
      console.log('Setting active conversation to:', conversations[0].id)
      setActiveConversationId(conversations[0].id)
      loadConversation(conversations[0].id)
    }
  }, [conversations, activeConversationId, loadConversation])

  // Initialize app
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)
    return () => clearTimeout(timer)
  }, [])

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }, 100)
    })
  }

  const scrollToBottomImmediate = () => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" })
    })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [currentConversation?.messages, isGenerating])

  // Function to generate a smart title from message content
  const generateConversationTitle = (content: string): string => {
    // Remove extra whitespace and get first 3 words
    const cleanContent = content.trim().replace(/\s+/g, ' ')
    const firstWords = cleanContent.split(' ').slice(0, 3).join(' ')
    
    // If the content is short enough, use it as is
    if (cleanContent.length <= 50) {
      return cleanContent
    }
    
    // Otherwise, use the first 3 words and add ellipsis
    return firstWords.length > 50 ? firstWords.substring(0, 50) + '...' : firstWords
  }

  const handleSendMessage = async () => {
    console.log('handleSendMessage called with:', {
      currentMessage: currentMessage.trim(),
      isGenerating,
      isSending,
      activeConversationId
    })
    
    // Check if we have a message to send
    if (!currentMessage.trim()) {
      console.log('No message to send')
      return
    }
    
    // Check if we're already processing
    if (isGenerating || isSending) {
      console.log('Already processing, ignoring send request')
      return
    }
    
    // If no active conversation, create one
    let conversationId = activeConversationId
    if (!conversationId) {
      console.log('No active conversation, creating new one')
      try {
        // Generate a smart title from the first message
        const smartTitle = generateConversationTitle(currentMessage)
        const newConversation = await createConversation(smartTitle)
        conversationId = newConversation.id
        setActiveConversationId(conversationId)
        console.log('Created new conversation:', conversationId)
      } catch (error) {
        console.error('Failed to create conversation:', error)
        return
      }
    }

    const userMessageContent = currentMessage
    setCurrentMessage("")
    setUploadedFiles([])
    setIsSending(true)
    
    // Mark that conversation has started
    setHasStartedConversation(true)

    try {
      // Add user message to backend immediately
      const userMessage = await addMessage(conversationId, "user", userMessageContent)
      console.log('User message added to backend:', userMessage)
      
      // Force refresh the active conversation to ensure the message is visible
      await loadConversation(conversationId)
      console.log('Active conversation refreshed after adding user message')
      
      // Update conversation title if it's still the default title
      const currentConv = conversations.find(c => c.id === conversationId)
      if (currentConv && (currentConv.title === "New Conversation" || currentConv.title === "New Chat")) {
        const smartTitle = generateConversationTitle(userMessageContent)
        await updateConversation(conversationId, { title: smartTitle })
      }
      
      // Show immediate feedback that message was sent
      console.log('User message sent successfully:', userMessageContent)
      console.log('Current conversation after user message:', {
        conversationId,
        activeConversationId,
        currentConversationMessages: currentConversation?.messages?.length || 0,
        activeConversationMessages: activeConversation?.messages?.length || 0
      })
      setIsSending(false)
      setIsGenerating(true)
      // Ensure scroll to bottom after user message
      setTimeout(() => {
        scrollToBottomImmediate()
      }, 50)

      // Simulate AI response with markdown formatting test
      setTimeout(async () => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `
# Markdown Formatting Test

This is a test to showcase the various markdown formatting options available.

## Text Formatting

*This text is italicized.*
**This text is bold.**
***This text is both bold and italicized.***
~This text is strikethrough.~

## Lists

### Unordered List
- Item 1
- Item 2
  - Sub-item 2.1
  - Sub-item 2.2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

## Code Blocks

### Inline Code
This is an example of \`inline code\`.

### Code Block
\`\`\`javascript
function greet(name) {
  return \`Hello, \${name}!\`;
}
console.log(greet('World'));
\`\`\`

## Blockquote
> "The only true wisdom is in knowing you know nothing."
> - Socrates

## Table
| Header 1 | Header 2 | Header 3 |
| :--- | :---: | ---: |
| Align Left | Align Center | Align Right |
| Cell 1 | Cell 2 | Cell 3 |
| Cell 4 | Cell 5 | Cell 6 |

## LaTeX Mathematical Expressions
The quadratic formula is given by: $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$

And here is a block-level LaTeX expression:

$$
\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}
$$
`,
          timestamp: new Date(),
        }
        
        // Add AI response to backend
        await addMessage(conversationId, "assistant", assistantMessage.content)
        // Force refresh the active conversation to ensure the AI response is visible
        await loadConversation(conversationId)
        console.log('AI response sent successfully')
        setIsGenerating(false)
        // Ensure scroll to bottom after AI response
        setTimeout(() => {
          scrollToBottomImmediate()
        }, 50)
      }, 1500)
    } catch (error) {
      console.error('Failed to send message:', error)
      setIsSending(false)
      setIsGenerating(false)
      // Optionally show error to user
      alert('Failed to send message. Please try again.')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceInput = () => {
    if (isRecording) {
      setIsRecording(false)
      if (typeof window !== 'undefined' && (window as any).electron) {
        (window as any).electron.send('stop-recording')
      }
    } else {
      setIsRecording(true)
      if (typeof window !== 'undefined' && (window as any).electron) {
        (window as any).electron.send('start-recording')
      }
    }
  }

  // Handle voice commands
  React.useEffect(() => {
    const handleVoiceCommand = (event: any, transcription: string) => {
      console.log('Received voice command:', transcription)
      setCurrentMessage(transcription)
      setIsRecording(false)
      textareaRef.current?.focus()
    }

    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.on('voice-command', handleVoiceCommand)
    }

    return () => {
      if (typeof window !== 'undefined' && (window as any).electron && typeof (window as any).electron.removeListener === 'function') {
        try {
          (window as any).electron.removeListener('voice-command', handleVoiceCommand)
        } catch (error) {
          console.error('❌ Error cleaning up electron listeners:', error)
        }
      }
    }
  }, [])

  const createNewConversation = async () => {
    try {
      const newConversation = await createConversation(
        "New Chat",
        selectedSpaceForNewConversation || undefined
      )
      setActiveConversationId(newConversation.id)
      setSelectedSpaceForNewConversation(null)
      setHasStartedConversation(false) // Reset for new conversation
    } catch (error) {
      console.error('Failed to create conversation:', error)
    }
  }

  const togglePlugin = (pluginId: string) => {
    setPlugins((prev) =>
      prev.map((plugin) =>
        plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin
      ),
    )
  }

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await deleteConversation(conversationId)
      // If we're deleting the currently active conversation, clear it
      if (activeConversationId === conversationId) {
        setActiveConversationId(null)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const handleDeleteClick = () => {
    if (activeConversationId) {
      setShowDeleteDialog(true)
    }
  }

  const deleteCurrentConversation = async () => {
    if (activeConversationId) {
      await handleDeleteConversation(activeConversationId)
      setShowDeleteDialog(false)
    }
  }

  const getFolderInfo = (folderId: string) => {
    return spaces.find(space => space.id === folderId)
  }

  const addFolderToConversation = async (conversationId: string, folderId: string) => {
    try {
      await updateConversation(conversationId, { folder: folderId })
      // Reload conversations to update the UI
      await loadConversations()
    } catch (error) {
      console.error('Failed to add folder to conversation:', error)
    }
  }

  const removeFolderFromConversation = async (conversationId: string) => {
    try {
      console.log('Removing folder from conversation:', conversationId)
      await updateConversation(conversationId, { folder: "" })
      console.log('Successfully removed folder from conversation')
      // Reload conversations to update the UI
      console.log('Reloading conversations')
      await loadConversations()
      console.log('Conversations reloaded')
    } catch (error) {
      console.error('Failed to remove folder from conversation:', error)
    }
  }

  const handleAddSpace = (newSpace: { name: string; icon: string; color: string }) => {
    const newSpaceWithId: Space = {
      id: `space-${Date.now()}`, // Generate a unique ID
      name: newSpace.name,
      icon: newSpace.icon,
      color: newSpace.color,
      conversationCount: 0
    }
    setSpaces(prev => [...prev, newSpaceWithId])
    setShowAddSpaceDialog(false)
  }

  // Show loading while app is initializing
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading Qlippy...</span>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar
        spaces={spaces}
        selectedSpace={selectedSpace}
        onSpaceSelect={setSelectedSpace}
        onAddSpace={() => setShowAddSpaceDialog(true)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationSelect={(id: string) => {
          setActiveConversationId(id)
          loadConversation(id)
          // Check if the new conversation has messages
          const targetConversation = conversations.find(c => c.id === id)
          setHasStartedConversation(targetConversation ? targetConversation.messages.length > 0 : false)
        }}
        onCreateConversation={createNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onAddFolder={addFolderToConversation}
        onRemoveFolder={removeFolderFromConversation}
        plugins={plugins}
        onTogglePlugin={togglePlugin}
        availableModels={availableModels}
        selectedModel={selectedModel}
        onModelSelect={setSelectedModel}
        selectedSpaceForNewConversation={selectedSpaceForNewConversation}
        onSelectSpaceForNewConversation={setSelectedSpaceForNewConversation}
      />

      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Header - Always present when there are messages */}
          {!isNewConversation && (
            <ChatHeader
              onDelete={handleDeleteClick}
            />
          )}

          {/* Chat Messages - Always present, empty for new conversations */}
          <MessageList
            messages={currentConversation?.messages || []}
            isGenerating={isGenerating}
            messagesEndRef={messagesEndRef}
          />

          {/* Message Input - Always at bottom, centered only for new conversations */}
          <div className={isNewConversation ? "flex-1 flex items-center justify-center" : ""}>
            <div className={isNewConversation ? "w-full max-w-4xl px-6" : ""}>
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
                placeholder={isNewConversation ? "How may I help you?" : "Ask Qlippy anything..."}
              />
            </div>
          </div>
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

        <AddSpaceDialog
          open={showAddSpaceDialog}
          onOpenChange={setShowAddSpaceDialog}
          onAddSpace={handleAddSpace}
        />
      </SidebarInset>
    </SidebarProvider>
  )
} 