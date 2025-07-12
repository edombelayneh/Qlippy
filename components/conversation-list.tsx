"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Folder, MoreHorizontal, Trash2 } from "lucide-react"
import { FolderSelector, FolderTag, FolderDialog } from "./folder-selector"
import { ConfirmationDialog } from "./confirmation-dialog"

interface Conversation {
  id: string
  title: string
  messages: any[]
  messageCount: number
  lastUpdated: Date
  folder?: string
}

interface Folder {
  id: string
  name: string
  icon: string
  color: string
}

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string
  onConversationSelect: (id: string) => void
  onNewConversation: () => void
  folders: Folder[]
  selectedFolder: string | null
  onFolderSelect: (folderId: string | null) => void
  onAddFolder: (conversationId: string, folderId: string) => void
  onRemoveFolder: (conversationId: string) => void
  onDeleteConversation?: (conversationId: string) => void
}

export function ConversationList({
  conversations,
  activeConversationId,
  onConversationSelect,
  onNewConversation,
  folders,
  selectedFolder,
  onFolderSelect,
  onAddFolder,
  onRemoveFolder,
  onDeleteConversation
}: ConversationListProps) {
  const [showFolderDialog, setShowFolderDialog] = React.useState(false)
  const [editingConversationId, setEditingConversationId] = React.useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [conversationToDelete, setConversationToDelete] = React.useState<string | null>(null)

  // Filter conversations by selected folder
  const filteredConversations = selectedFolder 
    ? conversations.filter(conv => conv.folder === selectedFolder)
    : conversations.filter(conv => !conv.folder) // Show untagged conversations when no folder selected

  const getFolderInfo = (folderId: string) => {
    return folders.find(f => f.id === folderId)
  }

  return (
    <div className="space-y-4 px-3">
      {/* Conversations */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {selectedFolder ? getFolderInfo(selectedFolder)?.name : 'Chats'}
        </div>
        
        <div className="space-y-1">
          {filteredConversations.map((conversation) => {
            const folderInfo = conversation.folder ? getFolderInfo(conversation.folder) : null
            
            return (
              <div
                key={conversation.id}
                className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${
                  activeConversationId === conversation.id
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onConversationSelect(conversation.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {conversation.title}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {conversation.messageCount} messages
                    </div>
                  </div>
                  
                  {/* Folder Tag */}
                  {folderInfo && (
                    <FolderTag 
                      folder={folderInfo} 
                      size="sm"
                      onRemove={() => onRemoveFolder(conversation.id)}
                    />
                  )}
                  
                  {/* Actions Menu */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setEditingConversationId(conversation.id)
                        setShowFolderDialog(true)
                      }}
                    >
                      <MoreHorizontal className="h-3 w-3" />
                    </Button>
                    {onDeleteConversation && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setConversationToDelete(conversation.id)
                          setShowDeleteDialog(true)
                        }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Folder Dialog */}
      <FolderDialog
        open={showFolderDialog}
        onOpenChange={setShowFolderDialog}
        folders={folders}
        onAddFolder={onAddFolder}
        conversationId={editingConversationId || ''}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={() => {
          if (conversationToDelete && onDeleteConversation) {
            onDeleteConversation(conversationToDelete)
            setConversationToDelete(null)
          }
        }}
        title="Delete Conversation"
        description="Are you sure you want to delete this conversation? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
} 