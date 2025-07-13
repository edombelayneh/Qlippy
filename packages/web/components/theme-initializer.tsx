"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { useThemeSettings } from "@/app/hooks/use-settings"

export function ThemeInitializer() {
  const { theme } = useTheme()
  const { theme: dbTheme, isLoading } = useThemeSettings()

  React.useEffect(() => {
    // Don't apply theme until database theme is loaded
    if (isLoading) return
    
    const html = document.documentElement
    
    // Remove all custom theme classes
    html.classList.remove('pastels', 'cute', 'magic', 'starry')
    
    // Use database theme first, fallback to next-themes
    const currentTheme = dbTheme || theme
    
    // Apply the custom theme class if it's a custom theme
    if (currentTheme && ['pastels', 'cute', 'magic', 'starry'].includes(currentTheme)) {
      html.classList.add(currentTheme)
    }
  }, [theme, dbTheme, isLoading])

  return null
} 