"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Copy, Pencil } from "lucide-react"

interface UserMessageProps {
  content: string
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="group max-w-[80%]">
        <Card className="bg-muted border-border/50">
          <CardContent className="p-4">
            <p className="text-sm whitespace-pre-wrap text-foreground">{content}</p>
          </CardContent>
        </Card>
        
        {/* Action Buttons - appear on hover */}
        <div className="flex items-center justify-end gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
            onClick={() => console.log('Edit message')}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 