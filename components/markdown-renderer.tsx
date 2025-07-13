"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import "katex/dist/katex.min.css"
import { Copy, Check } from "lucide-react"

interface CodeBlockProps {
  className?: string
  children?: React.ReactNode
}

interface MarkdownRendererProps {
  content: string
}

const CodeBlock = ({ className, children }: CodeBlockProps) => {
  const [isCopied, setIsCopied] = React.useState(false)
  const match = /language-(\w+)/.exec(className || '')

  const handleCopy = () => {
    const codeToCopy = String(children).replace(/\n$/, "")
    navigator.clipboard.writeText(codeToCopy)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return match ? (
    <div className="relative group">
      <span className="absolute top-3 left-4 text-xs font-sans text-muted-foreground">{match[1]}</span>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-4 p-1 rounded-md text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground transition-all"
      >
        {isCopied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={match[1]}
        PreTag="div"
        className="!rounded-md !my-0 !pt-12"
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    </div>
  ) : (
    <pre><code>{children}</code></pre>
  )
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          pre: ({ children }) => {
            if (React.isValidElement(children) && children.type === 'code') {
              const { className, children: codeChildren } = children.props as any
              return <CodeBlock className={className}>{codeChildren}</CodeBlock>
            }
            return <pre>{children}</pre>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
} 