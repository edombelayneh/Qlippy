"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Folder, Plus, X } from "lucide-react"

interface Folder {
  id: string
  name: string
  icon: string
  color: string
}

interface FolderSelectorProps {
  folders: Folder[]
  selectedFolder: string | null
  onFolderSelect: (folderId: string | null) => void
  onAddFolder?: (conversationId: string, folderId: string) => void
  onRemoveFolder?: (conversationId: string) => void
  conversationId?: string
  showAllOption?: boolean
}

export function FolderSelector({
  folders,
  selectedFolder,
  onFolderSelect,
  onAddFolder,
  onRemoveFolder,
  conversationId,
  showAllOption = true
}: FolderSelectorProps) {
  return (
    <div className="space-y-3">
      {showAllOption && (
        <Button
          variant={selectedFolder === null ? "default" : "outline"}
          size="sm"
          onClick={() => onFolderSelect(null)}
          className="w-full justify-start"
        >
          <Folder className="w-4 h-4 mr-2" />
          All Conversations
        </Button>
      )}
      
      {folders.map((folder) => (
        <Button
          key={folder.id}
          variant={selectedFolder === folder.id ? "default" : "outline"}
          size="sm"
          onClick={() => onFolderSelect(folder.id)}
          className="w-full justify-start"
        >
          <span className="mr-2">{folder.icon}</span>
          {folder.name}
        </Button>
      ))}
    </div>
  )
}

interface FolderTagProps {
  folder: Folder
  onRemove?: () => void
  size?: "sm" | "md"
}

export function FolderTag({ folder, onRemove, size = "md" }: FolderTagProps) {
  return (
    <Badge 
      variant="secondary" 
      className={`${folder.color} ${size === "sm" ? "text-xs px-2 py-1" : "px-2 py-1"}`}
    >
      <span className="mr-1">{folder.icon}</span>
      {folder.name}
      {onRemove && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-1 h-4 w-4 p-0 hover:bg-transparent"
          onClick={onRemove}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </Badge>
  )
}

interface FolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folders: Folder[]
  onAddFolder: (conversationId: string, folderId: string) => void
  conversationId: string
}

export function FolderDialog({
  open,
  onOpenChange,
  folders,
  onAddFolder,
  conversationId
}: FolderDialogProps) {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${open ? 'block' : 'hidden'}`}>
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <Card className="relative w-80">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Add to Folder</h3>
              <p className="text-sm text-muted-foreground">
                Choose a folder to organize this conversation
              </p>
            </div>
            
            <div className="space-y-2">
              {folders.map((folder) => (
                <Button
                  key={folder.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    onAddFolder(conversationId, folder.id)
                    onOpenChange(false)
                  }}
                >
                  <span className="mr-2">{folder.icon}</span>
                  {folder.name}
                </Button>
              ))}
            </div>
            
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 