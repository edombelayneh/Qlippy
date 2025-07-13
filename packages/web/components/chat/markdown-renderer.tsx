"use client"

import * as React from "react"
import { Copy, Check } from "lucide-react"

interface CodeBlockProps {
  className?: string
  children?: React.ReactNode
  language?: string
}

interface MarkdownRendererProps {
  content: string
}

const CodeBlock = ({ className, children, language }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = React.useState(false)
  const displayLanguage = language || (className ? className.replace('language-', '') : '')

  const handleCopy = () => {
    const codeToCopy = String(children).replace(/\n$/, "")
    navigator.clipboard.writeText(codeToCopy)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <div className="relative group my-4">
      {displayLanguage && (
        <span className="absolute top-3 left-4 text-xs font-mono text-muted-foreground bg-background/80 px-2 py-1 rounded">
          {displayLanguage}
        </span>
      )}
      <button
        onClick={handleCopy}
        className="absolute top-3 right-4 p-1 rounded-md text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-all z-10"
      >
        {isCopied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      <pre className="bg-gray-900 dark:bg-gray-800 text-gray-100 dark:text-gray-200 p-4 rounded-md overflow-x-auto pt-12 relative font-mono text-sm">
        <code className={className}>{String(children)}</code>
      </pre>
    </div>
  )
}

// Enhanced markdown renderer with better code block detection
const renderEnhancedMarkdown = (content: string) => {
  // First, let's handle code blocks more carefully
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0
  
  while (i < lines.length) {
    const line = lines[i]
    
    // Check for code blocks starting with ```
    if (line.trim().startsWith('```')) {
      const language = line.trim().slice(3).trim()
      const codeLines: string[] = []
      i++ // Move to next line
      
      // Collect all lines until we find the closing ```
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      
      // Add the code block
      elements.push(
        <CodeBlock 
          key={elements.length} 
          language={language}
          className={language ? `language-${language}` : ''}
        >
          {codeLines.join('\n')}
        </CodeBlock>
      )
      
      // Skip the closing ```
      i++
      continue
    }
    
    // Check for indented code blocks (4 spaces or tab)
    if (line.match(/^( {4}|\t)/)) {
      const codeLines: string[] = []
      
      // Collect all consecutive indented lines
      while (i < lines.length && (lines[i].match(/^( {4}|\t)/) || lines[i].trim() === '')) {
        codeLines.push(lines[i].replace(/^( {4}|\t)/, ''))
        i++
      }
      
      // Remove trailing empty lines
      while (codeLines.length > 0 && codeLines[codeLines.length - 1].trim() === '') {
        codeLines.pop()
      }
      
      if (codeLines.length > 0) {
        elements.push(
          <CodeBlock key={elements.length}>
            {codeLines.join('\n')}
          </CodeBlock>
        )
      }
      continue
    }
    
    // Regular text processing
    const processedLine = processInlineFormatting(line)
    
    if (line.trim() === '') {
      elements.push(<br key={elements.length} />)
    } else {
      elements.push(
        <div key={elements.length} className="mb-2">
          {processedLine}
        </div>
      )
    }
    
    i++
  }
  
  return elements
}

const processInlineFormatting = (text: string): React.ReactNode => {
  // Handle inline code, bold, italic
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  
  return parts.map((part, index) => {
    // Inline code
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono">
          {part.slice(1, -1)}
        </code>
      )
    }
    
    // Bold text
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    
    // Italic text
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>
    }
    
    // Regular text
    return part
  })
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <div className="text-sm leading-relaxed">
        {renderEnhancedMarkdown(content)}
      </div>
    </div>
  )
} 