"use client"

import * as React from "react"
import { useTheme } from "next-themes"

export function ThemeInitializer() {
  const { theme } = useTheme()

  React.useEffect(() => {
    const html = document.documentElement
    
    // Check for custom theme in localStorage first
    const customTheme = localStorage.getItem('custom-theme')
    
    // Remove all custom theme classes
    html.classList.remove('pastels', 'cute', 'magic', 'starry')
    
    // Apply the custom theme class if it exists
    if (customTheme && ['pastels', 'cute', 'magic', 'starry'].includes(customTheme)) {
      html.classList.add(customTheme)
    } else if (theme && ['pastels', 'cute', 'magic', 'starry'].includes(theme)) {
      // Fallback to theme from next-themes
      html.classList.add(theme)
    }
  }, [theme])

  return null
} 