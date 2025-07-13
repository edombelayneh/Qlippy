"""
Ollama-based inference engine.
"""

import ollama
import logging
import sys
import os
import json
from enum import IntEnum
from pathlib import Path
from typing import Optional, Dict, List

sys.path.append(str(Path(__file__).parent.parent))
# from utils import apply_repetition_penalty, top_k_probas # May not need these

# Define a type for a message in the conversation history
Message = Dict[str, str]

class VerbosityLevel(IntEnum):
    NONE = 0
    BASIC = 1
    DETAILED = 2

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(asctime)s - %(message)s',
    datefmt='%H:%M:%S'
)

class OllamaModelInference():
    def __init__(self, model_name: str, verbose: VerbosityLevel = VerbosityLevel.NONE):
        self.model_name = model_name
        self.verbose = verbose
        # Check if ollama is running
        try:
            ollama.ps()
            logger.info("Ollama is running.")
        except Exception as e:
            logger.error("Ollama is not running. Please start Ollama and try again.")
            raise e

    def _get_tool_prompt(self, home_directory: Optional[str] = None):
        user_context_prompt = ""
        if home_directory:
            # In Windows, paths from os.path.expanduser use backslashes.
            # We need to escape them for the prompt string.
            escaped_home_dir = home_directory.replace('\\', '\\\\')
            user_context_prompt = f"You know the user's home directory is '{escaped_home_dir}'. Use this information when a user asks for files in their home, documents, desktop, etc."

        return f"""You are a helpful AI assistant that only speaks English with access to the user's local file system.
{user_context_prompt}

You can use the following tools and have complete access to the user's local file system:

**listFiles**
- Description: Lists files and directories at a given path. This tool is for browsing a single directory, NOT for searching for files. To find a file, use the `searchFiles` tool.
- Parameters:
  - `path` (string, optional): The absolute path of the directory to list. If not provided, it defaults to the user's home directory.
- Example: `listFiles(path=<path to the directory using double backslashes instead of single backslashes>)`

**openFile**
- Description: Opens a file using the system's default application. Will be called when the user asks to open a file. If a file name and location are provided, append the file name to the path to the location.
- Parameters:
  - `path` (string, required): The absolute path of the file to open.
- Example: `openFile(path=<path to file using double backslashes instead of single backslashes>)`

**openApplication**
- Description: Searches for and opens an application. This will search the entire C: drive for the application and open the first match.
- Parameters:
  - `appName` (string, required): The name of the application to open (e.g., "notepad", "chrome.exe").
- Example: `openApplication(appName="notepad")`

**searchFiles**
- Description: Searches for a file by name recursively. Will be called when the user asks to search for a file by name. Will search through the entire file system for the file. Will return a list of full paths to the files found.
- Parameters:
  - `fileName` (string, required): The name of the file to search for.
- Example: `searchFiles(fileName="fileName")`

When you need to use a tool, respond with a JSON object in the following format, and nothing else:
```json
{{
  "tool": "tool_name",
  "parameters": {{
    "param_name": "param_value"
  }}
}}
```
"""

    def run_inference(self,
                      query: str,
                      messages: Optional[List[Message]] = None,
                      top_k: Optional[int]=None,
                      temperature: Optional[float]=None,
                      persona: Optional[str]=None,
                      max_tokens: Optional[int]=None,
                      system_prompt: Optional[str]=None):
        
        # If a full message history is provided, use it. Otherwise, build it.
        if messages:
            processed_messages = messages
            # Ensure the system prompt is still the first message if provided separately
            if not any(m['role'] == 'system' for m in processed_messages):
                 home_dir = os.path.expanduser('~')
                 system_p = self._get_tool_prompt(home_directory=home_dir)
                 processed_messages.insert(0, {'role': 'system', 'content': system_p})
        else:
            # This is the first turn, build the system prompt and user query
            processed_messages = []
            home_dir = None
            try:
                home_dir = os.path.expanduser('~')
            except Exception as e:
                logger.error(f"Could not get user home directory: {e}")

            full_system_prompt = self._get_tool_prompt(home_directory=home_dir)
            if system_prompt:
                full_system_prompt = f"{system_prompt}. {full_system_prompt}"
            
            if persona:
                full_system_prompt += f" You are a helpful assistant acting as a {persona}."

            processed_messages.append({'role': 'system', 'content': full_system_prompt})
            processed_messages.append({'role': 'user', 'content': query})

        options = {}
        if temperature is not None:
            options['temperature'] = temperature
        if top_k is not None:
            options['top_k'] = top_k
        if max_tokens is not None:
            # In Ollama, this is num_predict. -1 for infinite.
            options['num_predict'] = max_tokens

        try:
            stream = ollama.chat(
                model=self.model_name,
                messages=processed_messages,
                stream=True,
                options=options
            )
            for chunk in stream:
                if 'content' in chunk['message']:
                    yield chunk['message']['content']
        
        except Exception as e:
            logger.error(f"An error occurred during Ollama inference: {e}")
            # Depending on desired behavior, you might want to yield an error message
            # or just log it as is being done.
            yield "Sorry, an error occurred while processing your request."

if __name__=="__main__":
    # Ensure you have pulled the model you want to use, e.g., `ollama pull llama3.1:8b`
    try:
        model_name = "llama3.1:8b" 
        iInfer = OllamaModelInference(model_name=model_name)

        query = "Why is the sky blue?"
        system_prompt = "Explain things like a pirate."

        print(f"Query: {query}\n")
        print(f"Response ({model_name}):")
        
        full_response = ""
        for response_chunk in iInfer.run_inference(query=query, system_prompt=system_prompt):
            print(response_chunk, end="", flush=True)
            full_response += response_chunk
        
        print("\n\n--- End of Response ---")

    except Exception as e:
        logger.error(f"Failed to run Ollama inference example: {e}") 