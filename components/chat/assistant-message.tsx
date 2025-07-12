"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, Copy, RotateCcw, Share } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown-renderer"

interface AssistantMessageProps {
  content: string
}

export function AssistantMessage({ content }: AssistantMessageProps) {
  return (
    <div className="space-y-3">
      <MarkdownRenderer content={content} />
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => console.log('Thumbs up')}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => console.log('Thumbs down')}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => navigator.clipboard.writeText(content)}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => console.log('Regenerate')}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={() => console.log('Share')}
        >
          <Share className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 