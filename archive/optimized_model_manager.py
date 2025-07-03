"""
Optimized Model Manager for Intel Classroom Assistant

This module implements various optimizations for the LLM model including:
- Model caching and persistence
- Memory-efficient context management
- Batched inference capabilities
- Advanced memory management
"""

import os
import pickle
import threading
import time
from typing import Dict, List, Optional, Tuple
from collections import deque
from dataclasses import dataclass
import torch
import gc
import psutil
import logging
from transformers import AutoTokenizer, PreTrainedTokenizer
from optimum.intel.openvino import OVModelForCausalLM

logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    """Configuration for model optimization settings."""
    model_id: str = "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov"
    cache_dir: str = "./model_cache"
    max_context_length: int = 1024
    sliding_window_size: int = 512
    batch_size: int = 4
    max_queue_size: int = 10
    memory_threshold: float = 80.0  # Percentage
    enable_kv_cache: bool = True

class OptimizedModelManager:
    """
    Optimized model manager with caching, batching, and memory management.
    
    Features:
    - Model persistence and caching
    - Sliding window context management
    - Batched inference processing
    - Memory monitoring and cleanup
    - Pre-computed system prompts
    """
    
    def __init__(self, config: ModelConfig):
        """
        Initialize the optimized model manager.
        
        Args:
            config (ModelConfig): Configuration settings for optimization
        """
        self.config = config
        self.tokenizer: Optional[PreTrainedTokenizer] = None
        self.model: Optional[OVModelForCausalLM] = None
        self.system_prompt_cache: Dict[str, torch.Tensor] = {}
        self.request_queue: deque = deque(maxlen=config.max_queue_size)
        self.processing_lock = threading.Lock()
        self.is_model_loaded = False
        
        # Create cache directory
        os.makedirs(config.cache_dir, exist_ok=True)
        
    def load_model_cached(self) -> bool:
        """
        Load model with caching support for faster startup.
        
        Returns:
            bool: True if model loaded successfully
        """
        cache_path = os.path.join(self.config.cache_dir, "model_cache.pkl")
        tokenizer_cache = os.path.join(self.config.cache_dir, "tokenizer_cache.pkl")
        
        try:
            # Try to load from cache first
            if os.path.exists(cache_path) and os.path.exists(tokenizer_cache):
                logger.info("Loading model from cache...")
                with open(tokenizer_cache, 'rb') as f:
                    self.tokenizer = pickle.load(f)
                # Note: Large models should use proper model serialization, not pickle
                # This is a simplified example
                
            # Load fresh model if cache doesn't exist
            if not self.tokenizer:
                logger.info("Loading fresh model...")
                self.tokenizer = AutoTokenizer.from_pretrained(self.config.model_id)
                self.model = OVModelForCausalLM.from_pretrained(self.config.model_id)
                
                # Cache the tokenizer (model caching requires more sophisticated approach)
                with open(tokenizer_cache, 'wb') as f:
                    pickle.dump(self.tokenizer, f)
            else:
                self.model = OVModelForCausalLM.from_pretrained(self.config.model_id)
                
            self.is_model_loaded = True
            self._precompute_system_prompts()
            logger.info("Model loaded and optimized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            return False
    
    def _precompute_system_prompts(self):
        """Precompute and cache tokenized system prompts for different roles."""
        system_prompts = {
            "student": """You are EduAI, a knowledgeable classroom assistant for students...""",
            "teacher": """You are EduAI, an efficient assistant for teachers..."""
        }
        
        for role, prompt in system_prompts.items():
            tokenized = self.tokenizer(prompt, return_tensors="pt", 
                                     max_length=self.config.max_context_length//2, 
                                     truncation=True)
            self.system_prompt_cache[role] = tokenized.input_ids
            logger.info(f"Cached system prompt for {role} role")
    
    def _manage_context_window(self, conversation_history: List[str], 
                              current_input: str, role: str) -> str:
        """
        Implement sliding window context management to prevent memory issues.
        
        Args:
            conversation_history (List[str]): Previous conversation messages
            current_input (str): Current user input
            role (str): User role (student/teacher)
            
        Returns:
            str: Optimized context string
        """
        # Get system prompt
        system_prompt = self.system_prompt_cache.get(role, "")
        
        # Calculate available space for conversation
        system_tokens = len(system_prompt[0]) if len(system_prompt) > 0 else 0
        current_tokens = len(self.tokenizer.encode(current_input))
        available_tokens = self.config.max_context_length - system_tokens - current_tokens - 100  # Buffer
        
        # Implement sliding window for conversation history
        if available_tokens > 0 and conversation_history:
            # Start from most recent messages and work backwards
            selected_history = []
            token_count = 0
            
            for message in reversed(conversation_history):
                message_tokens = len(self.tokenizer.encode(message))
                if token_count + message_tokens <= available_tokens:
                    selected_history.insert(0, message)
                    token_count += message_tokens
                else:
                    break
            
            history_text = "\n".join(selected_history)
        else:
            history_text = ""
        
        # Combine system prompt, selected history, and current input
        optimized_context = f"{history_text}\n{current_input}".strip()
        return optimized_context
    
    def generate_response_optimized(self, input_text: str, role: str = "student", 
                                  conversation_history: List[str] = None) -> Tuple[str, float]:
        """
        Generate optimized response with memory management and caching.
        
        Args:
            input_text (str): User input text
            role (str): User role for appropriate system prompt
            conversation_history (List[str]): Previous conversation context
            
        Returns:
            Tuple[str, float]: Generated response and processing time
        """
        if not self.is_model_loaded:
            return "Model not loaded", 0.0
            
        start_time = time.time()
        conversation_history = conversation_history or []
        
        try:
            # Check memory usage before processing
            if self._check_memory_usage():
                self._cleanup_memory()
            
            # Optimize context using sliding window
            optimized_context = self._manage_context_window(
                conversation_history, input_text, role
            )
            
            # Tokenize with optimization
            inputs = self.tokenizer(
                optimized_context, 
                return_tensors="pt",
                max_length=self.config.max_context_length,
                truncation=True,
                padding=False
            )
            
            # Generate with optimized parameters
            with torch.inference_mode():  # Disable gradient computation
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=256,  # Limit output length
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    pad_token_id=self.tokenizer.eos_token_id,
                    use_cache=self.config.enable_kv_cache
                )
            
            # Decode response
            response = self.tokenizer.decode(
                outputs[0][len(inputs.input_ids[0]):], 
                skip_special_tokens=True
            ).strip()
            
            processing_time = time.time() - start_time
            
            # Clean up intermediate tensors
            del inputs, outputs
            
            return response, processing_time
            
        except Exception as e:
            logger.error(f"Error generating response: {str(e)}")
            return "Sorry, I encountered an error processing your request.", time.time() - start_time
    
    def _check_memory_usage(self) -> bool:
        """
        Check if memory usage exceeds threshold.
        
        Returns:
            bool: True if memory cleanup needed
        """
        memory_percent = psutil.virtual_memory().percent
        return memory_percent > self.config.memory_threshold
    
    def _cleanup_memory(self):
        """Perform memory cleanup operations."""
        logger.info("Performing memory cleanup...")
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("Memory cleanup completed")
    
    def batch_process_requests(self, requests: List[Tuple[str, str]]) -> List[Tuple[str, float]]:
        """
        Process multiple requests in batch for better efficiency.
        
        Args:
            requests (List[Tuple[str, str]]): List of (input_text, role) pairs
            
        Returns:
            List[Tuple[str, float]]: List of (response, time) pairs
        """
        if not self.is_model_loaded or not requests:
            return []
        
        results = []
        
        # Process in batches
        for i in range(0, len(requests), self.config.batch_size):
            batch = requests[i:i + self.config.batch_size]
            batch_results = []
            
            for input_text, role in batch:
                result = self.generate_response_optimized(input_text, role)
                batch_results.append(result)
            
            results.extend(batch_results)
            
            # Small delay between batches to prevent overloading
            if i + self.config.batch_size < len(requests):
                time.sleep(0.1)
        
        return results
    
    def warm_up_model(self):
        """Warm up the model with dummy inputs for better first-request performance."""
        if not self.is_model_loaded:
            return
            
        logger.info("Warming up model...")
        dummy_inputs = [
            ("Hello, how are you?", "student"),
            ("What is mathematics?", "teacher")
        ]
        
        for input_text, role in dummy_inputs:
            self.generate_response_optimized(input_text, role)
        
        logger.info("Model warm-up completed")
    
    def get_memory_stats(self) -> Dict[str, float]:
        """
        Get current memory usage statistics.
        
        Returns:
            Dict[str, float]: Memory usage statistics
        """
        memory = psutil.virtual_memory()
        return {
            "total_mb": memory.total / (1024 * 1024),
            "available_mb": memory.available / (1024 * 1024),
            "used_percent": memory.percent,
            "free_mb": memory.free / (1024 * 1024)
        }
    
    def unload_model(self):
        """Safely unload the model to free memory."""
        if self.model:
            del self.model
            self.model = None
        if self.tokenizer:
            del self.tokenizer
            self.tokenizer = None
        
        self.system_prompt_cache.clear()
        self.is_model_loaded = False
        self._cleanup_memory()
        logger.info("Model unloaded successfully")
