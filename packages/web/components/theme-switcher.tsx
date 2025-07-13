"use client"

import * as React from "react"
import { useCustomTheme } from "@/components/theme-provider"
import { useThemeSettings } from "@/app/hooks/use-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Moon, Sun, Palette, Sparkles, Heart, Star } from "lucide-react"
import { ThemePreviewWindow } from "./theme-preview-window"

const themes = [
  {
    name: "Light",
    value: "light",
    icon: Sun,
    description: "Clean and bright",
    preview: "bg-white border-gray-200"
  },
  {
    name: "Dark",
    value: "dark",
    icon: Moon,
    description: "Easy on the eyes",
    preview: "bg-gray-900 border-gray-700"
  },
  {
    name: "Pastels",
    value: "pastels",
    icon: Palette,
    description: "Soft and gentle",
    preview: "bg-gradient-to-br from-pink-100 to-purple-100 border-pink-200"
  },
  {
    name: "Cute",
    value: "cute",
    icon: Heart,
    description: "Adorable and sweet",
    preview: "bg-gradient-to-br from-rose-100 to-pink-100 border-rose-200"
  },
  {
    name: "Magic",
    value: "magic",
    icon: Sparkles,
    description: "Mystical and enchanting",
    preview: "bg-gradient-to-br from-indigo-100 to-purple-100 border-indigo-200"
  },
  {
    name: "Starry",
    value: "starry",
    icon: Star,
    description: "Night sky vibes",
    preview: "bg-gradient-to-br from-blue-900 to-purple-900 border-blue-800"
  }
]

export function ThemeSwitcher() {
  const { setTheme: setCustomTheme } = useCustomTheme()
  const { theme: currentTheme, setTheme, isLoading, error } = useThemeSettings()

  const handleThemeChange = async (newTheme: string) => {
    // Update the API first
    await setTheme(newTheme)
    
    // Then update the local theme provider for immediate UI changes
    setCustomTheme(newTheme)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {themes.map((themeOption) => (
            <Card key={themeOption.value} className="cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Skeleton className="w-16 h-10 rounded-md" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="flex items-center justify-between pt-4 border-t">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon
          const isActive = currentTheme === themeOption.value
          
          return (
            <Card
              key={themeOption.value}
              className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                isActive 
                  ? "ring-2 ring-primary" 
                  : "hover:shadow-md"
              }`}
              onClick={() => handleThemeChange(themeOption.value)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  {/* Replace colored box with preview window */}
                  <ThemePreviewWindow theme={themeOption.value} />
                  <div className="flex-1">
                    <div className="font-medium">{themeOption.name}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="text-sm text-muted-foreground">
          Current theme: <span className="font-medium capitalize">{currentTheme}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleThemeChange("system")}
        >
          Use System
        </Button>
      </div>
    </div>
  )
} 