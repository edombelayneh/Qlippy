"use client"

import * as React from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface Folder {
  id: string
  name: string
}

interface ChatHeaderProps {
  selectedFolder?: Folder | null
  onDelete: () => void
}

export function ChatHeader({ selectedFolder, onDelete }: ChatHeaderProps) {
  return (
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
                <BreadcrumbLink>{selectedFolder.name}</BreadcrumbLink>
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
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          Delete Chat
        </Button>
      </div>
    </header>
  )
} 