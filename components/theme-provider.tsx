"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Custom hook to handle theme changes
export function useCustomTheme() {
  const { theme, setTheme } = useTheme()
  
  const setCustomTheme = React.useCallback((newTheme: string) => {
    const html = document.documentElement
    
    // Remove all custom theme classes
    html.classList.remove('pastels', 'cute', 'magic', 'starry')
    
    // Apply the new theme class if it's a custom theme
    if (['pastels', 'cute', 'magic', 'starry'].includes(newTheme)) {
      html.classList.add(newTheme)
      // Store the custom theme in localStorage
      localStorage.setItem('custom-theme', newTheme)
    } else {
      // Clear custom theme from localStorage for system themes
      localStorage.removeItem('custom-theme')
    }
    
    // Set the theme in next-themes (only for light/dark/system)
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme)
    }
  }, [setTheme])
  
  // Get the current theme, checking both next-themes and custom themes
  const getCurrentTheme = React.useCallback(() => {
    const customTheme = localStorage.getItem('custom-theme')
    if (customTheme) {
      return customTheme
    }
    return theme
  }, [theme])
  
  return { 
    theme: getCurrentTheme(), 
    setTheme: setCustomTheme 
  }
}