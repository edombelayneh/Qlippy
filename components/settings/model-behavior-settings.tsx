"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { X, Plus, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"

interface ModelBehaviorSettings {
  temperature: number
  top_p: number
  top_k: number
  max_tokens: number
  stop_sequences: string[]
  system_prompt: string
}

const DEFAULT_SETTINGS: ModelBehaviorSettings = {
  temperature: 0.7,
  top_p: 0.9,
  top_k: 40,
  max_tokens: 1024,
  stop_sequences: [],
  system_prompt: ""
}

export function ModelBehaviorSettings() {
  const [settings, setSettings] = React.useState<ModelBehaviorSettings>(DEFAULT_SETTINGS)
  const [newStopSequence, setNewStopSequence] = React.useState("")
  const [hasChanges, setHasChanges] = React.useState(false)

  // Track changes
  React.useEffect(() => {
    const changed = JSON.stringify(settings) !== JSON.stringify(DEFAULT_SETTINGS)
    setHasChanges(changed)
  }, [settings])

  const handleTemperatureChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, temperature: value[0] }))
  }

  const handleTopPChange = (value: number[]) => {
    setSettings(prev => ({ ...prev, top_p: value[0] }))
  }

  const handleTopKChange = (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setSettings(prev => ({ ...prev, top_k: num }))
    }
  }

  const handleMaxTokensChange = (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 1 && num <= 8192) {
      setSettings(prev => ({ ...prev, max_tokens: num }))
    }
  }

  const handleAddStopSequence = () => {
    if (newStopSequence.trim() && !settings.stop_sequences.includes(newStopSequence.trim())) {
      setSettings(prev => ({
        ...prev,
        stop_sequences: [...prev.stop_sequences, newStopSequence.trim()]
      }))
      setNewStopSequence("")
    }
  }

  const handleRemoveStopSequence = (sequence: string) => {
    setSettings(prev => ({
      ...prev,
      stop_sequences: prev.stop_sequences.filter(s => s !== sequence)
    }))
  }

  const handleSystemPromptChange = (value: string) => {
    setSettings(prev => ({ ...prev, system_prompt: value }))
  }

  const handleResetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
    setNewStopSequence("")
    toast.success("Settings reset to defaults")
  }

  const handleSaveSettings = () => {
    // Here you would save the settings to your backend/storage
    console.log('Saving settings:', settings)
    toast.success("Model behavior settings saved")
    setHasChanges(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddStopSequence()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold mb-2">Model Behavior</h2>
          <p className="text-muted-foreground">
            Fine-tune model parameters.
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
          <CardTitle>Generation Parameters</CardTitle>
          <CardDescription>
            Control how the AI generates responses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Temperature */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature">Temperature</Label>
              <Badge variant="secondary">{settings.temperature.toFixed(2)}</Badge>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.01}
              value={[settings.temperature]}
              onValueChange={handleTemperatureChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Controls creativity/randomness. Lower values make output more focused and deterministic.
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="top_p">Top P (Nucleus Sampling)</Label>
              <Badge variant="secondary">{settings.top_p.toFixed(2)}</Badge>
            </div>
            <Slider
              id="top_p"
              min={0}
              max={1}
              step={0.01}
              value={[settings.top_p]}
              onValueChange={handleTopPChange}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Probability mass to sample from. Lower values make output more focused.
            </p>
          </div>

          {/* Top K */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="top_k">Top K</Label>
              <Badge variant="secondary">{settings.top_k === 0 ? "Disabled" : settings.top_k}</Badge>
            </div>
            <Input
              id="top_k"
              type="number"
              min="0"
              max="100"
              value={settings.top_k}
              onChange={(e) => handleTopKChange(e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Sample from top-k tokens only. Set to 0 to disable. Range: 0-100.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Badge variant="secondary">{settings.max_tokens.toLocaleString()}</Badge>
            </div>
            <Input
              id="max_tokens"
              type="number"
              min="1"
              max="8192"
              value={settings.max_tokens}
              onChange={(e) => handleMaxTokensChange(e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Maximum tokens to generate. Range: 1-8192 (depends on model context).
            </p>
          </div>

          {/* Stop Sequences */}
          <div className="space-y-3">
            <Label>Stop Sequences</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Enter stop sequence (e.g., '\n', '###')"
                value={newStopSequence}
                onChange={(e) => setNewStopSequence(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button
                onClick={handleAddStopSequence}
                disabled={!newStopSequence.trim()}
                size="sm"
                className="flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>Add</span>
              </Button>
            </div>
            {settings.stop_sequences.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {settings.stop_sequences.map((sequence, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center space-x-1"
                  >
                    <span>"{sequence}"</span>
                    <button
                      onClick={() => handleRemoveStopSequence(sequence)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Stop generation when these strings are encountered. Useful for structured output.
            </p>
          </div>

          {/* System Prompt */}
          <div className="space-y-3">
            <Label htmlFor="system_prompt">System Prompt</Label>
            <Textarea
              id="system_prompt"
              placeholder="Enter a custom system prompt to steer model behavior..."
              value={settings.system_prompt}
              onChange={(e) => handleSystemPromptChange(e.target.value)}
              rows={4}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Custom system prompt to steer behavior. Leave empty to use default model behavior.
            </p>
          </div>
        </CardContent>
      </Card>

    </div>
  )
} 