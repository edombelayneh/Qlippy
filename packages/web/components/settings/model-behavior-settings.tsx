"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { X, Plus, RotateCcw, Save } from "lucide-react"
import { toast } from "sonner"
import { useModelBehavior } from "@/app/hooks/use-settings"

// Note: Default values are now seeded in the database, not hardcoded here

export function ModelBehaviorSettings() {
  const { settings, updateSettings, isLoading, error } = useModelBehavior()
  const [localSettings, setLocalSettings] = React.useState(settings)
  const [newStopSequence, setNewStopSequence] = React.useState("")
  const [hasChanges, setHasChanges] = React.useState(false)

  // Update local settings when API settings change
  React.useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  // Track changes
  React.useEffect(() => {
    const changed = JSON.stringify(localSettings) !== JSON.stringify(settings)
    setHasChanges(changed)
  }, [localSettings, settings])

  const handleTemperatureChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, temperature: value[0] }))
  }

  const handleTopPChange = (value: number[]) => {
    setLocalSettings(prev => ({ ...prev, top_p: value[0] }))
  }

  const handleTopKChange = (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 0 && num <= 100) {
      setLocalSettings(prev => ({ ...prev, top_k: num }))
    }
  }

  const handleMaxTokensChange = (value: string) => {
    const num = parseInt(value)
    if (!isNaN(num) && num >= 1 && num <= 8192) {
      setLocalSettings(prev => ({ ...prev, max_tokens: num }))
    }
  }

  const handleAddStopSequence = () => {
    if (newStopSequence.trim() && !localSettings.stop_sequences.includes(newStopSequence.trim())) {
      setLocalSettings(prev => ({
        ...prev,
        stop_sequences: [...prev.stop_sequences, newStopSequence.trim()]
      }))
      setNewStopSequence("")
    }
  }

  const handleRemoveStopSequence = (sequence: string) => {
    setLocalSettings(prev => ({
      ...prev,
      stop_sequences: prev.stop_sequences.filter(s => s !== sequence)
    }))
  }

  const handleSystemPromptChange = (value: string) => {
    setLocalSettings(prev => ({ ...prev, system_prompt: value }))
  }

  const handleResetToDefaults = () => {
    // Reset to the original values fetched from database
    setLocalSettings(settings)
    setNewStopSequence("")
    toast.success("Settings reset to saved values")
  }

  const handleSaveSettings = async () => {
    await updateSettings(localSettings)
    setHasChanges(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddStopSequence()
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
            <div className="space-y-8">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-32 w-full" />
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
              <Badge variant="secondary">{localSettings.temperature.toFixed(2)}</Badge>
            </div>
            <Slider
              id="temperature"
              min={0}
              max={2}
              step={0.01}
              value={[localSettings.temperature]}
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
              <Badge variant="secondary">{localSettings.top_p.toFixed(2)}</Badge>
            </div>
            <Slider
              id="top_p"
              min={0}
              max={1}
              step={0.01}
              value={[localSettings.top_p]}
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
              <Badge variant="secondary">{localSettings.top_k === 0 ? "Disabled" : localSettings.top_k}</Badge>
            </div>
            <Input
              id="top_k"
              type="number"
              min="0"
              max="100"
              value={localSettings.top_k}
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
              <Badge variant="secondary">{localSettings.max_tokens.toLocaleString()}</Badge>
            </div>
            <Input
              id="max_tokens"
              type="number"
              min="1"
              max="8192"
              value={localSettings.max_tokens}
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
            {localSettings.stop_sequences.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {localSettings.stop_sequences.map((sequence, index) => (
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
              value={localSettings.system_prompt}
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