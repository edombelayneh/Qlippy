"""
LangGraph Tool-Calling Service
Handles LLM prompts with structured tool calling using LangGraph
Integrates with existing Qlippy infrastructure
"""

import json
import subprocess
import os
import asyncio
from typing import Dict, List, Any, Optional, TypedDict, Annotated
from pathlib import Path
import sqlite3

from langchain.tools import tool
from langchain.tools import tool as tool_decorator
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage
from langchain_core.tools import StructuredTool
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode

from services.tools_service import tools_service
from services.llm_service import llm_service

# =============================================================================
# GRAPH STATE DEFINITION
# =============================================================================

class GraphState(TypedDict):
    """State for the LangGraph conversation flow"""
    messages: Annotated[List[BaseMessage], add_messages]
    input: str
    response: str
    chat_history: List[Dict[str, str]]
    tools_called: List[str]

# =============================================================================
# TOOL DEFINITIONS
# =============================================================================

@tool
def open_file(path: str) -> str:
    """
    Open a file or folder using the default system application.
    
    Args:
        path: The file or folder path to open
        
    Returns:
        Success message or error description
    """
    try:
        file_path = Path(path).expanduser().resolve()
        
        if not file_path.exists():
            return f"Error: Path '{path}' does not exist"
        
        # Use macOS 'open' command or cross-platform alternatives
        if os.name == 'posix':  # macOS/Linux
            if os.uname().sysname == 'Darwin':  # macOS
                subprocess.run(['open', str(file_path)], check=True)
            else:  # Linux
                subprocess.run(['xdg-open', str(file_path)], check=True)
        elif os.name == 'nt':  # Windows
            os.startfile(str(file_path))
        else:
            return "Error: Unsupported operating system"
            
        return f"Successfully opened: {file_path}"
        
    except subprocess.CalledProcessError as e:
        return f"Error opening file: {e}"
    except Exception as e:
        return f"Error: {str(e)}"

@tool
def delete_file(path: str) -> str:
    """
    Delete a file (with safety checks).
    
    Args:
        path: The file path to delete
        
    Returns:
        Success message or error description
    """
    try:
        file_path = Path(path).expanduser().resolve()
        
        if not file_path.exists():
            return f"Error: File '{path}' does not exist"
        
        if file_path.is_dir():
            return f"Error: '{path}' is a directory. Use a file manager for directory deletion."
        
        # Safety check - don't delete system files
        system_paths = ['/System', '/usr', '/bin', '/sbin', '/etc']
        if any(str(file_path).startswith(sys_path) for sys_path in system_paths):
            return f"Error: Cannot delete system file: {path}"
        
        file_path.unlink()
        return f"Successfully deleted: {file_path}"
        
    except PermissionError:
        return f"Error: Permission denied to delete '{path}'"
    except Exception as e:
        return f"Error deleting file: {str(e)}"

@tool
def open_app(app_name: str) -> str:
    """
    Open an application by name.
    
    Args:
        app_name: The name of the application to open
        
    Returns:
        Success message or error description
    """
    try:
        if os.name == 'posix' and os.uname().sysname == 'Darwin':  # macOS
            subprocess.run(['open', '-a', app_name], check=True)
        elif os.name == 'posix':  # Linux
            subprocess.run([app_name.lower()], check=True)
        elif os.name == 'nt':  # Windows
            subprocess.run(['start', app_name], shell=True, check=True)
        else:
            return "Error: Unsupported operating system"
            
        return f"Successfully opened application: {app_name}"
        
    except subprocess.CalledProcessError:
        return f"Error: Could not find or open application '{app_name}'"
    except Exception as e:
        return f"Error opening application: {str(e)}"

@tool
def close_app(app_name: str) -> str:
    """
    Close an application by name (macOS/Linux).
    
    Args:
        app_name: The name of the application to close
        
    Returns:
        Success message or error description
    """
    try:
        if os.name == 'posix' and os.uname().sysname == 'Darwin':  # macOS
            # Use osascript to quit the application
            script = f'tell application "{app_name}" to quit'
            subprocess.run(['osascript', '-e', script], check=True)
        elif os.name == 'posix':  # Linux
            # Use pkill to close the application
            subprocess.run(['pkill', '-f', app_name.lower()], check=True)
        elif os.name == 'nt':  # Windows
            subprocess.run(['taskkill', '/f', '/im', f'{app_name}.exe'], check=True)
        else:
            return "Error: Unsupported operating system"
            
        return f"Successfully closed application: {app_name}"
        
    except subprocess.CalledProcessError:
        return f"Error: Could not close application '{app_name}' (may not be running)"
    except Exception as e:
        return f"Error closing application: {str(e)}"

