"use client"

import * as React from "react"
import { useCustomTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Moon, Sun, Palette, Sparkles, Heart, Star } from "lucide-react"

function ThemePreviewWindow({ theme }: { theme: string }) {
  // Define theme-specific classes
  const themeStyles: Record<string, {bar: string, sidebar: string, content: string}> = {
    light: {
      bar: 'bg-gray-100',
      sidebar: 'bg-gray-200',
      content: 'bg-white',
    },
    dark: {
      bar: 'bg-gray-800',
      sidebar: 'bg-gray-900',
      content: 'bg-gray-800',
    },
    pastels: {
      bar: 'bg-pink-100',
      sidebar: 'bg-purple-100',
      content: 'bg-pink-50',
    },
    cute: {
      bar: 'bg-rose-100',
      sidebar: 'bg-pink-100',
      content: 'bg-rose-50',
    },
    magic: {
      bar: 'bg-indigo-100',
      sidebar: 'bg-purple-100',
      content: 'bg-indigo-50',
    },
    starry: {
      bar: 'bg-blue-900',
      sidebar: 'bg-purple-900',
      content: 'bg-blue-950',
    },
  };

  if (theme === 'auto' || theme === 'system') {
    // Split preview: left half light, right half dark
    return (
      <div className="w-16 h-10 rounded-md border flex overflow-hidden shadow-sm">
        {/* Left: Light */}
        <div className="w-1/2 h-full flex flex-col">
          <div className="h-2.5 w-full bg-gray-100 flex items-center px-1">
            <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full mr-0.5" />
            <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-0.5" />
            <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full" />
          </div>
          <div className="flex flex-1">
            <div className="w-2.5 bg-gray-200" />
            <div className="flex-1 bg-white" />
          </div>
        </div>
        {/* Right: Dark */}
        <div className="w-1/2 h-full flex flex-col">
          <div className="h-2.5 w-full bg-gray-800 flex items-center px-1">
            <span className="inline-block w-1.5 h-1.5 bg-red-700 rounded-full mr-0.5" />
            <span className="inline-block w-1.5 h-1.5 bg-yellow-600 rounded-full mr-0.5" />
            <span className="inline-block w-1.5 h-1.5 bg-green-700 rounded-full" />
          </div>
          <div className="flex flex-1">
            <div className="w-2.5 bg-gray-900" />
            <div className="flex-1 bg-gray-800" />
          </div>
        </div>
      </div>
    );
  }

  const style = themeStyles[theme] || themeStyles.light;
  return (
    <div className="w-16 h-10 rounded-md border overflow-hidden shadow-sm flex flex-col">
      {/* Window bar */}
      <div className={`h-2.5 w-full flex items-center px-1 ${style.bar}`}>
        <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full mr-0.5" />
        <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-0.5" />
        <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full" />
      </div>
      {/* Sidebar + content */}
      <div className="flex flex-1">
        <div className={`w-2.5 ${style.sidebar}`} />
        <div className={`flex-1 ${style.content}`} />
      </div>
    </div>
  );
}

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
                  ? "ring-2 ring-primary" 
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
          onClick={() => setTheme("system")}
        >
          Use System
        </Button>
      </div>
    </div>
  )
} 