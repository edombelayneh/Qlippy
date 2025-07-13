"use client"

import * as React from "react"
import { AssistantMessage } from "./assistant-message"
import { UserMessage } from "./user-message"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { Message } from "@/lib/types"

interface MessageListProps {
  messages: Message[]
  isGenerating: boolean
  streamingMessage?: string
  messagesEndRef: React.RefObject<HTMLDivElement>
  onRegenerateResponse?: (messageId: string) => void
  onEditUserMessage?: (messageId: string, newContent: string) => void
  onEditAndRegenerate?: (messageId: string, newContent: string) => void
  onStopGeneration?: () => void
}

export function MessageList({ 
  messages = [], 
  isGenerating, 
  streamingMessage, 
  messagesEndRef,
  onRegenerateResponse,
  onEditUserMessage,
  onEditAndRegenerate,
  onStopGeneration
}: MessageListProps) {
  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div className="space-y-6 max-w-4xl mx-auto p-4 pb-6">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "user" ? (
                <UserMessage 
                  content={message.content} 
                  messageId={message.id}
                  onEdit={onEditUserMessage}
                  onEditAndRegenerate={onEditAndRegenerate}
                  isGenerating={isGenerating}
                />
              ) : (
                <AssistantMessage 
                  content={message.content} 
                  messageId={message.id}
                  onRegenerate={onRegenerateResponse}
                  isGenerating={isGenerating}
                />
              )}
            </div>
          ))}

          {/* Show streaming message if available */}
          {streamingMessage && (
            <div>
              <AssistantMessage 
                content={streamingMessage} 
                messageId="streaming"
                isGenerating={isGenerating}
              />
            </div>
          )}

          {isGenerating && !streamingMessage && (
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
  )
} 