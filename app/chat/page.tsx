"use client"

import * as React from "react"
import { Loader2, Send, Mic, ChevronDown, Check, ThumbsUp, ThumbsDown, Copy, RotateCcw, Pencil, Trash2, MoreHorizontal, Edit, Share, Paperclip, FileText, FileImage, FileVideo, FileAudio, X, File } from "lucide-react"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

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
  lastUpdated: Date
  folder?: string // Optional folder tag
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
  const [isLoading, setIsLoading] = React.useState(true)

  React.useEffect(() => {
    // Simulate app initialization
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000) // Show loader for 2 seconds

    return () => clearTimeout(timer)
  }, [])

  const [conversations, setConversations] = React.useState<Conversation[]>([
    {
      id: "1",
      title: "Getting Started",
      messages: [
        {
          id: "1",
          role: "user",
          content: "Hello! How can you help me today?",
          timestamp: new Date(Date.now() - 3600000),
        },
        {
          id: "2",
          role: "assistant",
          content:
            "Hello! I'm your AI assistant. I can help you with a wide variety of tasks including answering questions, writing, coding, analysis, and more. What would you like to work on?",
          timestamp: new Date(Date.now() - 3500000),
        },
      ],
      lastUpdated: new Date(Date.now() - 3500000),
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
      folder: "work"
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
      folder: "personal"
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
      folder: "side-projects"
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
      folder: "hobbies"
    },
  ])

  const [activeConversationId, setActiveConversationId] = React.useState("1")
  const [currentMessage, setCurrentMessage] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [selectedModel, setSelectedModel] = React.useState("gpt-4")
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const [selectedFolder, setSelectedFolder] = React.useState<string | null>(null)
  const [showFolderDialog, setShowFolderDialog] = React.useState(false)
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null)
  const [showAddSpaceDialog, setShowAddSpaceDialog] = React.useState(false)

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

  const activeConversation = conversations.find((c) => c.id === activeConversationId)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [activeConversation?.messages])

  // Auto-resize textarea with max height constraint
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to calculate new scroll height
      textarea.style.height = 'auto'
      // Set height up to max of 120px, then let it scroll
      const newHeight = Math.min(textarea.scrollHeight, 120)
      textarea.style.height = newHeight + 'px'
    }
  }, [currentMessage])

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [uploadedFiles])

  const handleSendMessage = async () => {
    if ((!currentMessage.trim() && uploadedFiles.length === 0) || isGenerating) return;

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

    const query = currentMessage;
    setCurrentMessage("")
    setUploadedFiles([]) // Clear uploaded files after sending
    setIsGenerating(true)

    // --- Streaming API Call ---
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === activeConversationId
          ? {
              ...conv,
              messages: [...conv.messages, assistantMessage],
            }
          : conv,
      ),
    );

    try {
      const response = await fetch("http://127.0.0.1:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query,
          // You can pass other parameters here from your state if needed
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        const chunk = decoder.decode(value, { stream: !done });
        
        if (chunk) {
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeConversationId
                ? {
                    ...conv,
                    messages: conv.messages.map((msg) =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: msg.content + chunk }
                        : msg
                    ),
                    lastUpdated: new Date(),
                  }
                : conv
            )
          );
        }
      }
    } catch (error) {
      console.error("Failed to fetch from AI service:", error);
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                messages: conv.messages.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: "Sorry, I am unable to connect to the AI service at the moment. Please ensure the Python server is running and refresh." }
                    : msg
                ),
              }
            : conv
        )
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleVoiceInput = () => {
    // Voice input functionality would go here
    console.log("Voice input activated")
    textareaRef.current?.focus()
  }

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
        
        // Create preview for images
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
    
    // Reset the input
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

  const togglePlugin = (pluginId: string) => {
    setPlugins((prev) =>
      prev.map((plugin) => (plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin)),
    )
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

  const currentModel = availableModels.find(m => m.id === selectedModel)

  // Folders state - now mutable
  const [folders, setFolders] = React.useState([
    { id: 'personal', name: 'Personal', icon: '👤', color: 'bg-blue-100 text-blue-800' },
    { id: 'work', name: 'Work', icon: '💼', color: 'bg-green-100 text-green-800' },
    { id: 'side-projects', name: 'Side Projects', icon: '🚀', color: 'bg-purple-100 text-purple-800' },
    { id: 'hobbies', name: 'Hobbies', icon: '🎨', color: 'bg-orange-100 text-orange-800' }
  ])

  // Filter conversations by selected folder
  const filteredConversations = selectedFolder 
    ? conversations.filter(conv => conv.folder === selectedFolder)
    : conversations.filter(conv => !conv.folder) // Show untagged conversations when no folder selected

  // Get folder info
  const getFolderInfo = (folderId: string) => {
    return folders.find(f => f.id === folderId)
  }

  // Add folder to conversation
  const addFolderToConversation = (conversationId: string, folderId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, folder: folderId }
        : conv
    ))
  }

  // Remove folder from conversation
  const removeFolderFromConversation = (conversationId: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId 
        ? { ...conv, folder: undefined }
        : conv
    ))
  }

  // Add new space
  const handleAddSpace = (newSpace: { name: string; icon: string; color: string }) => {
    const newId = `space-${Date.now()}`
    setFolders(prev => [...prev, { ...newSpace, id: newId }])
  }

  return (
    <>
      <SidebarProvider>
        <AppSidebar 
          spaces={folders.map(folder => ({
            id: folder.id,
            name: folder.name,
            icon: folder.icon,
            color: folder.color,
            conversationCount: conversations.filter(conv => conv.folder === folder.id).length
          }))}
          selectedSpace={selectedFolder}
          onSpaceSelect={setSelectedFolder}
          onAddSpace={() => setShowAddSpaceDialog(true)}
        />
        <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>Chats</BreadcrumbLink>
                </BreadcrumbItem>
                {selectedFolder && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbLink>{getFolderInfo(selectedFolder)?.name}</BreadcrumbLink>
                    </BreadcrumbItem>
                  </>
                )}
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>New Conversation</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto">
              <Button 
                variant="ghost" 
                size="sm"
                className="gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={handleDeleteClick}
              >
                <Trash2 className="h-4 w-4" />
                Delete Chat
              </Button>
            </div>
          </header>

          {/* Chat Messages */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="space-y-6 max-w-4xl mx-auto p-4 pb-6">
                {activeConversation?.messages.map((message) => (
                  <div key={message.id} className="space-y-3">
                                      {message.role === "user" ? (
                    // User Message - Card Style with hover actions
                    <div className="flex justify-end">
                      <div className="group max-w-[80%]">
                        <Card className="bg-muted border-border/50">
                          <CardContent className="p-4">
                            <p className="text-sm whitespace-pre-wrap text-foreground">{message.content}</p>
                          </CardContent>
                        </Card>
                        
                        {/* Action Buttons - appear on hover */}
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => console.log('Edit message')}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                      // AI Response - Free Text with Actions
                      <div className="space-y-3">
                        <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:p-0">
                          {message.content ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                code({ node, className, children, ...props }) {
                                  const { ref, ...rest } = props;
                                  const match = /language-(\w+)/.exec(className || '')
                                  return match ? (
                                    <SyntaxHighlighter
                                      {...rest}
                                      style={vscDarkPlus as any}
                                      language={match[1]}
                                      PreTag="div"
                                    >
                                      {String(children).replace(/\n$/, '')}
                                    </SyntaxHighlighter>
                                  ) : (
                                    <code className={className} {...props}>
                                      {children}
                                    </code>
                                  )
                                }
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          ) : (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">Thinking...</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => console.log('Thumbs up')}
                          >
                            <ThumbsUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => console.log('Thumbs down')}
                          >
                            <ThumbsDown className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => console.log('Regenerate')}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
                            onClick={() => console.log('Share')}
                          >
                            <Share className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isGenerating && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Message Input - Fixed at bottom */}
          <div className="sticky bottom-0 flex-shrink-0 p-6 bg-background/95 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto">
              {/* Input Container */}
              <div className="relative">
                <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-ring/50 rounded-2xl overflow-hidden">
                  <CardContent className="p-0">
                    {/* Uploaded Files Display */}
                    {uploadedFiles.length > 0 && (
                      <div className="px-4 pt-3 pb-2 border-b border-border/30">
                        <div className="flex gap-2 overflow-x-auto pb-1 pt-2 px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                          {uploadedFiles.map((uploadedFile) => (
                            <div
                              key={uploadedFile.id}
                              className="relative flex-shrink-0 w-12 h-12 bg-muted rounded-md border border-border/50 hover:border-border transition-colors group"
                            >
                              {/* Remove Button */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="absolute -top-1 -right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                onClick={() => removeFile(uploadedFile.id)}
                              >
                                <X className="h-2 w-2" />
                              </Button>

                              {/* File Content */}
                              <div className="w-full h-full flex flex-col items-center justify-center p-1">
                                {uploadedFile.type === 'image' && uploadedFile.preview ? (
                                  <img
                                    src={uploadedFile.preview}
                                    alt={uploadedFile.file.name}
                                    className="w-full h-full object-cover rounded-sm"
                                  />
                                ) : (
                                  <div className="flex flex-col items-center justify-center text-center">
                                    <div className="text-muted-foreground">
                                      {getFileIcon(uploadedFile.type, uploadedFile.file.name)}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* File Name Tooltip */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-0.5 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity truncate text-center">
                                {uploadedFile.file.name.length > 12 
                                  ? `${uploadedFile.file.name.substring(0, 12)}...` 
                                  : uploadedFile.file.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Textarea Area */}
                    <div className="px-4 py-2 pb-2 max-h-32">
                      <Textarea
                        ref={textareaRef}
                        value={currentMessage}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask Qlippy anything..."
                        disabled={isGenerating}
                        rows={2}
                        className="border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/70 px-0 py-0 min-h-[48px] max-h-28 shadow-none overflow-y-auto w-full !bg-transparent focus:bg-transparent hover:bg-transparent"
                      />
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between px-4 py-3">
                      {/* Left Side - File Upload Button */}
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          onClick={handleFileUpload}
                        >
                          <Paperclip className="h-3 w-3" />
                        </Button>
                        {/* Hidden file input */}
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          accept=".txt,.pdf,.mp4,.mp3,.wav,.avi,.mov,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>

                      {/* Right Side - Model Selector & Action Buttons */}
                      <div className="flex items-center gap-2">
                        {/* Model Selector */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            >
                              <span>{currentModel?.name}</span>
                              <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-64">
                            <div className="p-2 border-b">
                              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                AI Model
                              </div>
                            </div>
                            {availableModels.map((model) => (
                              <DropdownMenuItem
                                key={model.id}
                                onClick={() => setSelectedModel(model.id)}
                                className="flex items-start gap-3 p-3 cursor-pointer"
                              >
                                <div className="flex items-center justify-center w-4 h-4 mt-0.5">
                                  {selectedModel === model.id && (
                                    <Check className="h-3 w-3 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm">{model.name}</div>
                                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                    {model.description}
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Voice/Send Button */}
                        {currentMessage.trim() ? (
                          <Button
                            onClick={handleSendMessage}
                            disabled={isGenerating}
                            size="sm"
                            className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                          >
                            {isGenerating ? (
                              <>
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                <span className="text-xs">Sending...</span>
                              </>
                            ) : (
                              <>
                                <Send className="mr-1 h-3 w-3" />
                                <span className="text-xs">Send</span>
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={handleVoiceInput}
                            variant="ghost"
                            size="sm"
                            className="h-7 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          >
                            <Mic className="mr-1 h-3 w-3" />
                            <span className="text-xs">Voice</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

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

      {/* Add Space Dialog */}
      <AddSpaceDialog
        open={showAddSpaceDialog}
        onOpenChange={setShowAddSpaceDialog}
        onAddSpace={handleAddSpace}
      />
    </SidebarProvider>
    </>
  )
} 