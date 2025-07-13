"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Upload, Mic, Star, MicOff } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"

interface WakeWord {
  id: string
  name: string
  isDefault: boolean
  fileName: string
}

interface VoiceDetectionSettings {
  enabled: boolean
  wake_word: string | null
  file_path: string | null
}

const WAKE_WORDS_API = "/api/settings/voice-detection/wake-words"
const VOICE_DETECTION_API = "/api/settings/voice-detection"

export function VoiceDetectionSettings() {
  const [wakeWords, setWakeWords] = React.useState<WakeWord[]>([])
  const [voiceDetectionEnabled, setVoiceDetectionEnabled] = React.useState(true)
  const [loading, setLoading] = React.useState(true)
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)
  const [wakeWordToDelete, setWakeWordToDelete] = React.useState<WakeWord | null>(null)
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [newWakeWord, setNewWakeWord] = React.useState({
    name: "",
    accessKey: "",
    file: null as File | null
  })

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Load wake words and voice detection settings from backend
  useEffect(() => {
    async function fetchSettings() {
      setLoading(true)
      try {
        // Fetch wake words
        const wakeWordsRes = await fetch(WAKE_WORDS_API)
        const wakeWordsData = await wakeWordsRes.json()
        if (Array.isArray(wakeWordsData.wake_words)) {
          setWakeWords(wakeWordsData.wake_words)
        } else {
          setWakeWords([])
        }

        // Fetch voice detection settings
        const voiceDetectionRes = await fetch(VOICE_DETECTION_API)
        const voiceDetectionData = await voiceDetectionRes.json()
        setVoiceDetectionEnabled(voiceDetectionData.enabled || false)
      } catch (e) {
        console.error("Failed to fetch settings:", e)
        // fallback to defaults if error
        setWakeWords([
          { id: "1", name: "Hey Qlippy", isDefault: true, fileName: "Hey-Qlippy.ppn" }
        ])
        setVoiceDetectionEnabled(true)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  // Save wake words to backend
  const saveWakeWords = async (words: WakeWord[]) => {
    setWakeWords(words)
    try {
      await fetch(WAKE_WORDS_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wake_words: words })
      })
    } catch (e) {
      toast.error("Failed to save wake words")
    }
  }

  // Save voice detection enabled state
  const saveVoiceDetectionEnabled = async (enabled: boolean) => {
    setVoiceDetectionEnabled(enabled)
    try {
      await fetch(VOICE_DETECTION_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled })
      })
      toast.success(enabled ? "Wake word detection enabled" : "Wake word detection disabled")
    } catch (e) {
      toast.error("Failed to update voice detection settings")
      // Revert the state on error
      setVoiceDetectionEnabled(!enabled)
    }
  }

  const handleSetDefault = (wakeWordId: string) => {
    const updated = wakeWords.map(ww => ({ ...ww, isDefault: ww.id === wakeWordId }))
    saveWakeWords(updated)
    const wakeWord = updated.find(ww => ww.id === wakeWordId)
    if (wakeWord) {
      toast.success(`${wakeWord.name} is now the default wake word`)
    }
  }

  const handleDeleteWakeWord = (wakeWord: WakeWord) => {
    if (wakeWord.isDefault) {
      toast.error("Cannot delete the default wake word")
      return
    }
    setWakeWordToDelete(wakeWord)
    setShowDeleteDialog(true)
  }

  const confirmDeleteWakeWord = () => {
    if (wakeWordToDelete) {
      const updated = wakeWords.filter(ww => ww.id !== wakeWordToDelete.id)
      saveWakeWords(updated)
      toast.success(`${wakeWordToDelete.name} has been removed`)
      setWakeWordToDelete(null)
    }
    setShowDeleteDialog(false)
  }

  const handleFileSelect = (file: File) => {
    if (file.name.toLowerCase().endsWith('.ppn')) {
      setNewWakeWord(prev => ({ ...prev, file }))
      // Extract wake word name from filename (remove .ppn extension)
      const name = file.name.replace('.ppn', '').replace(/[-_]/g, ' ')
      setNewWakeWord(prev => ({ ...prev, name }))
    } else {
      toast.error("Please select a .ppn file")
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const ppnFile = files.find(file => file.name.toLowerCase().endsWith('.ppn'))
    
    if (ppnFile) {
      handleFileSelect(ppnFile)
    } else {
      toast.error("Please drop a .ppn file")
    }
  }

  const handleAddWakeWord = () => {
    if (!newWakeWord.name.trim()) {
      toast.error("Please enter a wake word name")
      return
    }
    if (!newWakeWord.accessKey.trim()) {
      toast.error("Please enter your Picovoice access key")
      return
    }
    if (!newWakeWord.file) {
      toast.error("Please select a .ppn file")
      return
    }
    const wakeWord: WakeWord = {
      id: Date.now().toString(),
      name: newWakeWord.name.trim(),
      isDefault: false,
      fileName: newWakeWord.file.name
    }
    const updated = [...wakeWords, wakeWord]
    saveWakeWords(updated)
    toast.success(`${wakeWord.name} has been added`)
    
    // Reset form
    setNewWakeWord({ name: "", accessKey: "", file: null })
    if (fileInputRef.current) fileInputRef.current.value = ""
    setShowAddDialog(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Voice Detection</h2>
          <p className="text-muted-foreground">
            Configure wake word detection and voice command settings.
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center space-x-2">
              <Plus className="h-4 w-4" />
              <span>Add Wake Word</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Wake Word</DialogTitle>
              <DialogDescription>
                Upload a .ppn file and configure your custom wake word.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {/* Wake Word Name */}
              <div className="space-y-2">
                <Label htmlFor="wake-word-name">Wake Word Name *</Label>
                <Input
                  id="wake-word-name"
                  placeholder="e.g., Hey Assistant"
                  value={newWakeWord.name}
                  onChange={(e) => setNewWakeWord(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Picovoice Access Key */}
              <div className="space-y-2">
                <Label htmlFor="access-key">Picovoice Access Key *</Label>
                <Input
                  id="access-key"
                  type="password"
                  placeholder="Enter your Picovoice access key"
                  value={newWakeWord.accessKey}
                  onChange={(e) => setNewWakeWord(prev => ({ ...prev, accessKey: e.target.value }))}
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label>Wake Word File (.ppn) *</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                    isDragOver
                      ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                      : "border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="flex flex-col items-center space-y-2">
                    <Upload className="h-6 w-6 text-muted-foreground" />
                    <div className="text-sm font-medium">
                      {newWakeWord.file ? newWakeWord.file.name : "Drag and drop .ppn file here"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      or click to browse
                    </div>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ppn"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddWakeWord}>
                  Add Wake Word
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Mic className="h-5 w-5 text-primary" />
            Wake Words ({wakeWords.length})
          </CardTitle>
          <CardDescription>
            Manage your custom wake words and set which ones are active.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">Loading wake words...</div>
                <div className="text-sm">Please wait while we fetch the wake words.</div>
              </div>
            ) : wakeWords.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Mic className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <div className="text-lg font-medium mb-2">No wake words found</div>
                <div className="text-sm">Add your first wake word to get started</div>
              </div>
            ) : (
              wakeWords.map((wakeWord) => (
                <div
                  key={wakeWord.id}
                  className="group flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10">
                      <Mic className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div className="font-medium">{wakeWord.name}</div>
                        {wakeWord.isDefault && (
                          <Badge variant="secondary" className="flex items-center space-x-1">
                            <Star className="h-3 w-3" />
                            <span>Default</span>
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {wakeWord.fileName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={voiceDetectionEnabled && wakeWord.isDefault}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          handleSetDefault(wakeWord.id)
                          if (!voiceDetectionEnabled) {
                            saveVoiceDetectionEnabled(true)
                          }
                        }
                      }}
                    />
                    {!wakeWord.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleSetDefault(wakeWord.id)}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    {!wakeWord.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive hover:bg-destructive/10 transition-colors"
                        onClick={() => handleDeleteWakeWord(wakeWord)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteWakeWord}
        title="Delete Wake Word"
        description={`Are you sure you want to delete "${wakeWordToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
} 