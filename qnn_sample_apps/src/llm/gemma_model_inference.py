"""
author: Derrick Johnson
date: 05/12/2025
todo: 
    replace print with logging
    add comments
"""

import onnxruntime as ort
import numpy as np
import logging
import time
import re
import sys
import os

from enum import IntEnum, Enum
from tokenizers import Tokenizer
from typing import List, Dict, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass
from collections import defaultdict

sys.path.append(str(Path(__file__).parent.parent))
from utils import apply_repetition_penalty, top_k_probas

# Move into a utils
class VerbosityLevel(IntEnum):
    NONE = 0
    BASIC = 1
    DETAILED = 2

class InferencePersona(Enum):
    THERAPIST = "therapist"
    CYBER_SECURITY ="cyber security specialist"
    CHEF ="chef"
    CARE_TAKER = "care taker"
    DOCTOR = "medical professional"

@dataclass
class ModelParameters:
    batch_size: int=1
    num_heads: int=12
    attn_head_size: int=128
    num_layers: int=28
    max_seq_len: int=64
    temp: float=0.6 # Unnecessary, passing directly to generate function from args
    num_key_value_heads: int=2
    seq_len: Optional[int] = None
    hidden_size: Optional[int] = None

logger = logging.getLogger(__name__)

logging.basicConfig(
    level=logging.INFO,  # Or DEBUG in dev
    format='[%(levelname)s] %(asctime)s - %(message)s',
    datefmt='%H:%M:%S'
)

