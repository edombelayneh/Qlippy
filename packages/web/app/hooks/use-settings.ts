"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import {
  Palette,
  Mic,
  Volume2,
  Brain,
  Settings2,
  Ear,
  FileText,
  Trash2,
} from "lucide-react"
import { settingsApi } from "@/lib/api"
import { toast } from "sonner"
import { AppError } from "@/lib/errors"

// Settings components
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { AudioDevicesSettings } from "@/components/settings/audio-devices-settings"
import { TextToSpeechSettings } from "@/components/settings/text-to-speech-settings"
import { ManageModelsSettings } from "@/components/settings/manage-models-settings"
import { ModelBehaviorSettings } from "@/components/settings/model-behavior-settings"
import { VoiceDetectionSettings } from "@/components/settings/voice-detection-settings"
import { RulesSettings } from "@/components/settings/rules-settings"
import { ClearMemorySettings } from "@/components/settings/clear-memory-settings"

export interface SettingsCategory {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
}

const settingsCategories: SettingsCategory[] = [
  {
    id: "appearance",
    title: "Appearance",
    icon: Palette,
  },
  {
    id: "audio-devices",
    title: "Audio Devices",
    icon: Mic,
  },
  {
    id: "text-to-speech",
    title: "Text-to-Speech",
    icon: Volume2,
  },
  {
    id: "manage-models",
    title: "Manage Models",
    icon: Brain,
  },
  {
    id: "model-behavior",
    title: "Model Behavior",
    icon: Settings2,
  },
  {
    id: "voice-detection",
    title: "Voice Detection",
    icon: Ear,
  },
  {
    id: "rules",
    title: "Rules",
    icon: FileText,
  },
  {
    id: "clear-memory",
    title: "Clear Memory",
    icon: Trash2,
  },
]

export function useSettings() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get("category")

  // Try to load from localStorage first
  const getInitialCategory = () => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('qlippy-active-settings-category')
      if (stored && settingsCategories.some((cat) => cat.id === stored)) {
        return stored
      }
    }
    if (
      categoryParam &&
      settingsCategories.some((cat) => cat.id === categoryParam)
    ) {
      return categoryParam
    }
    return "appearance"
  }

  const [activeCategory, setActiveCategory] = React.useState(getInitialCategory)

  // Persist to localStorage on change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('qlippy-active-settings-category', activeCategory)
    }
  }, [activeCategory])

  React.useEffect(() => {
    if (
      categoryParam &&
      settingsCategories.some((cat) => cat.id === categoryParam)
    ) {
      setActiveCategory(categoryParam)
    }
  }, [categoryParam])

  const ActiveSettingsComponent = React.useMemo(() => {
    switch (activeCategory) {
      case "appearance":
        return AppearanceSettings
      case "audio-devices":
        return AudioDevicesSettings
      case "text-to-speech":
        return TextToSpeechSettings
      case "manage-models":
        return ManageModelsSettings
      case "model-behavior":
        return ModelBehaviorSettings
      case "voice-detection":
        return VoiceDetectionSettings
      case "rules":
        return RulesSettings
      case "clear-memory":
        return ClearMemorySettings
      default:
        return AppearanceSettings
    }
  }, [activeCategory])

  return {
    settingsCategories,
    activeCategory,
    setActiveCategory,
    ActiveSettingsComponent,
  }
}

// Theme settings hook
export function useThemeSettings() {
  const [theme, setThemeState] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchTheme = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await settingsApi.getTheme()
      setThemeState(data.theme)
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.userMessage : "Failed to fetch theme settings"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setTheme = React.useCallback(async (newTheme: string) => {
    try {
      setError(null)
      const data = await settingsApi.setTheme(newTheme)
      setThemeState(data.theme)
      toast.success("Theme updated successfully")
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.userMessage : "Failed to update theme"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [])

  React.useEffect(() => {
    fetchTheme()
  }, [fetchTheme])

  return {
    theme,
    setTheme,
    isLoading,
    error,
    refetch: fetchTheme,
  }
}

// TTS settings hook
export function useTTSSettings() {
  const [settings, setSettingsState] = React.useState({
    selectedVoice: "",
    playbackSpeed: 1.0,
    testText: ""
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSettings = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await settingsApi.getTTS()
      setSettingsState(data)
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.userMessage : "Failed to fetch TTS settings"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = React.useCallback(async (newSettings: typeof settings) => {
    try {
      setError(null)
      const data = await settingsApi.setTTS(newSettings)
      setSettingsState(data)
      toast.success("Text-to-speech settings updated successfully")
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.userMessage : "Failed to update TTS settings"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [])

  React.useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    updateSettings,
    isLoading,
    error,
    refetch: fetchSettings,
  }
}

// Model behavior settings hook
export function useModelBehavior() {
  const [settings, setSettingsState] = React.useState({
    temperature: 0,
    top_p: 0,
    top_k: 0,
    max_tokens: 0,
    stop_sequences: [] as string[],
    system_prompt: ""
  })
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const fetchSettings = React.useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await settingsApi.getModelBehavior()
      setSettingsState(data)
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.userMessage : "Failed to fetch model behavior settings"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const updateSettings = React.useCallback(async (newSettings: typeof settings) => {
    try {
      setError(null)
      const data = await settingsApi.setModelBehavior(newSettings)
      setSettingsState(data)
      toast.success("Model behavior settings updated successfully")
    } catch (err) {
      const errorMessage = err instanceof AppError ? err.userMessage : "Failed to update model behavior settings"
      setError(errorMessage)
      toast.error(errorMessage)
    }
  }, [])

  React.useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  return {
    settings,
    updateSettings,
    isLoading,
    error,
    refetch: fetchSettings,
  }
} 