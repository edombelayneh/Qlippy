"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { settingsApi } from "@/lib/api"

const EXAMPLE_TOOL_TEMPLATE = `from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field

class CalculatorInput(BaseModel):
    """Input for calculator tool."""
    expression: str = Field(description="Mathematical expression to evaluate")

class CalculatorTool(BaseTool):
    """
    A simple calculator tool that can perform basic arithmetic operations.
    This tool evaluates mathematical expressions like '2 + 3 * 4'.
    """
    name = "calculator"
    description = "Useful for performing mathematical calculations and evaluating expressions"
    args_schema: Type[BaseModel] = CalculatorInput
    
    def _run(self, expression: str) -> str:
        """Execute the calculator tool."""
        try:
            # Only allow safe mathematical operations
            allowed_chars = set('0123456789+-*/.() ')
            if not all(c in allowed_chars for c in expression):
                return "Error: Only basic mathematical operations are allowed"
            
            # Evaluate the expression
            result = eval(expression)
            return f"Result: {result}"
            
        except Exception as e:
            return f"Error: {str(e)}"
    
    async def _arun(self, expression: str) -> str:
        """Async version of the tool."""
        return self._run(expression)

# Example usage:
# tool = CalculatorTool()
# result = tool.run("2 + 3 * 4")
# print(result)  # Result: 14`

export function useNewTool() {
  const router = useRouter()
  const [toolName, setToolName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [scriptContent, setScriptContent] = React.useState("")
  const [uploadedContent, setUploadedContent] = React.useState("")
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null)
  const [activeTab, setActiveTab] = React.useState("script")
  const [nameError, setNameError] = React.useState("")

  const validateToolName = (name: string) => {
    const snakeCaseRegex = /^[a-z][a-z0-9_]*[a-z0-9]$|^[a-z]$/
    if (!name) {
      setNameError("Tool name is required")
      return false
    }
    if (!snakeCaseRegex.test(name)) {
      setNameError(
        "Tool name must be lowercase snake_case (e.g., my_tool, data_processor)",
      )
      return false
    }
    setNameError("")
    return true
  }

  const handleToolNameChange = (value: string) => {
    setToolName(value)
    if (value) {
      validateToolName(value)
    } else {
      setNameError("")
    }
  }

  const handleFileSelect = (file: File) => {
    if (file.name.endsWith(".py")) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedContent((e.target?.result as string) || "")
        setActiveTab("upload")
      }
      reader.readAsText(file)
    } else {
      toast.error("Please select a Python (.py) file")
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadedContent("")
    setActiveTab("script")
  }

  const loadExampleTemplate = () => {
    setScriptContent(EXAMPLE_TOOL_TEMPLATE)
    setActiveTab("script")
    setToolName("calculator")
    setDescription("A simple calculator tool that can perform basic arithmetic operations")
    toast.success("Example template loaded! You can modify it to create your own tool.")
  }

  const handleSaveTool = async () => {
    if (!validateToolName(toolName)) {
      return
    }

    if (!description.trim()) {
      toast.error("Please provide a description for your tool")
      return
    }

    const currentContent =
      activeTab === "script" ? scriptContent : uploadedContent
    if (!currentContent.trim()) {
      toast.error("Please provide Python script content")
      return
    }

    try {
      // First validate the tool
      const validation = await settingsApi.validateTool(
        toolName,
        description.trim(),
        currentContent.trim(),
        selectedFile?.name
      )

      if (!validation.valid) {
        toast.error(`Tool validation failed: ${validation.errors.join(", ")}`)
        return
      }

      // Show warnings if any
      if (validation.warnings.length > 0) {
        validation.warnings.forEach(warning => {
          toast.warning(warning)
        })
      }

      // Save the tool
      await settingsApi.createTool(
        toolName,
        description.trim(),
        currentContent.trim(),
        selectedFile?.name
      )

      toast.success("Tool saved successfully!")
      router.push("/tools")
    } catch (error) {
      console.error("Error saving tool:", error)
      toast.error("Failed to save tool. Please try again.")
    }
  }

  return {
    toolName,
    description,
    scriptContent,
    uploadedContent,
    selectedFile,
    activeTab,
    nameError,
    setToolName: handleToolNameChange,
    setDescription,
    setScriptContent,
    setUploadedContent,
    handleFileSelect,
    removeFile,
    setActiveTab,
    handleSaveTool,
    loadExampleTemplate,
  }
} 