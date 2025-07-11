"use client"

import * as React from "react"

import { Bot, User, Loader2, Send } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Separator } from "./ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { SidebarTrigger } from "./ui/sidebar";
import { Card, CardContent } from "./ui/card";

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
  }
  
  interface Plugin {
    id: string
    name: string
    description: string
    enabled: boolean
  }  

export function ChatPanel() {
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
      ])
    
      const [activeConversationId, setActiveConversationId] = React.useState("1")
      const [currentMessage, setCurrentMessage] = React.useState("")
      const [isGenerating, setIsGenerating] = React.useState(false)
      const [conversationsCollapsed, setConversationsCollapsed] = React.useState(false)
      const [isPluginDialogOpen, setIsPluginDialogOpen] = React.useState(false)
      const [newPluginName, setNewPluginName] = React.useState("")
      const [newPluginDescription, setNewPluginDescription] = React.useState("")
    
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
    
      const activeConversation = conversations.find((c) => c.id === activeConversationId)
      const messagesEndRef = React.useRef<HTMLDivElement>(null)
    
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    
      React.useEffect(() => {
        scrollToBottom()
      }, [activeConversation?.messages])
    
      const handleSendMessage = async () => {
        if (!currentMessage.trim() || isGenerating) return
    
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
    
        setCurrentMessage("")
        setIsGenerating(true)
    
        // Simulate AI response
        setTimeout(() => {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: `I understand you said: "${userMessage.content}". This is a simulated response. In a real implementation, this would be connected to an AI model to generate meaningful responses based on your input.`,
            timestamp: new Date(),
          }
    
          setConversations((prev) =>
            prev.map((conv) =>
              conv.id === activeConversationId
                ? {
                    ...conv,
                    messages: [...conv.messages, assistantMessage],
                    lastUpdated: new Date(),
                  }
                : conv,
            ),
          )
          setIsGenerating(false)
        }, 1500)
      }
    
      const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault()
          handleSendMessage()
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
    
      const addPlugin = () => {
        if (!newPluginName.trim() || !newPluginDescription.trim()) return
    
        const newPlugin: Plugin = {
          id: Date.now().toString(),
          name: newPluginName,
          description: newPluginDescription,
          enabled: false,
        }
    
        setPlugins((prev) => [...prev, newPlugin])
        setNewPluginName("")
        setNewPluginDescription("")
        setIsPluginDialogOpen(false)
      }
    
      const togglePlugin = (pluginId: string) => {
        setPlugins((prev) =>
          prev.map((plugin) => (plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin)),
        )
      }
    
    return (
        <div className="flex flex-col h-full">
        {/* Chat Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4 max-w-4xl mx-auto">
            {activeConversation?.messages.map((message) => (
              <div key={message.id} className="space-y-2">
                <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <Card
                    className={`max-w-[80%] ${message.role === "user" ? "bg-primary text-primary-foreground" : ""}`}
                  >
                    <CardContent className="p-3">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-70 mt-2">{message.timestamp.toLocaleTimeString()}</p>
                    </CardContent>
                  </Card>
                  {message.role === "user" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
                <Separator className="my-4" />
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <Card>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  disabled={isGenerating}
                  className="pr-20"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  Enter ↵
                </div>
              </div>
              <Button onClick={handleSendMessage} disabled={!currentMessage.trim() || isGenerating} size="icon">
                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
}