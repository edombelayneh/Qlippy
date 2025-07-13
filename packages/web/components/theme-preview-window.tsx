"use client"

import * as React from "react"

export function ThemePreviewWindow({ theme }: { theme: string }) {
  // Define theme-specific classes
  const themeStyles: Record<
    string,
    { bar: string; sidebar: string; content: string }
  > = {
    light: {
      bar: "bg-gray-100",
      sidebar: "bg-gray-200",
      content: "bg-white",
    },
    dark: {
      bar: "bg-gray-800",
      sidebar: "bg-gray-900",
      content: "bg-gray-800",
    },
    pastels: {
      bar: "bg-pink-100",
      sidebar: "bg-purple-100",
      content: "bg-pink-50",
    },
    cute: {
      bar: "bg-rose-100",
      sidebar: "bg-pink-100",
      content: "bg-rose-50",
    },
    magic: {
      bar: "bg-indigo-100",
      sidebar: "bg-purple-100",
      content: "bg-indigo-50",
    },
    starry: {
      bar: "bg-blue-900",
      sidebar: "bg-purple-900",
      content: "bg-blue-950",
    },
  }

  if (theme === "auto" || theme === "system") {
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
    )
  }

  const style = themeStyles[theme] || themeStyles.light
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
  )
} 