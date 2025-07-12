"use client"

import * as React from "react"
import { Loader2, Send, Mic, ChevronDown, Check, ThumbsUp, ThumbsDown, Copy, RotateCcw, Pencil, Trash2, MoreHorizontal, Edit, Share, Paperclip, FileText, FileImage, FileVideo, FileAudio, X, File } from "lucide-react"

import { AppSidebar } from "@/components/app-sidebar"
import { ConversationList } from "@/components/conversation-list"
import { AddSpaceDialog } from "@/components/add-space-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { useUserContext } from "@/contexts/user-context"
import { useConversations } from "@/hooks/use-conversations"
import { qlippyAPI, Message as APIMessage, Conversation as APIConversation } from "@/lib/api"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  messageCount: number
  lastUpdated: Date
  folder?: string
}

interface Plugin {
  id: string
  name: string
  description: string
  enabled: boolean
}

interface AIModel {
  id: string
  name: string
  description: string
}

interface UploadedFile {
  id: string
  file: File
  preview?: string
  type: 'image' | 'document' | 'video' | 'audio'
}

export default function ChatPage() {
  const { user, loading: userLoading, error: userError } = useUserContext()
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
    currentUserId,
  } = useConversations()

  const [isLoading, setIsLoading] = React.useState(true)
  const [activeConversationId, setActiveConversationId] = React.useState<string | null>(null)
  const [currentMessage, setCurrentMessage] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [isSending, setIsSending] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState("gpt-4")
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null)
  const [showFolderDialog, setShowFolderDialog] = React.useState(false)
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null)
  const [showAddSpaceDialog, setShowAddSpaceDialog] = React.useState(false)
  const [selectedSpaceForNewConversation, setSelectedSpaceForNewConversation] = React.useState<string | null>(null)
  const hasSetInitialConversation = React.useRef(false)

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

  // Convert API conversations to frontend format
  const conversations: Conversation[] = React.useMemo(() => {
    console.log('Converting conversations:', {
      apiConversationsLength: apiConversations.length,
      activeConversationId: activeConversation?.id,
      activeConversationMessages: activeConversation?.messages?.length || 0
    })
    
    return apiConversations.map(apiConv => {
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
        isActive: activeConversation?.id === apiConv.id
      })
      
      return {
        id: apiConv.id,
        title: apiConv.title,
        messages,
        messageCount: apiConv.message_count || 0, // Use the count from API
        lastUpdated: new Date(apiConv.last_updated),
        folder: apiConv.folder || undefined
      }
    })
  }, [apiConversations, activeConversation])

  const currentConversation = conversations.find((c) => c.id === activeConversationId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load conversations when user is authenticated
  React.useEffect(() => {
    console.log('useEffect for loading conversations:', {
      user: !!user,
      user_id: user?.id,
      conversationsLoading,
      currentUserId,
      shouldLoad: user && !conversationsLoading && user.id !== currentUserId
    })
    
    if (user && !conversationsLoading && user.id !== currentUserId) {
      loadConversations(user.id)
    }
  }, [user?.id, conversationsLoading, loadConversations])

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
    if (!userLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [userLoading])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [currentConversation?.messages])

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const newHeight = Math.min(textarea.scrollHeight, 120)
      textarea.style.height = newHeight + 'px'
    }
  }, [currentMessage])

  // Cleanup preview URLs
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [uploadedFiles])

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
      user: !!user,
      user_id: user?.id,
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
    
    // Check if we have a user
    if (!user) {
      console.log('No user available')
      return
    }
    
    // If no active conversation, create one
    let conversationId = activeConversationId
    if (!conversationId) {
      console.log('No active conversation, creating new one')
      try {
        // Generate a smart title from the first message
        const smartTitle = generateConversationTitle(currentMessage)
        const newConversation = await createConversation(user.id!, smartTitle)
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

      // Simulate AI response (replace with actual AI integration)
      setTimeout(async () => {
        const selectedModelName = availableModels.find(m => m.id === selectedModel)?.name || 'AI Assistant'
        const aiResponse = `I understand you said: "${userMessageContent}". This is a simulated response using ${selectedModelName}. In a real implementation, this would be connected to an AI model to generate meaningful responses based on your input.`
        
        // Add AI response to backend
        await addMessage(conversationId, "assistant", aiResponse)
        // Force refresh the active conversation to ensure the AI response is visible
        await loadConversation(conversationId)
        console.log('AI response sent successfully')
        setIsGenerating(false)
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

  const [isRecording, setIsRecording] = React.useState(false)

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
      if (typeof window !== 'undefined' && (window as any).electron) {
        (window as any).electron.removeListener('voice-command', handleVoiceCommand)
      }
    }
  }, [])

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const getFileType = (file: File): 'image' | 'document' | 'video' | 'audio' => {
    const mimeType = file.type.toLowerCase()
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const newFiles: UploadedFile[] = []
      
      for (const file of Array.from(files)) {
        const fileType = getFileType(file)
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        let preview: string | undefined
        
        if (fileType === 'image') {
          preview = URL.createObjectURL(file)
        }
        
        newFiles.push({
          id: fileId,
          file,
          preview,
          type: fileType
        })
      }
      
      setUploadedFiles(prev => [...prev, ...newFiles])
    }
    
    event.target.value = ''
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return prev.filter(f => f.id !== fileId)
    })
  }

  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    switch (fileType) {
      case 'image':
        return <FileImage className="h-3 w-3" />
      case 'video':
        return <FileVideo className="h-3 w-3" />
      case 'audio':
        return <FileAudio className="h-3 w-3" />
      case 'document':
        if (extension === 'pdf') {
          return <FileText className="h-3 w-3 text-red-500" />
        }
        if (['csv', 'xlsx', 'xls'].includes(extension || '')) {
          return <FileText className="h-3 w-3 text-green-500" />
        }
        if (['doc', 'docx'].includes(extension || '')) {
          return <FileText className="h-3 w-3 text-blue-500" />
        }
        return <File className="h-3 w-3" />
      default:
        return <File className="h-3 w-3" />
    }
  }

  const createNewConversation = async () => {
    if (!user) return

    try {
      const newConversation = await createConversation(
        user.id,
        "New Chat",
        selectedSpaceForNewConversation || undefined
      )
      setActiveConversationId(newConversation.id)
      setSelectedSpaceForNewConversation(null)
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

  const handleDeleteClick = () => {
    setShowDeleteDialog(true)
  }

  const deleteCurrentConversation = async () => {
    if (!activeConversationId) return

    try {
      await deleteConversation(activeConversationId)
      setActiveConversationId(null)
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }

  const getFolderInfo = (folderId: string) => {
    const folders = [
      { id: "work", name: "Work", icon: "💼", color: "blue" },
      { id: "personal", name: "Personal", icon: "👤", color: "green" },
      { id: "side-projects", name: "Side Projects", icon: "🚀", color: "purple" },
      { id: "hobbies", name: "Hobbies", icon: "🎨", color: "orange" },
    ]
    return folders.find(f => f.id === folderId)
  }

  const addFolderToConversation = async (conversationId: string, folderId: string) => {
    try {
      await updateConversation(conversationId, { folder: folderId })
    } catch (error) {
      console.error('Failed to add folder to conversation:', error)
    }
  }

  const removeFolderFromConversation = async (conversationId: string) => {
    try {
      await updateConversation(conversationId, { folder: undefined })
    } catch (error) {
      console.error('Failed to remove folder from conversation:', error)
    }
  }

  const handleAddSpace = (newSpace: { name: string; icon: string; color: string }) => {
    // This would integrate with the backend space/folder system
    console.log('Adding new space:', newSpace)
    setShowAddSpaceDialog(false)
  }

  // Show loading while user is loading or if there's an error
  if (userLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading Qlippy...</span>
        </div>
      </div>
    )
  }

  // Show error if user initialization failed
  if (userError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Error Loading Qlippy</h2>
          <p className="text-muted-foreground mb-4">{userError}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onConversationSelect={(id) => {
            setActiveConversationId(id)
            loadConversation(id)
          }}
          onCreateConversation={createNewConversation}
          onDeleteConversation={handleDeleteClick}
          plugins={plugins}
          onTogglePlugin={togglePlugin}
          availableModels={availableModels}
          selectedModel={selectedModel}
          onModelSelect={setSelectedModel}
          onAddSpace={() => setShowAddSpaceDialog(true)}
          selectedSpaceForNewConversation={selectedSpaceForNewConversation}
          onSelectSpaceForNewConversation={setSelectedSpaceForNewConversation}
        />

        <SidebarInset className="flex-1 overflow-hidden">
          <div className="flex flex-col h-full w-full">
            {/* Header */}
            <div className="border-b px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Breadcrumb>
                    <BreadcrumbList>
                      <BreadcrumbItem>
                        <BreadcrumbLink href="/">Home</BreadcrumbLink>
                      </BreadcrumbItem>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>Chat</BreadcrumbPage>
                      </BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                </div>

                <div className="flex items-center space-x-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        {availableModels.find(m => m.id === selectedModel)?.name}
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                        >
                          <div className="flex items-center space-x-2">
                            <span>{model.name}</span>
                            {selectedModel === model.id && (
                              <Check className="h-4 w-4" />
                            )}
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-hidden min-h-0">
              <ScrollArea className="h-full w-full">
                <div className="p-6 space-y-6">
                  {currentConversation?.messages.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">👋</div>
                      <h2 className="text-2xl font-semibold mb-2">
                        Welcome to Qlippy!
                      </h2>
                      <p className="text-muted-foreground mb-6">
                        Start a conversation with your AI assistant. I can help you with
                        questions, writing, coding, analysis, and much more.
                      </p>
                      <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4" />
                          <span>Local storage</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4" />
                          <span>Privacy focused</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Check className="h-4 w-4" />
                          <span>Always available</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    currentConversation?.messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.role === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg px-4 py-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-1">
                                {message.role === "user" ? "You" : "AI Assistant"}
                              </div>
                              <div className="whitespace-pre-wrap">{message.content}</div>
                              <div className="text-xs text-muted-foreground mt-2">
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  {isGenerating && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-lg px-4 py-3 bg-muted">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>AI is thinking using {availableModels.find(m => m.id === selectedModel)?.name}...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>
            </div>

            {/* Input Area */}
            <div className="border-t p-6">
              <div className="space-y-4">
                {/* File Uploads */}
                {uploadedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {uploadedFiles.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center space-x-2 bg-muted rounded-lg px-3 py-2"
                      >
                        {getFileIcon(file.type, file.file.name)}
                        <span className="text-sm">{file.file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message Input */}
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <Textarea
                      ref={textareaRef}
                      placeholder="Type your message..."
                      value={currentMessage}
                      onChange={(e) => setCurrentMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="min-h-[44px] max-h-[120px] resize-none"
                      disabled={isGenerating || isSending}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFileUpload}
                      disabled={isGenerating}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleVoiceInput}
                      disabled={isGenerating}
                    >
                      <Mic className={`h-4 w-4 ${isRecording ? 'text-red-500' : ''}`} />
                    </Button>
                    <Button
                      onClick={() => {
                        console.log('Send button clicked')
                        handleSendMessage()
                      }}
                      disabled={!currentMessage.trim() || isGenerating || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        onConfirm={deleteCurrentConversation}
      />

      <AddSpaceDialog
        open={showAddSpaceDialog}
        onOpenChange={setShowAddSpaceDialog}
        onAddSpace={handleAddSpace}
      />
    </SidebarProvider>
  )
} 