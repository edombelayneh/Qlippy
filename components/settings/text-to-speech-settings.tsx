"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Play, Square, Volume2, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"

interface Voice {
  id: string
  name: string
  language: string
  gender: "male" | "female" | "neutral"
  accent?: string
}

interface TTSSettings {
  selectedVoice: string
  playbackSpeed: number
  testText: string
}

const AVAILABLE_VOICES: Voice[] = [
  { id: "en-US-neural-aria", name: "Aria", language: "English (US)", gender: "female" },
  { id: "en-US-neural-davis", name: "Davis", language: "English (US)", gender: "male" },
  { id: "en-US-neural-jenny", name: "Jenny", language: "English (US)", gender: "female" },
  { id: "en-US-neural-guy", name: "Guy", language: "English (US)", gender: "male" },
  { id: "en-GB-neural-libby", name: "Libby", language: "English (UK)", gender: "female", accent: "British" },
  { id: "en-GB-neural-ryan", name: "Ryan", language: "English (UK)", gender: "male", accent: "British" },
  { id: "en-AU-neural-natasha", name: "Natasha", language: "English (AU)", gender: "female", accent: "Australian" },
  { id: "en-AU-neural-william", name: "William", language: "English (AU)", gender: "male", accent: "Australian" },
  { id: "fr-FR-neural-denise", name: "Denise", language: "French (FR)", gender: "female" },
  { id: "fr-FR-neural-henri", name: "Henri", language: "French (FR)", gender: "male" },
  { id: "de-DE-neural-katja", name: "Katja", language: "German (DE)", gender: "female" },
  { id: "de-DE-neural-conrad", name: "Conrad", language: "German (DE)", gender: "male" },
  { id: "es-ES-neural-elvira", name: "Elvira", language: "Spanish (ES)", gender: "female" },
  { id: "es-ES-neural-alvaro", name: "Alvaro", language: "Spanish (ES)", gender: "male" }
]

const DEFAULT_SETTINGS: TTSSettings = {
  selectedVoice: "en-US-neural-aria",
  playbackSpeed: 1.0,
  testText: "Hello! This is a test of the text-to-speech system. How does this sound to you?"
}

export function TextToSpeechSettings() {
  const [settings, setSettings] = React.useState<TTSSettings>(DEFAULT_SETTINGS)
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [hasChanges, setHasChanges] = React.useState(false)
  const [currentUtterance, setCurrentUtterance] = React.useState<SpeechSynthesisUtterance | null>(null)

  // Track changes
  React.useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)
    setHasChanges(changed)
  }, [settings])

  // Stop speech when component unmounts
  React.useEffect(() => {
    return () => {
      if (currentUtterance) {
        speechSynthesis.cancel()
      }
    }
  }, [currentUtterance])

  const handleVoiceChange = (voiceId: string) => {
    setSettings(prev => ({ ...prev, selectedVoice: voiceId }))
  }

  const handleSpeedChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, playbackSpeed: value[0] }))
  }

  const handleTestTextChange = (text: string) => {
    setSettings(prev => ({ ...prev, testText: text }))
  }

  const handleTestAudio = () => {
    if (isPlaying) {
      // Stop current playback
      speechSynthesis.cancel()
      setIsPlaying(false)
      setCurrentUtterance(null)
      return
    }

    if (!settings.testText.trim()) {
      toast.error("Please enter some text to test")
      return
    }

    // Check if speech synthesis is supported
    if (!('speechSynthesis' in window)) {
      toast.error("Text-to-speech is not supported in your browser")
      return
    }

    const utterance = new SpeechSynthesisUtterance(settings.testText)
    const selectedVoice = AVAILABLE_VOICES.find(v => v.id === settings.selectedVoice)
    
    // Try to find the voice in the browser's available voices
    const voices = speechSynthesis.getVoices()
    const browserVoice = voices.find(v => 
      v.name.toLowerCase().includes(selectedVoice?.name.toLowerCase() || '') ||
      v.lang.includes(selectedVoice?.language.split(' ')[0] || 'en')
    )

    if (browserVoice) {
      utterance.voice = browserVoice
    }

    utterance.rate = settings.playbackSpeed
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
    setSettings(DEFAULT_SETTINGS)
    toast.success("Settings reset to defaults")
  }

  const handleSaveSettings = () => {
    // Here you would save the settings to your backend/storage
    console.log('Saving TTS settings:', settings)
    toast.success("Text-to-speech settings saved")
    setHasChanges(false)
  }

  const getSelectedVoice = () => {
    return AVAILABLE_VOICES.find(v => v.id === settings.selectedVoice)
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
            <Select value={settings.selectedVoice} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_VOICES.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{voice.name}</span>
                        <Badge variant="secondary" className={`text-xs ${getGenderColor(voice.gender)}`}>
                          {voice.gender}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground ml-2">
                        {voice.language}{voice.accent && ` (${voice.accent})`}
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
                  {getSelectedVoice()?.accent && ` (${getSelectedVoice()?.accent})`}
                </span>
              </div>
            )}
          </div>

          {/* Playback Speed */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="playback-speed">Playback Speed</Label>
              <Badge variant="secondary">{settings.playbackSpeed.toFixed(1)}x</Badge>
            </div>
            <Slider
              id="playback-speed"
              min={0.5}
              max={2.0}
              step={0.1}
              value={[settings.playbackSpeed]}
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
              value={settings.testText}
              onChange={(e) => handleTestTextChange(e.target.value)}
              rows={3}
              className="w-full"
            />
          </div>

          {/* Test Audio Button */}
          <div className="flex items-center space-x-4">
            <Button
              onClick={handleTestAudio}
              disabled={!settings.testText.trim()}
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

      {/* Current Settings Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Configuration</CardTitle>
          <CardDescription>
            Summary of your text-to-speech settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-sm font-medium">Selected Voice</div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-semibold">{getSelectedVoice()?.name}</span>
                <Badge variant="secondary" className={`text-xs ${getGenderColor(getSelectedVoice()?.gender || 'neutral')}`}>
                  {getSelectedVoice()?.gender}
                </Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                {getSelectedVoice()?.language}{getSelectedVoice()?.accent && ` (${getSelectedVoice()?.accent})`}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Playback Speed</div>
              <div className="text-lg font-semibold">{settings.playbackSpeed.toFixed(1)}x</div>
              <div className="text-sm text-muted-foreground">
                {settings.playbackSpeed < 1 ? "Slower than normal" : 
                 settings.playbackSpeed > 1 ? "Faster than normal" : "Normal speed"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 