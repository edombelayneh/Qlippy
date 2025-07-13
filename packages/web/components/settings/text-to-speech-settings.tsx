"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Play, Square, Volume2, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { useTTSSettings } from "@/app/hooks/use-settings"

interface Voice {
  id: string
  name: string
  language: string
  gender: "male" | "female" | "neutral"
  isSystemVoice?: boolean
}

export function TextToSpeechSettings() {
  const { settings, updateSettings, isLoading, error } = useTTSSettings()
  const [localSettings, setLocalSettings] = React.useState(settings)
  const [availableVoices, setAvailableVoices] = React.useState<Voice[]>([])
  const [voicesLoading, setVoicesLoading] = React.useState(true)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [currentUtterance, setCurrentUtterance] = React.useState<SpeechSynthesisUtterance | null>(null)

  // Update local settings when API settings change
  React.useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // Load system voices from browser
  React.useEffect(() => {
    const loadVoices = () => {
      let voices = speechSynthesis.getVoices()
      // Filter for English voices only
      voices = voices.filter(v => v.lang && v.lang.toLowerCase().includes('en'))
      if (voices.length > 0) {
        const systemVoices: Voice[] = voices.map(voice => ({
          id: voice.voiceURI,
          name: voice.name,
          language: voice.lang,
          gender: guessGenderFromVoice(voice),
          isSystemVoice: true
        }))
        setAvailableVoices(systemVoices)
        setVoicesLoading(false)
        // If saved selectedVoice is present, use it; else select first
        if (localSettings.selectedVoice && systemVoices.some(v => v.id === localSettings.selectedVoice)) {
          setLocalSettings(prev => ({ ...prev, selectedVoice: localSettings.selectedVoice }))
        } else if (systemVoices.length > 0) {
          setLocalSettings(prev => ({ ...prev, selectedVoice: systemVoices[0].id }))
        }
      }
    }
    // Load voices immediately
    loadVoices()
    // Chrome loads voices asynchronously
    speechSynthesis.addEventListener('voiceschanged', loadVoices)
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices)
    }
  }, [localSettings.selectedVoice])

  // Helper function to guess gender from voice name
  const guessGenderFromVoice = (voice: SpeechSynthesisVoice): "male" | "female" | "neutral" => {
    const name = voice.name.toLowerCase()
    if (name.includes('female') || name.includes('woman') || 
        name.includes('samantha') || name.includes('victoria') || 
        name.includes('karen') || name.includes('moira') ||
        name.includes('tessa') || name.includes('fiona')) {
      return "female"
    } else if (name.includes('male') || name.includes('man') || 
               name.includes('daniel') || name.includes('thomas') || 
               name.includes('alex') || name.includes('fred')) {
      return "male"
    }
    return "neutral"
  }

  // Track changes
  React.useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings)
    setHasChanges(changed)
  }, [localSettings, settings])

  // Stop speech when component unmounts
  React.useEffect(() => {
    return () => {
      if (currentUtterance) {
        speechSynthesis.cancel()
      }
    }
  }, [currentUtterance])

  const handleVoiceChange = (voiceId: string) => {
    setLocalSettings(prev => ({ ...prev, selectedVoice: voiceId }))
  }

  const handleSpeedChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, playbackSpeed: value[0] }))
  }

  const handleTestTextChange = (text: string) => {
    setLocalSettings(prev => ({ ...prev, testText: text }))
  }

  const handleTestAudio = () => {
    if (isPlaying) {
      // Stop current playback
      speechSynthesis.cancel()
      setIsPlaying(false)
      setCurrentUtterance(null)
      return
    }

    if (!localSettings.testText.trim()) {
      toast.error("Please enter some text to test")
      return
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      toast.error("Text-to-speech is not supported in your browser")
      return
    }

    const utterance = new SpeechSynthesisUtterance(localSettings.testText)
    
    // Find the selected voice
    const voices = speechSynthesis.getVoices()
    const selectedVoice = voices.find(v => v.voiceURI === localSettings.selectedVoice)
    
    if (selectedVoice) {
      utterance.voice = selectedVoice
    }

    utterance.rate = localSettings.playbackSpeed
    utterance.pitch = 1.0
    utterance.volume = 1.0

    utterance.onstart = () => {
      setIsPlaying(true)
    }

    utterance.onend = () => {
      setIsPlaying(false)
      setCurrentUtterance(null)
    }

    utterance.onerror = (event) => {
      setIsPlaying(false)
      setCurrentUtterance(null)
      toast.error("Error playing audio: " + event.error)
    }

    setCurrentUtterance(utterance)
    speechSynthesis.speak(utterance)
  }

  const handleResetToDefaults = () => {
    // Reset to the original values fetched from database
    setLocalSettings(settings)
    toast.success("Settings reset to saved values")
  }

  const handleSaveSettings = async () => {
    try {
      await updateSettings(localSettings)
      setHasChanges(false)
    } catch (err) {
      console.error("Error saving TTS settings:", err)
    }
  }

  const getSelectedVoice = () => {
    return availableVoices.find((v: Voice) => v.id === localSettings.selectedVoice)
  }

  const getGenderColor = (gender: Voice["gender"]) => {
    switch (gender) {
      case "male":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "female":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900/20 dark:text-pink-400"
      case "neutral":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center space-x-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">{error}</p>
        <Button onClick={() => window.location.reload()}>
          Reload Page
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Text-to-Speech</h2>
          <p className="text-muted-foreground">
            Configure voice selection, speech rate, and test your settings.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleResetToDefaults}
            className="flex items-center space-x-2"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset to Defaults</span>
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={!hasChanges}
            className="flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Save Settings</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
          <CardDescription>
            Choose voice, speed, and test your TTS configuration.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Selection */}
          <div className="space-y-3">
            <Label>Voice Selection</Label>
            {voicesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : availableVoices.length === 0 ? (
              <p className="text-sm text-muted-foreground">No voices available. Please check your browser settings.</p>
            ) : (
              <>
                <Select value={localSettings.selectedVoice || ""} onValueChange={handleVoiceChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a voice" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{voice.name}</span>
                            <Badge variant="secondary" className={`text-xs ${getGenderColor(voice.gender)}`}>
                              {voice.gender}
                            </Badge>
                          </div>
                          <span className="text-sm text-muted-foreground ml-2">
                            {voice.language}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getSelectedVoice() && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Volume2 className="h-4 w-4" />
                    <span>
                      Selected: {getSelectedVoice()?.name} - {getSelectedVoice()?.language}
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Playback Speed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="playback-speed">Playback Speed</Label>
              <Badge variant="secondary">{localSettings.playbackSpeed.toFixed(1)}x</Badge>
            </div>
            <Slider
              id="playback-speed"
              min={0.5}
              max={2.0}
              step={0.1}
              value={[localSettings.playbackSpeed]}
              onValueChange={handleSpeedChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Slower (0.5x)</span>
              <span>Normal (1.0x)</span>
              <span>Faster (2.0x)</span>
            </div>
          </div>

          {/* Test Text */}
          <div className="space-y-3">
            <Label htmlFor="test-text">Test Text</Label>
            <Textarea
              id="test-text"
              placeholder="Enter text to test the voice and speed..."
              value={localSettings.testText}
              onChange={(e) => handleTestTextChange(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          {/* Test Audio Button */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleTestAudio}
              disabled={!localSettings.testText.trim() || voicesLoading}
              className="flex items-center space-x-2"
              variant={isPlaying ? "destructive" : "default"}
            >
              {isPlaying ? (
                <>
                  <Square className="h-4 w-4" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Test Audio</span>
                </>
              )}
            </Button>
            {isPlaying && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-pulse">
                  <Volume2 className="h-4 w-4" />
                </div>
                <span>Playing audio...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 