class GemmaModelInference():
    
    def __init__(self, model_sessions: Dict[str, ort.InferenceSession],
                 tokenizer: str,
                 model_subdirectory: Path,
                 model_meta: dict,
                 verbose: VerbosityLevel = VerbosityLevel.NONE):
        self.session_mapper = model_sessions
        self.root_dir = Path.cwd()
        self.model_subdirectory = model_subdirectory
        self.tokenizer_path = model_subdirectory/tokenizer
        self.tokenizer = Tokenizer.from_file(str(self.tokenizer_path))
        self.model_params = ModelParameters(**model_meta)
        self.verbose = verbose
        self.softmax = lambda x, temperature=1: np.exp((x-np.max(x))/temperature)/np.sum(np.exp((x-np.max(x))/temperature), axis=-1)

        # self.verbosity_init(self.verbose)
    
    def query(self, query: str, system_prompt: Optional[str]=None, persona: Optional[str]=None, tool_response: Optional[dict]=None, home_directory: Optional[str]=None) -> str:
        
        self.current_query = query

        if tool_response:
            import json
            tool_response_str = json.dumps(tool_response, indent=2)
            # A more robust prompt for the second turn (when a tool result is available)
            formatted_query = f"""<start_of_turn>user
I asked: "{query}"
<end_of_turn>
<start_of_turn>model
<tool_code>
I used the 'listFiles' tool and got this result:
{tool_response_str}
</tool_code>
Based on that, here is the answer:
"""
        elif system_prompt:
            formatted_query = self._prompt_template(home_directory=home_directory).replace("[system_instruction]",system_prompt)\
                                                     .replace("[query]",query)
        else:
            formatted_query = self._prompt_template(home_directory=home_directory).replace("[system_instruction].","")\
                                                     .replace("[query]",query)
        
        token_ids = self.tokenize(prompt=formatted_query)
        self.model_params.seq_len = token_ids.shape[-1]
        return token_ids

    def tokenize(self, prompt: str) -> np.array:
        return np.array([self.tokenizer.encode(prompt).ids], dtype=np.int64)

    def _cache_init(self):
        empty_kv = defaultdict()
        past_shape = (self.model_params.batch_size,
                          self.model_params.num_key_value_heads,
                          self.model_params.seq_len,
                          self.model_params.attn_head_size
                          )
        
        for layer in range(self.model_params.num_layers):
            empty_kv[f"past_key_values.{layer}.key"] = np.zeros(past_shape, dtype=np.float32)

            empty_kv[f"past_key_values.{layer}.value"] = np.zeros(past_shape, dtype=np.float32)
        
        return empty_kv
    
    def _position_ids(self, sequence_id: List):
          return np.array([sequence_id], dtype=np.int64)
    
    def _attention_mask(self, seq_len: int):
        return np.ones((self.model_params.batch_size, seq_len), dtype=np.int64)
    
    def _input_process(self, input_ids: np.array,
                            current_seq_length: int,
                            position_ids: np.array,
                            kv_cache: Dict[str,float]) -> Dict[str,any]:
        return {"input_ids": input_ids,
                "attention_mask": self._attention_mask(seq_len=current_seq_length),
                "position_ids": self._position_ids(sequence_id=position_ids),
                **kv_cache}
    
    def kv_cache_update(self, model_outputs):
        present_kv = {f"past_key_values.{i}.key": model_outputs[1 + i * 2] for i in range(self.model_params.num_layers)}
        present_kv.update({f"past_key_values.{i}.value": model_outputs[1 + i * 2 + 1] for i in range(self.model_params.num_layers)})
        return present_kv
    
    def next_token(self, model_outputs: Dict, temperature: float, top_k: Optional[int]=None):
        logits = model_outputs[0]
        probas = self.softmax(logits[0,-1], temperature=temperature)
        indices = probas.copy()
        if top_k:
            indices, probas = top_k_probas(probas=probas, k=top_k)
            next_token_id = int(np.random.choice(indices, p=probas))
        else:
            next_token_id = int(np.random.choice(len(probas), p=probas))
        return next_token_id
    
    def decode(self, input_ids: np.array, next_token_id: int, kv_cache: Dict, max_tokens: int,
               temperature: float, top_k: int):
        generated_ids = [next_token_id]
        sequence_length = input_ids.shape[-1]
        position_iter = input_ids.shape[-1]
        printed_length = 0

        for _ in range(max_tokens):
            input_ids = np.array([[next_token_id]], dtype=np.int64)
            position_ids = np.array([[position_iter]], dtype=np.int64)
            input_dict = self._input_process(input_ids=input_ids,
                                             current_seq_length=sequence_length,
                                             position_ids=[position_iter],
                                             kv_cache=kv_cache)
            decode_output = self.session_mapper["MODEL"].run(None, input_dict)
            sequence_length += 1
            position_iter += 1

            kv_cache = self.kv_cache_update(decode_output)
            next_token_id = self.next_token(model_outputs=decode_output,
                                            temperature=temperature,
                                            top_k=top_k)
            generated_ids.append(next_token_id)
            
            full_text = self.tokenizer.decode(generated_ids, skip_special_tokens=True)
            new_text = full_text[printed_length:]
            
            if new_text:
                yield new_text
                printed_length = len(full_text)

            if next_token_id == self.tokenizer.token_to_id("<end_of_turn>"):
                break
    
        logger.info(f"Number of tokens generated: {len(generated_ids)}")

    def _prompt_template(self, home_directory: Optional[str] = None):
        user_context_prompt = ""
        if home_directory:
            # In Windows, paths from os.path.expanduser use backslashes.
            # We need to escape them for the prompt string.
            escaped_home_dir = home_directory.replace('\\', '\\\\')
            user_context_prompt = f"You know the user's home directory is '{escaped_home_dir}'. Use this information when a user asks for files in their home, documents, desktop, etc."

        tool_prompt = f"""\
You are a helpful AI assistant with access to the user's local file system.
{user_context_prompt}

You can use the following tool:

**listFiles**
- Description: Lists files and directories at a given path.
- Parameters:
  - `path` (string, optional): The absolute path of the directory to list. If not provided, it defaults to the user's home directory.
- Example: `listFiles(path="/Users/username/Documents")`

When you need to use a tool, respond with a JSON object in the following format, and nothing else:
{{
  "tool": "tool_name",
  "parameters": {{
    "param_name": "param_value"
  }}
}}
"""
        return f"""<start_of_turn>user
[system_instruction]. {tool_prompt} [query]
<end_of_turn>
<start_of_turn>model"""
    
    def run_inference(self, 
                      query: str,
                      top_k: int=50,
                      temperature: float=0.6,
                      persona: Optional[str]=None,
                      max_tokens: int=4096,
                      system_prompt: Optional[str]=None,
                      tool_response: Optional[dict]=None,
                      io_binding: Optional[bool]=None,
                      repetition_penalty: Optional[float]=None):
        
        home_dir = None
        # We only need the home directory on the first turn (no tool response yet).
        if not tool_response:
            try:
                home_dir = os.path.expanduser('~')
            except Exception as e:
                logger.error(f"Could not get user home directory: {e}")

        token_ids = self.query(query=query, system_prompt=system_prompt, tool_response=tool_response, home_directory=home_dir)
        kv_cache = self._cache_init()
        len_token_id = token_ids.shape[-1]
        position_ids = np.array(np.arange(len_token_id, dtype=np.int64))
        input_dict = self._input_process(input_ids=token_ids,
                                         current_seq_length=len_token_id,
                                         position_ids = position_ids,
                                         kv_cache=kv_cache)
        prefill_output = self.session_mapper["MODEL"].run(None, input_dict)
        kv_cache = self.kv_cache_update(model_outputs=prefill_output)
        next_token_id = self.next_token(prefill_output, temperature=temperature, top_k=top_k)

        yield from self.decode(input_ids=token_ids,
                                    next_token_id=next_token_id,
                                    kv_cache=kv_cache,
                                    max_tokens=max_tokens,
                                    temperature=temperature,
                                    top_k=top_k)
        
if __name__=="__main__":
    import sys
    sys.path.append(str(Path.cwd()/"src"))
    from model_loader import ModelLoader

    model_name = "GEMMA-3_1B"
    processor = "cpu"
    model_type = "default"
    iLoad = ModelLoader(model=model_name, processor=processor, model_type=model_type)
    model_subdirectory = iLoad.model_subdirectory_path

    graphs = iLoad.graphs
    model_sessions = {graph_name: iLoad.load_model(graph,htp_performance_mode="sustained_high_performance") for graph_name,graph in graphs.items() if str(graph).endswith(".onnx")}
    tokenizer = next((file for file in graphs.values() if file.endswith("tokenizer.json")), None)
    meta_data = graphs["META_DATA"]
    
    iInfer = GemmaModelInference(
        model_sessions=model_sessions,
        tokenizer=tokenizer,
        model_subdirectory=model_subdirectory,
        model_meta=meta_data
        )
    iInfer.run_inference(query="Why is some snow better than other snow", system_prompt="you are a professional skier", max_tokens=500)

