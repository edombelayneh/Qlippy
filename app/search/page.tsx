"use client"

import * as React from "react"
import { Search, SquarePen, Clock, Trash2, MessageSquare } from "lucide-react"
import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

// Sample conversation data - in a real app this would come from your backend
const sampleConversations = [
  {
    id: "1",
    title: "Getting Started with Qlippy",
    lastMessage: "Hello! How can you help me today?",
    timestamp: "31 minutes ago",
    messageCount: 8
  },
  {
    id: "2", 
    title: "Python Plugin Development",
    lastMessage: "Can you help me create a custom plugin for data processing?",
    timestamp: "35 minutes ago",
    messageCount: 15
  },
  {
    id: "3",
    title: "AI Model Comparison",
    lastMessage: "What are the differences between GPT-4 and Claude?",
    timestamp: "35 minutes ago", 
    messageCount: 12
  },
  {
    id: "4",
    title: "Voice Commands Setup",
    lastMessage: "How do I configure the wake word detection?",
    timestamp: "1 hour ago",
    messageCount: 6
  },
  {
    id: "5",
    title: "Workflow Automation Ideas",
    lastMessage: "I need help automating my daily tasks",
    timestamp: "14 hours ago",
    messageCount: 23
  },
  {
    id: "6",
    title: "Code Review Assistant",
    lastMessage: "Can you review this React component for me?",
    timestamp: "2 days ago",
    messageCount: 18
  },
  {
    id: "7",
    title: "Data Analysis Project",
    lastMessage: "Help me analyze this CSV dataset",
    timestamp: "3 days ago",
    messageCount: 31
  },
  {
    id: "8",
    title: "Creative Writing Collaboration",
    lastMessage: "Let's work on a short story together",
    timestamp: "1 week ago",
    messageCount: 45
  }
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [conversations, setConversations] = React.useState(sampleConversations)
  const [filteredConversations, setFilteredConversations] = React.useState(sampleConversations)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [conversationToDelete, setConversationToDelete] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredConversations(conversations)
    } else {
      const filtered = conversations.filter(conv => 
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredConversations(filtered)
    }
  }, [searchQuery, conversations])

  const handleDeleteClick = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent card click
    setConversationToDelete(conversationId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteConversation = () => {
    if (conversationToDelete) {
      const updatedConversations = conversations.filter(conv => conv.id !== conversationToDelete)
      setConversations(updatedConversations)
      setConversationToDelete(null)
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Header */}
          <header className="flex h-16 items-center gap-4 border-b px-6">
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink>Search Chats</BreadcrumbLink>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            <div className="ml-auto">
              <Button asChild variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground transition-colors">
                <Link href="/chat">
                  <SquarePen className="h-4 w-4" />
                  New Chat
                </Link>
              </Button>
            </div>
          </header>

          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Page Header */}
              <div className="space-y-2">
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  Search Chats...
                </h1>
                <p className="text-muted-foreground">
                    Search through your conversation history to quickly find previous discussions
                </p>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search your chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-base"
                />
              </div>

              {/* Search Results */}
              <div className="space-y-3">
                {searchQuery && (
                  <div className="text-sm text-muted-foreground">
                    {filteredConversations.length === 0 
                      ? "No chats found" 
                      : `Found ${filteredConversations.length} chat${filteredConversations.length === 1 ? '' : 's'}`
                    }
                  </div>
                )}

                {filteredConversations.length === 0 && searchQuery ? (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Search className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No chats found</h3>
                      <p className="text-muted-foreground">
                        Try different keywords or start a new conversation
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => (
                      <Card 
                        key={conversation.id} 
                        className="group hover:bg-muted/50 transition-colors cursor-pointer relative"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">
                                {conversation.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {conversation.lastMessage}
                              </p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last message {conversation.timestamp}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {conversation.messageCount} messages
                                </div>
                              </div>
                            </div>
                            
                            {/* Delete Button - appears on hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => handleDeleteClick(conversation.id, e)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteConversation}
        title="Delete chat?"
        description="Are you sure you want to delete this chat?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </SidebarProvider>
  )
} 