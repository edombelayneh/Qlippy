"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { NavActions } from "@/components/nav-actions"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Palette, 
  Mic, 
  Volume2, 
  Brain, 
  Settings2, 
  Ear, 
  FileText, 
  Trash2
} from "lucide-react"

// Settings components
import { AppearanceSettings } from "@/components/settings/appearance-settings"
import { AudioDevicesSettings } from "@/components/settings/audio-devices-settings"
import { TextToSpeechSettings } from "@/components/settings/text-to-speech-settings"
import { ManageModelsSettings } from "@/components/settings/manage-models-settings"
import { ModelBehaviorSettings } from "@/components/settings/model-behavior-settings"
import { VoiceDetectionSettings } from "@/components/settings/voice-detection-settings"
import { RulesSettings } from "@/components/settings/rules-settings"
import { ClearMemorySettings } from "@/components/settings/clear-memory-settings"
import { CurrentSettings } from "@/components/settings/current-settings"

interface SettingsCategory {
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
  }
]

export default function SettingsPage() {
  const searchParams = useSearchParams()
  const categoryParam = searchParams.get('category')
  
  // Set initial category based on URL parameter or default to appearance
  const [activeCategory, setActiveCategory] = React.useState(() => {
    if (categoryParam && settingsCategories.some(cat => cat.id === categoryParam)) {
      return categoryParam
    }
    return "appearance"
  })

  // Update active category when URL parameter changes
  React.useEffect(() => {
    if (categoryParam && settingsCategories.some(cat => cat.id === categoryParam)) {
      setActiveCategory(categoryParam)
    }
  }, [categoryParam])

  const renderSettingsContent = () => {
    switch (activeCategory) {
      case "appearance":
        return <AppearanceSettings />
      case "audio-devices":
        return <AudioDevicesSettings />
      case "text-to-speech":
        return <TextToSpeechSettings />
      case "manage-models":
        return <ManageModelsSettings />
      case "model-behavior":
        return <ModelBehaviorSettings />
      case "voice-detection":
        return <VoiceDetectionSettings />
      case "rules":
        return <RulesSettings />
      case "clear-memory":
        return <ClearMemorySettings />
      default:
        return <AppearanceSettings />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-col h-screen bg-background">
          {/* Main Content */}
          <div className="flex flex-1 overflow-hidden">
            {/* Settings Sidebar */}
            <div className="w-80 border-r bg-muted/20">
              <div className="p-4">
                <h1 className="text-xl font-semibold mb-4">Settings</h1>
                <ScrollArea className="h-[calc(100vh-8rem)]">
                  <div className="space-y-1">
                    {settingsCategories.map((category) => {
                      const Icon = category.icon
                      const isActive = activeCategory === category.id
                      
                      return (
                        <button
                          key={category.id}
                          onClick={() => setActiveCategory(category.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                            isActive 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">{category.title}</span>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </div>
            </div>

            {/* Settings Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6">
                <div className="max-w-4xl space-y-6">
                  <CurrentSettings />
                  {renderSettingsContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 