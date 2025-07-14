"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Send, X, SquareArrowOutUpRight, Loader2 } from "lucide-react"

// This should be kept in sync with the Message type in app/chat/page.tsx
interface Message {
  id: string;
  role: "user" | "assistant" | "tool";
  content: string;
  tool_call?: any;
}

// The component no longer needs props for event handling
export function CompanionChat() {
  const [messages, setMessages] = React.useState<Message[]>([
    { id: '1', role: 'assistant', content: "What can I help you with?" }
  ]);
  const [input, setInput] = React.useState("");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTo({ top: scrollViewportRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    
    const query = input;
    setInput("");
    setIsGenerating(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = { id: assistantMessageId, role: "assistant", content: "" };
    setMessages(prev => [...prev, assistantMessage]);
    
    await fetchAndProcessLLMResponse(query, assistantMessageId);
  }

  const fetchAndProcessLLMResponse = async (query: string, messageId: string, toolResponse?: any) => {
    let fullResponse = "";
    try {
      let body;
      if (toolResponse) {
        const conversationHistory: Message[] = [
          ...messages.filter(m => m.id !== messageId), // Exclude the placeholder
          { role: 'assistant', content: JSON.stringify(toolResponse.tool_call), id: '' },
          { role: 'tool' as const, content: JSON.stringify(toolResponse.result), id: '' }
        ];
        body = JSON.stringify({ query: query, messages: conversationHistory });
      } else {
        const conversationHistory = messages.filter(m => m.id !== messageId);
        body = JSON.stringify({ query: query, messages: conversationHistory });
      }

      const response = await fetch("http://127.0.0.1:8000/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });

      if (!response.ok || !response.body) throw new Error("Network response was not ok.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, content: fullResponse } : msg));
      }

      const jsonRegex = /\{[\s\S]*\}/;
      const jsonMatch = fullResponse.match(jsonRegex);
      if (jsonMatch) {
        let parsed = JSON.parse(jsonMatch[0]);
        if (parsed.function) { // Normalize
            parsed = { tool: parsed.function, parameters: parsed.params };
        }
        if (parsed.tool) {
          await handleToolCall(parsed, query, messageId);
          return;
        }
      }
      setIsGenerating(false);

    } catch (error) {
      console.error("Fetch Error:", error);
      setMessages(prev => prev.map(msg => msg.id === messageId ? { ...msg, content: "Sorry, an error occurred." } : msg));
      setIsGenerating(false);
    }
  }

  const handleToolCall = async (toolCall: any, originalQuery: string, assistantMessageId: string) => {
    let toolResult;
    
    // Hide the intermediate tool call message from the user
    setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));

    if (window.api?.fs && typeof window.api.fs[toolCall.tool as keyof typeof window.api.fs] === 'function') {
        try {
            const toolFn = window.api.fs[toolCall.tool as keyof typeof window.api.fs] as any;
            let args;
            if (toolCall.tool === 'searchFiles' || toolCall.tool === 'openApplication') {
                args = toolCall.parameters;
            } else {
                args = toolCall.parameters.path;
            }
            toolResult = await toolFn(args);
        } catch (e: any) {
            toolResult = { success: false, error: e.message };
        }
    } else {
        toolResult = { success: false, error: `Unknown tool: ${toolCall.tool}` };
    }

    if (toolCall.tool === 'openApplication' && toolResult.success) {
      const finalAnswerId = (Date.now() + 1).toString();
      const appName = toolCall.parameters.appName;
      const finalAnswerMessage: Message = { 
          id: finalAnswerId, 
          role: 'assistant', 
          content: `I've opened ${appName} for you.` 
      };
      setMessages(prev => [...prev, finalAnswerMessage]);
      setIsGenerating(false);
      return;
    }

    const finalAnswerId = (Date.now() + 1).toString();
    const finalAnswerMessage: Message = { id: finalAnswerId, role: 'assistant', content: "" };
    setMessages(prev => [...prev, finalAnswerMessage]);

    await fetchAndProcessLLMResponse(originalQuery, finalAnswerId, {
      tool_call: toolCall,
      result: toolResult
    });
  }

  return (
    <div className="flex flex-col w-full max-w-md mx-auto flex-1 overflow-hidden pb-2">
      <div
        ref={scrollViewportRef}
        className="flex-1 flex flex-col-reverse gap-4 p-4 overflow-y-auto subtle-scrollbar"
      >
        {isGenerating && messages[messages.length - 1]?.role === 'assistant' && (
            <div className="flex items-end gap-2 justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-2 text-sm bg-white/90 flex items-center">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
              </div>
            </div>
        )}
        {[...messages].reverse().map((message) => (
          <div key={message.id} className={`flex items-end gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {message.role === 'tool' ? (
                <div className="text-xs text-center w-full my-1 text-white/70 italic bg-black/20 rounded-full px-3 py-1">{message.content}</div>
            ) : (
              <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm shadow-md ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white/90 text-gray-900 backdrop-blur-sm'}`}>
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="px-4 pt-2">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Qlippy anything..."
            autoComplete="off"
            disabled={isGenerating}
            className="bg-white/80 backdrop-blur-sm border-white/20 focus-visible:ring-blue-500 text-black placeholder:text-gray-600"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isGenerating} className="bg-blue-600 hover:bg-blue-700 flex-shrink-0">
            <Send className="h-4 w-4 text-white" />
          </Button>
        </form>
      </div>
    </div>
  )
} 