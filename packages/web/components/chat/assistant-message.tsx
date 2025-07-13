"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Copy, RotateCcw, AudioLines, Check, Square } from "lucide-react"
import { MarkdownRenderer } from "./markdown-renderer"
import { toast } from "sonner"

interface AssistantMessageProps {
  content: string
  messageId: string
  onRegenerate?: (messageId: string) => void
  isGenerating?: boolean
}

export function AssistantMessage({ content, messageId, onRegenerate, isGenerating }: AssistantMessageProps) {
  const [isCopied, setIsCopied] = React.useState(false)
  const [isPlayingTTS, setIsPlayingTTS] = React.useState(false)
  const utteranceRef = React.useRef<SpeechSynthesisUtterance | null>(null)

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(content)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
    toast.success("Copied to clipboard")
  }

  const handleRegenerate = () => {
    if (onRegenerate && !isGenerating) {
      onRegenerate(messageId)
    }
  }

  const handleTTSToggle = () => {
    if (!('speechSynthesis' in window)) {
      toast.error("Text-to-speech is not supported in your browser")
      return
    }

    if (isPlayingTTS) {
      // Stop playback
      window.speechSynthesis.cancel()
      setIsPlayingTTS(false)
      utteranceRef.current = null
    } else {
      // Start playback
      try {
        // Cancel any ongoing speech first
        window.speechSynthesis.cancel()
        
        const utterance = new SpeechSynthesisUtterance(content)
        utteranceRef.current = utterance
        
        // Get available voices
        const voices = window.speechSynthesis.getVoices()
        const preferredLang = navigator.language || 'en-US'
        
        // Try to find a voice matching the user's language
        let voice = voices.find(v => v.lang === preferredLang)
        if (!voice) {
          // Fallback to any English voice
          voice = voices.find(v => v.lang.startsWith('en'))
        }
        if (voice) {
          utterance.voice = voice
        }
        
        utterance.rate = 1.0
        utterance.pitch = 1.0
        utterance.volume = 1.0
        
        // Set up event handlers
        utterance.onstart = () => {
          setIsPlayingTTS(true)
        }
        
        utterance.onend = () => {
          setIsPlayingTTS(false)
          utteranceRef.current = null
        }
        
        utterance.onerror = (event) => {
          console.error("TTS error:", event)
          setIsPlayingTTS(false)
          utteranceRef.current = null
          toast.error("Failed to play audio")
        }
        
        // Start speaking
        window.speechSynthesis.speak(utterance)
      } catch (error) {
        console.error("TTS error:", error)
        toast.error("Failed to start text-to-speech")
        setIsPlayingTTS(false)
      }
    }
  }

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Stop TTS if component receives new content while playing
  React.useEffect(() => {
    if (isPlayingTTS && utteranceRef.current) {
      window.speechSynthesis.cancel()
      setIsPlayingTTS(false)
      utteranceRef.current = null
    }
  }, [content])

  return (
    <div className="space-y-3">
      <MarkdownRenderer content={content} />
      
      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 hover:bg-accent text-muted-foreground hover:text-foreground"
          onClick={handleCopyMarkdown}
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
          onClick={handleRegenerate}
          disabled={isGenerating}
          title="Regenerate response"
        >
          <RotateCcw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 hover:bg-accent transition-colors ${
            isPlayingTTS 
              ? 'text-primary bg-primary/10 hover:bg-primary/20' 
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={handleTTSToggle}
          title={isPlayingTTS ? "Stop audio playback" : "Play with text-to-speech"}
        >
          {isPlayingTTS ? (
            <Square className="h-4 w-4" />
          ) : (
            <AudioLines className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
} 