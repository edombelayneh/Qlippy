"use client"

import * as React from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"
import { UserMessage } from "./user-message"
import { AssistantMessage } from "./assistant-message"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface MessageListProps {
  messages: Message[]
  isGenerating: boolean
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export function MessageList({ messages, isGenerating, messagesEndRef }: MessageListProps) {
  return (
    <div className="flex-1 min-h-0">
      <ScrollArea className="h-full">
        <div className="space-y-6 max-w-4xl mx-auto p-4 pb-6">
          {messages.map((message) => (
            <div key={message.id}>
              {message.role === "user" ? (
                <UserMessage content={message.content} />
              ) : (
                <AssistantMessage content={message.content} />
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
  )
} 