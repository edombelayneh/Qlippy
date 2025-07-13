"use client"

import * as React from "react"
import { Search, SquarePen, Clock, Trash2, MessageSquare, Filter, X, ChevronDown, ChevronUp, User, Bot } from "lucide-react"
import Link from "next/link"

import { AppSidebar } from "@/components/app-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Badge } from "@/components/ui/badge"
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
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { qlippyAPI, Conversation, SearchResult } from "@/lib/api"
import { useRouter } from "next/navigation"

interface SearchFilters {
  showUserMessages: boolean;
  showAssistantMessages: boolean;
  sortBy: 'relevance' | 'date' | 'title';
}

export default function SearchPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SearchResult | null>(null)
  const [isSearching, setIsSearching] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [conversationToDelete, setConversationToDelete] = React.useState<string | null>(null)
  const [showFilters, setShowFilters] = React.useState(false)
  const [filters, setFilters] = React.useState<SearchFilters>({
    showUserMessages: true,
    showAssistantMessages: true,
    sortBy: 'relevance'
  })

  // Debounced search
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined)

  const performSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setIsSearching(true)
    try {
      const results = await qlippyAPI.searchConversations(query.trim())
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [])

  // Debounced search effect
  React.useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (searchQuery.trim()) {
      searchTimeoutRef.current = setTimeout(() => {
        performSearch(searchQuery)
      }, 300) // 300ms debounce
    } else {
      setSearchResults(null)
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [searchQuery, performSearch])

  const handleDeleteClick = (conversationId: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setConversationToDelete(conversationId)
    setShowDeleteDialog(true)
  }

  const confirmDeleteConversation = async () => {
    if (conversationToDelete) {
      try {
        await qlippyAPI.deleteConversation(conversationToDelete)
        // Refresh search results
        if (searchQuery.trim()) {
          await performSearch(searchQuery)
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error)
      }
      setConversationToDelete(null)
    }
  }

  const handleConversationClick = (conversationId: string) => {
    router.push(`/chat?conversation=${conversationId}`)
  }

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
          {part}
        </mark>
      ) : part
    )
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes} minute${diffInMinutes !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours)
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`
    } else if (diffInHours < 168) { // 7 days
      const days = Math.floor(diffInHours / 24)
      return `${days} day${days !== 1 ? 's' : ''} ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredResults = React.useMemo(() => {
    if (!searchResults) return []
    
    let results = searchResults.results

    // Filter by message type
    if (!filters.showUserMessages || !filters.showAssistantMessages) {
      results = results.map(conv => ({
        ...conv,
        matching_messages: conv.matching_messages?.filter(msg => {
          if (!filters.showUserMessages && msg.role === 'user') return false
          if (!filters.showAssistantMessages && msg.role === 'assistant') return false
          return true
        }) || []
      })).filter(conv => conv.matching_messages && conv.matching_messages.length > 0)
    }

    // Sort results
    switch (filters.sortBy) {
      case 'date':
        results.sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime())
        break
      case 'title':
        results.sort((a, b) => a.title.localeCompare(b.title))
        break
      case 'relevance':
      default:
        // Already sorted by relevance from backend
        break
    }

    return results
  }, [searchResults, filters])



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
                  Search Chats
                </h1>
                <p className="text-muted-foreground">
                  Search through your conversation history to quickly find previous discussions
                </p>
              </div>

              {/* Search Input */}
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base"
                  />
                  {searchQuery && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setSearchQuery("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="gap-2"
                  >
                    <Filter className="h-4 w-4" />
                    Filters
                    {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                  
                  {searchResults && (
                    <Badge variant="secondary">
                      {searchResults.total_results} result{searchResults.total_results !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* Filter Options */}
                {showFilters && (
                  <Card>
                    <CardContent className="p-4 space-y-4">
                      <div className="space-y-2">
                        <h4 className="font-medium">Message Types</h4>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={filters.showUserMessages}
                              onChange={(e) => setFilters(prev => ({ ...prev, showUserMessages: e.target.checked }))}
                              className="rounded"
                            />
                            <User className="h-4 w-4" />
                            User messages
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={filters.showAssistantMessages}
                              onChange={(e) => setFilters(prev => ({ ...prev, showAssistantMessages: e.target.checked }))}
                              className="rounded"
                            />
                            <Bot className="h-4 w-4" />
                            Assistant messages
                          </label>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Sort By</h4>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-between">
                              {filters.sortBy === 'relevance' ? 'Relevance' : 
                               filters.sortBy === 'date' ? 'Date' : 'Title'}
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, sortBy: 'relevance' }))}>
                              Relevance
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, sortBy: 'date' }))}>
                              Date
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setFilters(prev => ({ ...prev, sortBy: 'title' }))}>
                              Title
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Search Results */}
              <div className="space-y-3">
                {isSearching && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-3"></div>
                    <span className="text-muted-foreground">Searching...</span>
                  </div>
                )}

                {searchQuery && !isSearching && filteredResults.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Search className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No chats found</h3>
                      <p className="text-muted-foreground">
                        Try different keywords or start a new conversation
                      </p>
                    </CardContent>
                  </Card>
                )}

                {!isSearching && filteredResults.length > 0 && (
                  <div className="space-y-3">
                    {filteredResults.map((conversation) => (
                      <Card 
                        key={conversation.id} 
                        className="group hover:bg-muted/50 transition-colors cursor-pointer relative"
                        onClick={() => handleConversationClick(conversation.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium truncate">
                                  {highlightText(conversation.title, searchQuery)}
                                </h3>
                                {conversation.match_count && conversation.match_count > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {conversation.match_count} match{conversation.match_count !== 1 ? 'es' : ''}
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                {conversation.last_message_preview}
                              </p>

                              {/* Matching Messages */}
                              {conversation.matching_messages && conversation.matching_messages.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {conversation.matching_messages.map((message) => (
                                    <div key={message.id} className="bg-muted/50 rounded-lg p-3">
                                      <div className="flex items-center gap-2 mb-1">
                                        {message.role === 'user' ? (
                                          <User className="h-3 w-3 text-blue-500" />
                                        ) : (
                                          <Bot className="h-3 w-3 text-green-500" />
                                        )}
                                        <span className="text-xs text-muted-foreground">
                                          {message.role === 'user' ? 'You' : 'Assistant'} • {formatTimestamp(message.timestamp)}
                                        </span>
                                      </div>
                                      <p className="text-sm">
                                        {highlightText(message.preview, searchQuery)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last message {formatTimestamp(conversation.last_updated)}
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  {conversation.message_count} messages
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