"use client"

import * as React from "react"
import { useCustomTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Moon, Sun, Palette, Sparkles, Heart, Star } from "lucide-react"

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
  const { theme, setTheme } = useCustomTheme()
  
  // State to track current theme
  const [currentTheme, setCurrentTheme] = React.useState(() => {
    const customTheme = localStorage.getItem('custom-theme')
    return customTheme || theme || 'light'
  })
  
  // Update current theme when theme changes
  React.useEffect(() => {
    const customTheme = localStorage.getItem('custom-theme')
    setCurrentTheme(customTheme || theme || 'light')
  }, [theme])

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
                  ? "ring-2 ring-primary ring-offset-2" 
                  : "hover:shadow-md"
              }`}
              onClick={() => {
                console.log('Setting theme to:', themeOption.value)
                setTheme(themeOption.value)
                setCurrentTheme(themeOption.value)
                
                // Debug: Check if the class was applied
                setTimeout(() => {
                  const html = document.documentElement
                  console.log('HTML classes:', html.className)
                  console.log('Current theme:', themeOption.value)
                }, 100)
              }}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-lg ${themeOption.preview} flex items-center justify-center`}>
                    <Icon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{themeOption.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {themeOption.description}
                    </div>
                  </div>
                  {isActive && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full" />
                      <span className="text-xs text-primary font-medium">Active</span>
                    </div>
                  )}
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
          onClick={() => setTheme("system")}
        >
          Use System
        </Button>
      </div>
    </div>
  )
} 