"use client"

import * as React from "react"
import Editor from "@monaco-editor/react"

interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string
}

export function CodeEditor({
  value,
  onChange,
  language = "python",
}: CodeEditorProps) {
  const [isDarkMode, setIsDarkMode] = React.useState(false)

  React.useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains("dark")
      setIsDarkMode(isDark)
    }

    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <Editor
      height="100%"
      language={language}
      theme={isDarkMode ? "vs-dark" : "light"}
      value={value}
      onChange={(value) => onChange(value || "")}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 4,
        insertSpaces: true,
        folding: true,
        autoIndent: "full",
        formatOnPaste: true,
        formatOnType: true,
        renderWhitespace: "boundary",
        rulers: [88], // PEP 8 line length
      }}
    />
  )
} 