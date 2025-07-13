"use client"

import * as React from "react"
import { Loader2, Send, Mic, ChevronDown, Check, Paperclip, FileText, FileImage, FileVideo, FileAudio, X, File, Settings, Square } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { AIModel, UploadedFile } from "@/lib/types"
import { useRouter } from "next/navigation"

interface ChatInputProps {
  currentMessage: string
  setCurrentMessage: (message: string) => void
  isGenerating: boolean
  isRecording: boolean
  isProcessing: boolean
  isWaiting?: boolean
  recordingMetrics: { max_amplitude?: number; mean_amplitude?: number; duration?: number; } | null
  selectedModel: string
  setSelectedModel: (model: string) => void
  availableModels: AIModel[]
  handleSendMessage: () => void
  handleVoiceInput: () => void
  handleKeyPress: (e: React.KeyboardEvent) => void
  placeholder?: string
  handleStopGeneration: () => void
}

export function ChatInput({
  currentMessage,
  setCurrentMessage,
  isGenerating,
  isRecording,
  isProcessing,
  isWaiting = false,
  recordingMetrics,
  selectedModel,
  setSelectedModel,
  availableModels,
  handleSendMessage,
  handleVoiceInput,
  handleKeyPress,
  placeholder = "Ask Qlippy anything...",
  handleStopGeneration,
}: ChatInputProps) {
  const [uploadedFiles, setUploadedFiles] = React.useState<UploadedFile[]>([])
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const router = useRouter()

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

  const currentModel = availableModels?.find(m => m.id === selectedModel)

  return (
    <div className="sticky bottom-0 flex-shrink-0 p-6 bg-background/95 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto">
        <div className="relative">
          <Card className="border-border/50 hover:shadow-md transition-all duration-200 focus-within:shadow-lg focus-within:border-ring/50 rounded-2xl overflow-hidden">
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
                  value={currentMessage || ""}
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
                        {currentModel ? (
                          <div className="flex items-center gap-1">
                            <span>{currentModel.name}</span>
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>Select Model</span>
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                      {availableModels?.length > 0 ? availableModels.map((model) => (
                        <DropdownMenuItem
                          key={model.id}
                          onClick={() => setSelectedModel(model.id)}
                          className="flex items-center gap-3 p-3 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            {selectedModel === model.id && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                            <div className="flex flex-col">
                              <span className="font-medium">{model.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {model.description}
                              </span>
                            </div>
                          </div>
                        </DropdownMenuItem>
                      )) : (
                        <DropdownMenuItem disabled className="p-3 text-center text-muted-foreground">
                          Loading models...
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => router.push('/settings?category=manage-models')}
                        className="flex items-center gap-3 p-3 cursor-pointer text-primary hover:bg-primary/10"
                      >
                        <Settings className="h-3 w-3" />
                        <span>Manage Models</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  {/* Show different buttons based on generation state */}
                  {isGenerating ? (
                    // Show stop button during generation
                    <Button
                      onClick={handleStopGeneration}
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 hover:border-destructive/30 transition-colors"
                    >
                      <Square className="h-4 w-4 mr-1" />
                      <span className="text-xs">Stop</span>
                    </Button>
                  ) : currentMessage?.trim() ? (
                    // Show send button when there's text
                    <Button
                      onClick={handleSendMessage}
                      disabled={isGenerating}
                      size="sm"
                      className="h-7 px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Send className="mr-1 h-3 w-3" />
                      <span className="text-xs">Send</span>
                    </Button>
                  ) : (
                    // Show voice button when no text and not generating
                    <Button
                      onClick={handleVoiceInput}
                      variant={isRecording ? "destructive" : "ghost"}
                      size="sm"
                      className={`h-7 px-3 rounded-lg transition-colors relative ${
                        isRecording 
                          ? "bg-red-500 hover:bg-red-600 text-white" 
                          : isProcessing || isWaiting
                          ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`}
                      disabled={isProcessing || isWaiting}
                    >
                      {isWaiting ? (
                        <><Loader2 className="mr-1 h-3 w-3 animate-spin" /> <span className="text-xs">Connecting...</span></>
                      ) : isProcessing ? (
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