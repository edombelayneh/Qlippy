"use client"

import * as React from "react"
import { Loader2, Send, Mic, ChevronDown, Check, Paperclip, FileText, FileImage, FileVideo, FileAudio, X, File } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AIModel, UploadedFile } from "@/lib/types"

interface ChatInputProps {
  currentMessage: string
  setCurrentMessage: (message: string) => void
  isGenerating: boolean
  isRecording: boolean
  isProcessing: boolean
  recordingMetrics: { max_amplitude?: number; mean_amplitude?: number; duration?: number; } | null
  selectedModel: string
  setSelectedModel: (model: string) => void
  availableModels: AIModel[]
  handleSendMessage: () => void
  handleVoiceInput: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  placeholder?: string
}

export function ChatInput({
  currentMessage,
  setCurrentMessage,
  isGenerating,
  isRecording,
  isProcessing,
  recordingMetrics,
  selectedModel,
  setSelectedModel,
  availableModels,
  handleSendMessage,
  handleVoiceInput,
  handleKeyPress,
  placeholder = "Ask Qlippy anything...",
}: ChatInputProps) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Auto-resize textarea with max height constraint
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to calculate new scroll height
      textarea.style.height = 'auto'
      // Set height up to max of 120px, then let it scroll
      const newHeight = Math.min(textarea.scrollHeight, 120)
      textarea.style.height = newHeight + 'px'
    }
  }, [currentMessage])

  // Cleanup preview URLs on unmount
  React.useEffect(() => {
    return () => {
      uploadedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [uploadedFiles])

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files && files.length > 0) {
      const newFiles: UploadedFile[] = []
      
      for (const file of Array.from(files)) {
        const fileType = getFileType(file)
        const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        let preview: string | undefined
        
        // Create preview for images
        if (fileType === 'image') {
          preview = URL.createObjectURL(file)
        }
        
        newFiles.push({
          id: fileId,
          file,
          preview,
          type: fileType
        })
      }
      
      setUploadedFiles(prev => [...prev, ...newFiles])
    }
    
    // Reset the input
    event.target.value = ''
  }

  const getFileType = (file: File): 'image' | 'document' | 'video' | 'audio' => {
    const mimeType = file.type.toLowerCase()
    if (mimeType.startsWith('image/')) return 'image'
    if (mimeType.startsWith('video/')) return 'video'
    if (mimeType.startsWith('audio/')) return 'audio'
    return 'document'
  }

  const removeFile = (fileId: string) => {
    setUploadedFiles(
      uploadedFiles.filter(f => {
        if (f.id === fileId && f.preview) {
          URL.revokeObjectURL(f.preview)
        }
        return f.id !== fileId
      })
    )
  }

  const getFileIcon = (fileType: string, fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    switch (fileType) {
      case 'image': return <FileImage className="h-3 w-3" />
      case 'video': return <FileVideo className="h-3 w-3" />
      case 'audio': return <FileAudio className="h-3 w-3" />
      case 'document':
        if (extension === 'pdf') return <FileText className="h-3 w-3 text-red-500" />
        if (['csv', 'xlsx', 'xls'].includes(extension || '')) return <FileText className="h-3 w-3 text-green-500" />
        if (['doc', 'docx'].includes(extension || '')) return <FileText className="h-3 w-3 text-blue-500" />
        return <File className="h-3 w-3" />
      default: return <File className="h-3 w-3" />
    }
  }

  const handleFileUpload = () => {
    fileInputRef.current?.click()
  }

  const currentModel = availableModels.find(m => m.id === selectedModel)

  return (
    <div className="sticky bottom-0 flex-shrink-0 p-6 bg-background/95 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-ring/50 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="px-4 pt-3 pb-2 border-b border-border/30">
                  <div className="flex gap-2 overflow-x-auto pb-1 pt-2 px-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                    {uploadedFiles.map((uploadedFile) => (
                      <div
                        key={uploadedFile.id}
                        className="relative flex-shrink-0 w-12 h-12 bg-muted rounded-md border border-border/50 hover:border-border transition-colors group"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute -top-1 -right-1 h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onClick={() => removeFile(uploadedFile.id)}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                        <div className="w-full h-full flex flex-col items-center justify-center p-1">
                          {uploadedFile.type === 'image' && uploadedFile.preview ? (
                            <img
                              src={uploadedFile.preview}
                              alt={uploadedFile.file.name}
                              className="w-full h-full object-cover rounded-sm"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center">
                              <div className="text-muted-foreground">
                                {getFileIcon(uploadedFile.type, uploadedFile.file.name)}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-0.5 rounded-b-md opacity-0 group-hover:opacity-100 transition-opacity truncate text-center">
                          {uploadedFile.file.name.length > 12 
                            ? `${uploadedFile.file.name.substring(0, 12)}...` 
                            : uploadedFile.file.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Textarea Area */}
              <div className="px-4 py-2 pb-2 max-h-32">
                <Textarea
                  ref={textareaRef}
                  value={currentMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={placeholder}
                  disabled={isGenerating}
                  rows={2}
                  className="border-0 bg-transparent resize-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base placeholder:text-muted-foreground/70 px-0 py-0 min-h-[48px] max-h-28 shadow-none overflow-y-auto w-full !bg-transparent focus:bg-transparent hover:bg-transparent"
                />
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    onClick={handleFileUpload}
                  >
                    <Paperclip className="h-3 w-3" />
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.pdf,.mp4,.mp3,.wav,.avi,.mov,.csv,.doc,.docx,.png,.jpg,.jpeg,.gif,.webp,.svg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                      >
                        <span>{currentModel?.name}</span>
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      <div className="p-2 border-b">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          AI Model
                        </div>
                      </div>
                      {availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className="flex items-start gap-3 p-3 cursor-pointer"
                        >
                          <div className="flex items-center justify-center w-4 h-4 mt-0.5">
                            {selectedModel === model.id && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm">{model.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                              {model.description}
                            </div>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {currentMessage.trim() ? (
                    <Button
                      onClick={handleSendMessage}
                      disabled={isGenerating}
                      size="sm"
                      className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                    >
                      {isGenerating ? (
                        <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> <span className="text-xs">Sending...</span></>
                      ) : (
                        <><Send className="mr-1 h-3 w-3" /> <span className="text-xs">Send</span></>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleVoiceInput}
                      variant={isRecording ? "destructive" : "ghost"}
                      size="sm"
                      className={`h-7 px-3 rounded-lg transition-colors relative ${
                        isRecording 
                          ? "bg-red-500 hover:bg-red-600 text-white" 
                          : isProcessing
                          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> <span className="text-xs">Processing...</span></>
                      ) : (
                        <><Mic className={`mr-1 h-3 w-3 ${isRecording ? 'animate-pulse' : ''}`} /> <span className="text-xs">{isRecording ? 'Recording...' : 'Voice'}</span></>
                      )}
                      {recordingMetrics && (
                        <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 bg-background/95 backdrop-blur-sm border text-xs px-2 py-1 rounded whitespace-nowrap">
                          {recordingMetrics.duration?.toFixed(1)}s | Max: {recordingMetrics.max_amplitude} | Avg: {recordingMetrics.mean_amplitude}
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 