# =============================================================================
# LANGGRAPH SERVICE
# =============================================================================

class LangGraphService:
    """LangGraph-based tool-calling service for Qlippy"""
    
    def __init__(self):
        self.tools = [open_file, delete_file, open_app, close_app]
        self._load_dynamic_tools()
        self.tool_node = ToolNode(self.tools)
        self.graph = self._create_graph()
        # SQLite connection for tool execution log
        self.conn = sqlite3.connect("qlippy.db", check_same_thread=False)
        self._ensure_tool_log_table()

    def _load_dynamic_tools(self):
        """Load enabled tools from the database and inject them as callable tools."""
        try:
            db_tools = tools_service.get_tools()
            for tool in db_tools:
                if not tool.get('is_enabled') or not tool.get('script') or not tool.get('name'):
                    continue
                tool_name = tool['name']
                tool_desc = tool.get('description', f"User-defined tool: {tool_name}")
                script = tool['script']
                # Create a function from script_content
                try:
                    # Prepare a namespace for exec
                    local_ns = {}
                    exec(script, {}, local_ns)
                    # Find the first callable in the namespace
                    func = None
                    for v in local_ns.values():
                        if callable(v):
                            func = v
                            break
                    if func is None:
                        continue
                    # Wrap with @tool for LangChain
                    wrapped = tool_decorator(tool_name, tool_desc)(func)
                    self.tools.append(wrapped)
                except Exception as e:
                    print(f"Failed to load tool '{tool_name}': {e}")
        except Exception as e:
            print(f"Error loading dynamic tools: {e}")

    def _ensure_tool_log_table(self):
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS tool_execution_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tool_name TEXT,
                arguments TEXT,
                result TEXT,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        self.conn.commit()
    
    def _get_model_config(self) -> Dict[str, Any]:
        """Get model configuration from settings service"""
        try:
            config = settings_service.get_model_behavior()
            return {
                'temperature': config.get('temperature', 0.7),
                'top_p': config.get('top_p', 0.9),
                'top_k': config.get('top_k', 40),
                'max_tokens': config.get('max_tokens', 1024),
                'stop_sequences': config.get('stop_sequences', []),
                'system_prompt': config.get('system_prompt', ''),
            }
        except Exception as e:
            print(f"Error getting model config: {e}")
            return {
                'temperature': 0.7,
                'top_p': 0.9,
                'top_k': 40,
                'max_tokens': 512,
                'stop_sequences': [],
                'system_prompt': '',
            }
    
    def _format_tools_for_prompt(self) -> str:
        """Format tools as JSON schema for the LLM prompt"""
        tools_schema = []
        for tool in self.tools:
            schema = {
                "name": tool.name,
                "description": tool.description,
                "parameters": {
                    "type": "object",
                    "properties": {},
                    "required": []
                }
            }
            
            # Extract parameters from tool signature
            if hasattr(tool, 'args_schema') and tool.args_schema:
                for field_name, field_info in tool.args_schema.model_fields.items():
                    schema["parameters"]["properties"][field_name] = {
                        "type": "string",
                        "description": field_info.description or f"The {field_name} parameter"
                    }
                    schema["parameters"]["required"].append(field_name)
            
            tools_schema.append(schema)
        
        return json.dumps(tools_schema, indent=2)
    
    async def _llm_inference(self, state: GraphState) -> GraphState:
        """LLM inference node with tool-calling support and integrated RAG context"""
        try:
            config = self._get_model_config()
            messages = state["messages"]
            conversation_id = None
            # Try to extract conversation_id from chat_history if present
            if state.get("chat_history"):
                for entry in state["chat_history"]:
                    if "conversation_id" in entry:
                        conversation_id = entry["conversation_id"]
                        break
            # Build the prompt
            system_prompt = config['system_prompt'] or "You are a helpful assistant that can perform file operations and open applications."
            # Fetch RAG context if possible
            rag_context = ""
            if conversation_id:
                try:
                    from services.rag_retriever_service import rag_retriever_service
                    contexts = rag_retriever_service.get_conversation_contexts(conversation_id)
                    if contexts:
                        rag_context, _ = await rag_retriever_service.retrieve_and_format_context(
                            query=state["input"],
                            conversation_id=conversation_id,
                            max_context_length=3000
                        )
                except Exception as e:
                    print(f"RAG context retrieval failed: {e}")
            # Tool schemas
            tool_schemas = self._format_tools_for_prompt()
            # Conversation history
            conversation = []
            for msg in messages:
                if isinstance(msg, HumanMessage):
                    conversation.append(f"Human: {msg.content}")
                elif isinstance(msg, AIMessage):
                    conversation.append(f"Assistant: {msg.content}")
                elif isinstance(msg, ToolMessage):
                    conversation.append(f"Tool Result: {msg.content}")
            # Few-shot examples for tool calling
            few_shot_examples = """
[Examples of Tool Usage]

Example 1 - Opening Applications:
User: "Can you open Slack for me?"
Assistant: I'll open Slack for you.
{"tool_call": {"name": "open_app", "arguments": {"app_name": "Slack"}}}

Example 2 - Launching Media Apps:
User: "Launch Spotify please"
Assistant: I'll launch Spotify for you.
{"tool_call": {"name": "open_app", "arguments": {"app_name": "Spotify"}}}

Example 3 - Opening Development Tools:
User: "Open VS Code"
Assistant: I'll open Visual Studio Code for you.
{"tool_call": {"name": "open_app", "arguments": {"app_name": "Visual Studio Code"}}}

Example 4 - Opening File Browser:
User: "Open Finder"
Assistant: I'll open Finder for you.
{"tool_call": {"name": "open_app", "arguments": {"app_name": "Finder"}}}
"""

            # Compose prompt
            prompt_parts = [
                system_prompt,
                "\n[File/Document Context (RAG)]\nRelevant file/document content and metadata retrieved for this query:\n---",
                rag_context or "(No relevant context found)",
                "---\n[Available Tools]\nYou have access to the following tools (with schemas):\n",
                tool_schemas,
                "\nTo use a tool, respond with JSON in this exact format:\n{\"tool_call\": {\"name\": \"tool_name\", \"arguments\": {\"param\": \"value\"}}}\nIf you don't need to use a tool, respond normally with text.\n",
                few_shot_examples,
                "\n[Conversation History]",
                "\n".join(conversation),
                f"\n[User Input]\nUser: {state['input']}"
            ]
            full_prompt = "\n\n".join(prompt_parts)
            print(full_prompt)
            # Generate response using existing LLM service
            response_parts = []
            async for chunk in llm_service.generate_stream(full_prompt, conversation_id=conversation_id):
                try:
                    chunk_data = json.loads(chunk)
                    if "token" in chunk_data:
                        response_parts.append(chunk_data["token"])
                    elif "error" in chunk_data:
                        raise Exception(chunk_data["error"])
                except json.JSONDecodeError:
                    continue
            response_text = "".join(response_parts).strip()
            # Check if response contains a tool call
            if self._is_tool_call(response_text):
                tool_call = self._parse_tool_call(response_text)
                if tool_call:
                    ai_msg = AIMessage(
                        content="I'll help you with that.",
                        tool_calls=[{
                            "id": f"call_{len(state['messages'])}",
                            "name": tool_call["name"],
                            "args": tool_call["arguments"]
                        }]
                    )
                    return {
                        **state,
                        "messages": state["messages"] + [ai_msg],
                        "response": response_text
                    }
            ai_msg = AIMessage(content=response_text)
            return {
                **state,
                "messages": state["messages"] + [ai_msg],
                "response": response_text
            }
        except Exception as e:
            error_msg = AIMessage(content=f"I encountered an error: {str(e)}")
            return {
                **state,
                "messages": state["messages"] + [error_msg],
                "response": f"Error: {str(e)}"
            }
    
    def _is_tool_call(self, text: str) -> bool:
        """Check if the response contains a tool call"""
        try:
            return "tool_call" in text and "{" in text and "}" in text
        except:
            return False
    
    def _parse_tool_call(self, text: str) -> Optional[Dict[str, Any]]:
        """Parse tool call from LLM response"""
        try:
            # Try to extract JSON from the response
            start_idx = text.find('{"tool_call"')
            if start_idx == -1:
                return None
            
            # Find the matching closing brace
            brace_count = 0
            end_idx = start_idx
            for i, char in enumerate(text[start_idx:]):
                if char == '{':
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0:
                        end_idx = start_idx + i + 1
                        break
            
            json_str = text[start_idx:end_idx]
            tool_data = json.loads(json_str)
            
            if "tool_call" in tool_data:
                return tool_data["tool_call"]
            return None
            
        except Exception as e:
            print(f"Error parsing tool call: {e}")
            return None
    
    async def _tool_executor(self, state: GraphState) -> GraphState:
        """Execute tools and return results, persisting to SQLite log"""
        try:
            messages = state["messages"]
            last_message = messages[-1]
            if isinstance(last_message, AIMessage) and hasattr(last_message, 'tool_calls') and last_message.tool_calls:
                tool_call = last_message.tool_calls[0]
                tool_name = tool_call["name"]
                tool_args = tool_call["args"]
                # Find and execute the tool
                tool_func = None
                for tool in self.tools:
                    if tool.name == tool_name:
                        tool_func = tool
                        break
                if tool_func:
                    try:
                        result = tool_func.invoke(tool_args)
                        # Log tool execution to SQLite
                        self.conn.execute(
                            "INSERT INTO tool_execution_log (tool_name, arguments, result) VALUES (?, ?, ?)",
                            (tool_name, json.dumps(tool_args), str(result))
                        )
                        self.conn.commit()
                        tool_msg = ToolMessage(
                            content=result,
                            tool_call_id=tool_call["id"]
                        )
                        tools_called = state.get("tools_called", [])
                        tools_called.append(tool_name)
                        return {
                            **state,
                            "messages": messages + [tool_msg],
                            "tools_called": tools_called,
                            "response": result
                        }
                    except Exception as e:
                        error_msg = ToolMessage(
                            content=f"Tool execution error: {str(e)}",
                            tool_call_id=tool_call["id"]
                        )
                        return {
                            **state,
                            "messages": messages + [error_msg],
                            "response": f"Tool error: {str(e)}"
                        }
                else:
                    error_msg = ToolMessage(
                        content=f"Unknown tool: {tool_name}",
                        tool_call_id=tool_call["id"]
                    )
                    return {
                        **state,
                        "messages": messages + [error_msg],
                        "response": f"Unknown tool: {tool_name}"
                    }
            return state
        except Exception as e:
            print(f"Error in tool executor: {e}")
            return {
                **state,
                "response": f"Tool execution error: {str(e)}"
            }
    
    def _should_use_tools(self, state: GraphState) -> str:
        """Determine if we should use tools or end the conversation"""
        messages = state["messages"]
        if not messages:
            return "end"
        
        last_message = messages[-1]
        if isinstance(last_message, AIMessage) and hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        
        return "end"
    
    def _create_graph(self) -> StateGraph:
        """Create the LangGraph state machine"""
        workflow = StateGraph(GraphState)
        
        # Add nodes
        workflow.add_node("llm_inference", self._llm_inference)
        workflow.add_node("tools", self._tool_executor)
        
        # Define the flow
        workflow.set_entry_point("llm_inference")
        workflow.add_conditional_edges(
            "llm_inference",
            self._should_use_tools,
            {
                "tools": "tools",
                "end": END,
            }
        )
        workflow.add_edge("tools", END)
        
        return workflow.compile()
    
    async def run_tool_graph(self, input_text: str, chat_history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        """
        Main entry point for running the tool-calling graph
        
        Args:
            input_text: User input text
            chat_history: Previous conversation history
            
        Returns:
            Dictionary with response and metadata
        """
        try:
            # Convert chat history to messages
            messages = []
            if chat_history:
                for entry in chat_history:
                    if entry["role"] == "user":
                        messages.append(HumanMessage(content=entry["content"]))
                    elif entry["role"] == "assistant":
                        messages.append(AIMessage(content=entry["content"]))
            
            # Add current user message
            messages.append(HumanMessage(content=input_text))
            
            # Initial state
            initial_state = GraphState(
                messages=messages,
                input=input_text,
                response="",
                chat_history=chat_history or [],
                tools_called=[]
            )
            
            # Run the graph
            final_state = await self.graph.ainvoke(initial_state)
            
            # Extract the final response
            final_response = ""
            if final_state["messages"]:
                last_message = final_state["messages"][-1]
                if isinstance(last_message, (AIMessage, ToolMessage)):
                    final_response = last_message.content
            
            return {
                "response": final_response,
                "tools_called": final_state.get("tools_called", []),
                "messages": [
                    {
                        "role": "user" if isinstance(msg, HumanMessage) else "assistant",
                        "content": msg.content
                    }
                    for msg in final_state["messages"]
                    if isinstance(msg, (HumanMessage, AIMessage))
                ],
                "success": True
            }
            
        except Exception as e:
            print(f"Error in tool graph execution: {e}")
            return {
                "response": f"I encountered an error: {str(e)}",
                "tools_called": [],
                "messages": [],
                "success": False,
                "error": str(e)
            }

# Create service instance
langgraph_service = LangGraphService() 