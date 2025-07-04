"""
Optimized Model Manager for Intel Classroom Assistant

Provides efficient loading, caching, and inference management for AI language models
with memory optimization, error handling, and performance monitoring capabilities.
"""

import os
import gc
import time
import psutil
import logging
import threading
import traceback
from dataclasses import dataclass
from typing import Tuple, Dict, List, Optional, Any

logger = logging.getLogger(__name__)

@dataclass
class ModelConfig:
    """
    Configuration parameters for AI model loading and optimization.
    
    Defines model behavior, memory limits, caching settings, and performance
    parameters for efficient inference operations.
    """
    model_id: str
    cache_dir: str = "./model_cache"
    max_context_length: int = 1024
    sliding_window_size: int = 512
    batch_size: int = 2
    max_queue_size: int = 10
    memory_threshold: float = 95.0
    enable_kv_cache: bool = True

class OptimizedModelManager:
    """
    Manages AI model lifecycle with optimization and error handling.
    
    Handles model loading with caching, memory-efficient inference,
    conversation context management, and automatic error recovery.
    Thread-safe for concurrent requests.
    """
    
    def __init__(self, config: ModelConfig):
        """
        Initialize model manager with configuration.
        
        Args:
            config (ModelConfig): Model configuration parameters
        """
        self.config = config
        self.model = None
        self.tokenizer = None
        self.is_model_loaded = False
        self.inference_lock = threading.RLock()
        self._ensure_cache_dir()
        
    def _ensure_cache_dir(self):
        """
        Create model cache directory if it doesn't exist.
        
        Ensures the configured cache directory exists for storing
        model files and tokenizer data.
        """
        if not os.path.exists(self.config.cache_dir):
            os.makedirs(self.config.cache_dir, exist_ok=True)
            
    def load_model_cached(self) -> bool:
        """
        Load AI model and tokenizer with caching optimization.
        
        Attempts to load the configured model from cache or download if needed.
        Uses OpenVINO optimization for efficient CPU inference.
        
        Returns:
            bool: True if model loaded successfully, False otherwise
        """
        try:
            from transformers import AutoTokenizer
            from optimum.intel.openvino import OVModelForCausalLM
            
            # Check available memory before loading
            if self._check_memory_pressure():
                logger.warning("High memory pressure detected, optimizing for low memory")
            
            logger.info(f"Loading model {self.config.model_id} from cache")
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.config.model_id,
                cache_dir=self.config.cache_dir
            )
            
            # Load with optimized settings
            self.model = OVModelForCausalLM.from_pretrained(
                self.config.model_id,
                cache_dir=self.config.cache_dir,
                from_transformers=False,  # Use cached OpenVINO IR if available
                compile=False  # Avoid recompilation if possible
            )
            
            # Initialize model properties based on config
            self.is_model_loaded = True
            logger.info("Model loaded successfully")
            return True
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            logger.error(traceback.format_exc())
            self.is_model_loaded = False
            return False
    
    def warm_up_model(self):
        """
        Initialize model with a test inference to prepare internal states.
        
        Runs a simple inference to warm up the model pipeline and
        ensure optimal performance for subsequent requests.
        """
        if not self.is_model_loaded:
            logger.warning("Cannot warm up: model not loaded")
            return
            
        try:
            logger.info("Warming up model...")
            warm_up_text = "Hello, how are you?"
            input_ids = self.tokenizer(warm_up_text, return_tensors="pt").input_ids
            
            with self.inference_lock:
                _ = self.model.generate(
                    input_ids,
                    max_length=20,
                    num_return_sequences=1
                )
            logger.info("Model warm-up complete")
        except Exception as e:
            logger.error(f"Error during model warm-up: {str(e)}")
    
    def get_memory_stats(self) -> Dict[str, float]:
        """
        Retrieve current system memory usage statistics.
        
        Returns:
            Dict[str, float]: Memory statistics including total, available,
                            used percentage, and current process memory
        """
        memory = psutil.virtual_memory()
        return {
            "total_mb": memory.total / (1024 * 1024),
            "available_mb": memory.available / (1024 * 1024),
            "used_percent": memory.percent,
            "process_mb": psutil.Process(os.getpid()).memory_info().rss / (1024 * 1024)
        }
    
    def _check_memory_pressure(self) -> bool:
        """
        Check if system memory usage exceeds configured threshold.
        
        Returns:
            bool: True if memory usage is above threshold, False otherwise
        """
        memory = psutil.virtual_memory()
        return memory.percent > self.config.memory_threshold
    
    def _clean_memory(self):
        """
        Perform garbage collection if system is under memory pressure.
        
        Attempts to free unused memory when system usage exceeds threshold.
        """
        if self._check_memory_pressure():
            logger.info("Memory pressure detected, cleaning up...")
            gc.collect()
    
    def generate_response_optimized(
        self, 
        input_text: str, 
        role: str = "student",
        conversation_history: List[str] = None,
        system_prompt: str = None
    ) -> Tuple[str, float]:
        """
        Generate AI response with optimization and error handling.
        
        Processes input text through the AI model with conversation context,
        automatic retry logic, and memory management. Handles inference errors
        gracefully with exponential backoff.
        
        Args:
            input_text (str): User input text to process
            role (str): User role for context (student/teacher)
            conversation_history (List[str]): Previous conversation exchanges
            system_prompt (str): Optional system prompt override
            
        Returns:
            Tuple[str, float]: Generated response text and inference time in seconds
        """
        if not self.is_model_loaded:
            return "Model not loaded. Please try again later.", 0.0
        
        start_time = time.time()
        max_retries = 2
        retry_count = 0
        backoff_time = 1.0  # Initial backoff time in seconds
        
        while retry_count <= max_retries:
            try:
                # Check memory before generation
                self._clean_memory()
                
                # Prepare full input including history and system prompt
                full_input = input_text
                if system_prompt:
                    full_input = f"{system_prompt}\n\n{full_input}"
                
                # Add conversation history if provided
                if conversation_history:
                    history_text = "\n".join(conversation_history[-3:])  # Last 3 exchanges
                    full_input = f"{history_text}\n\n{full_input}"
                
                # Tokenize input
                inputs = self.tokenizer(full_input, return_tensors="pt")
                
                # Generate with lock to prevent concurrent access
                with self.inference_lock:
                    outputs = self.model.generate(
                        **inputs,
                        max_length=min(len(inputs.input_ids[0]) + 512, self.config.max_context_length),
                        min_length=20,
                        do_sample=True,
                        temperature=0.7,
                        no_repeat_ngram_size=3,
                        num_return_sequences=1
                    )
                
                # Decode output
                generated_text = self.tokenizer.batch_decode(
                    outputs, skip_special_tokens=True
                )[0]
                
                generation_time = time.time() - start_time
                return generated_text, generation_time
                
            except Exception as e:
                retry_count += 1
                error_msg = str(e)
                logger.error(f"Generation error (attempt {retry_count}/{max_retries}): {error_msg}")
                
                # Special handling for "Infer Request is busy"
                if "Infer Request is busy" in error_msg:
                    logger.info(f"Waiting for inference engine to be available (backoff: {backoff_time}s)")
                    time.sleep(backoff_time)
                    backoff_time *= 2  # Exponential backoff
                    
                    # Release lock and reinitialize if needed
                    if hasattr(self, 'inference_lock') and self.inference_lock.locked():
                        try:
                            self.inference_lock = threading.RLock()
                        except:
                            pass
                    
                    continue
                
                if retry_count > max_retries:
                    break
                
                # Wait before retry
                time.sleep(backoff_time)
                backoff_time *= 2  # Exponential backoff
        
        # If we get here, all retries failed
        generation_time = time.time() - start_time
        return "Sorry, I encountered technical difficulties generating a response. Please try again.", generation_time
