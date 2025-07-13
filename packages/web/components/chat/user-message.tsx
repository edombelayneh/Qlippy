"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Copy, Pencil, Check, X, Send } from "lucide-react"
import { toast } from "sonner"

interface UserMessageProps {
  content: string
  messageId: string
  onEdit?: (messageId: string, newContent: string) => void
  onEditAndRegenerate?: (messageId: string, newContent: string) => void
  isGenerating?: boolean
}

export function UserMessage({ 
  content, 
  messageId, 
  onEdit, 
  onEditAndRegenerate, 
  isGenerating 
}: UserMessageProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editedContent, setEditedContent] = React.useState(content)
  const [isCopied, setIsCopied] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast.success("Copied to clipboard")
  }

  const handleEdit = () => {
    if (isGenerating) return
    setIsEditing(true)
    setEditedContent(content)
  }

  const handleSaveEdit = () => {
    if (onEdit && editedContent.trim() !== content) {
      onEdit(messageId, editedContent.trim())
    }
    setIsEditing(false)
  }

  const handleSendEdit = () => {
    if (onEditAndRegenerate && editedContent.trim()) {
      onEditAndRegenerate(messageId, editedContent.trim())
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedContent(content)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Auto-resize textarea and focus when editing starts
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current
      textarea.focus()
      
      // Position cursor at the end
      const length = textarea.value.length
      textarea.setSelectionRange(length, length)
      
      // Auto-resize functionality
      const autoResize = () => {
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
      }
      
      autoResize()
      textarea.addEventListener('input', autoResize)
      
      return () => {
        textarea.removeEventListener('input', autoResize)
      }
    }
  }, [isEditing])

  return (
    <div className="flex justify-end">
      <div className={`group transition-all duration-200 ${
        isEditing ? 'w-full max-w-[80%]' : 'max-w-[80%]'
      }`}>
        <Card className={`bg-muted border-border/50 transition-all duration-200 ${
          isEditing ? 'shadow-lg border-primary/20' : ''
        }`}>
          <CardContent className={`transition-all duration-200 ${
            isEditing ? 'p-3' : 'p-4'
          }`}>
            {isEditing ? (
              <div>
                <Textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="min-h-[60px] max-h-[200px] resize-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 text-sm mb-2"
                  placeholder="Edit your message..."
                  disabled={isGenerating}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 px-3 text-xs"
                    disabled={isGenerating}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSendEdit}
                    disabled={!editedContent.trim() || isGenerating}
                    className="h-8 px-3 text-xs bg-primary hover:bg-primary/90"
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap text-foreground">{content}</p>
            )}
          </CardContent>
        </Card>
        
        {/* Action Buttons - appear on hover */}
        {!isEditing && (
          <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
              title="Copy text"
            >
              {isCopied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
              onClick={handleEdit}
              disabled={isGenerating}
              title="Edit message"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 