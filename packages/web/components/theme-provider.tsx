"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useThemeSettings } from "@/app/hooks/use-settings"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Custom hook to handle theme changes
export function useCustomTheme() {
  const { theme: nextTheme, setTheme } = useTheme()
  const { theme: dbTheme, setTheme: setDbTheme, isLoading } = useThemeSettings()
  
  const setCustomTheme = React.useCallback((newTheme: string) => {
    const html = document.documentElement
    
    // Remove all custom theme classes
    html.classList.remove('pastels', 'cute', 'magic', 'starry')
    
    // Apply the new theme class if it's a custom theme
    if (['pastels', 'cute', 'magic', 'starry'].includes(newTheme)) {
      html.classList.add(newTheme)
    }
    
    // Set the theme in next-themes (only for light/dark/system)
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme)
    }
    
    // Always save to database
    setDbTheme(newTheme)
  }, [setTheme, setDbTheme])
  
  // Get the current theme from database, fallback to next-themes
  const getCurrentTheme = React.useCallback(() => {
    if (isLoading) return 'system' // Default while loading
    return dbTheme || nextTheme || 'system'
  }, [dbTheme, nextTheme, isLoading])
  
  // Apply theme on mount and when database theme changes
  React.useEffect(() => {
    if (!isLoading && dbTheme) {
      const html = document.documentElement
      
      // Remove all custom theme classes first
      html.classList.remove('pastels', 'cute', 'magic', 'starry')
      
      // Apply custom theme class if it's a custom theme
      if (['pastels', 'cute', 'magic', 'starry'].includes(dbTheme)) {
        html.classList.add(dbTheme)
      }
      
      // Set next-themes for system themes
      if (['light', 'dark', 'system'].includes(dbTheme)) {
        setTheme(dbTheme)
      }
    }
  }, [dbTheme, isLoading, setTheme])
  
  return { 
    theme: getCurrentTheme(), 
    setTheme: setCustomTheme,
    isLoading
  }
}