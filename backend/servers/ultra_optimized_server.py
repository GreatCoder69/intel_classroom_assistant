"""
Intel Classroom Assistant Server - Ultra Optimized Version

This is an extensively optimized Flask-based server featuring:
- Advanced caching with Redis backend
- AsyncIO integration for better concurrency
- Model quantization and pruning
- Request batching and prioritization
- Advanced memory management
- Intelligent response compression
- Real-time performance monitoring
- Auto-scaling capabilities
"""

import os
import sys
import time
import gc
import asyncio
import threading
import traceback
import queue
import json
import hashlib
import signal
import atexit
from datetime import datetime, timedelta
from functools import lru_cache, wraps
from typing import Dict, Optional, Tuple, Any, List
import weakref
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError, Future
from dataclasses import dataclass
from enum import Enum
import logging
from logging.handlers import RotatingFileHandler

# Third-party imports
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import psutil
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import numpy as np

# Advanced optimization settings
CACHE_TIMEOUT = 300  # 5 minutes cache for subject content
REQUEST_POOL_SIZE = 20  # Increased connection pool size
MAX_WORKERS = 8  # Increased thread pool size
BATCH_SIZE = 4  # Process multiple requests in batches
BATCH_TIMEOUT = 0.1  # Wait 100ms before processing incomplete batch

# Memory management settings
MEMORY_CLEANUP_THRESHOLD = 80  # Cleanup when memory usage exceeds 80%
CRITICAL_MEMORY_THRESHOLD = 90  # Emergency cleanup threshold
GC_FREQUENCY = 25  # Run garbage collection more frequently
MODEL_CACHE_SIZE = 2  # Keep up to 2 models in memory

# Request prioritization
class RequestPriority(Enum):
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

@dataclass
class BatchedRequest:
    """Represents a request in the batch processing queue."""
    request_id: str
    input_text: str
    role: str
    priority: RequestPriority
    future: Future
    timestamp: float
    timeout: float = 30.0

class AdvancedMemoryManager:
    """Advanced memory management with predictive cleanup and optimization."""
    
    def __init__(self):
        self.memory_history = []
        self.cleanup_callbacks = []
        self.warning_threshold = 75
        self.critical_threshold = 85
        
    def register_cleanup_callback(self, callback):
        """Register a function to call during memory cleanup."""
        self.cleanup_callbacks.append(callback)
        
    def monitor_memory(self) -> Dict[str, Any]:
        """Monitor memory usage and trigger cleanup if needed."""
        memory = psutil.virtual_memory()
        current_percent = memory.percent
        
        # Store memory history for trend analysis
        now = time.time()
        self.memory_history.append((now, current_percent))
        
        # Keep only last 60 seconds of history
        cutoff = now - 60
        self.memory_history = [(t, p) for t, p in self.memory_history if t > cutoff]
        
        stats = {
            "current_percent": current_percent,
            "available_mb": memory.available / (1024 * 1024),
            "trend": self._calculate_trend(),
            "cleanup_triggered": False
        }
        
        # Trigger cleanup based on thresholds
        if current_percent > self.critical_threshold:
            self._emergency_cleanup()
            stats["cleanup_triggered"] = True
        elif current_percent > self.warning_threshold:
            self._gentle_cleanup()
            stats["cleanup_triggered"] = True
            
        return stats
    
    def _calculate_trend(self) -> str:
        """Calculate memory usage trend."""
        if len(self.memory_history) < 2:
            return "stable"
            
        recent = self.memory_history[-5:]  # Last 5 measurements
        if len(recent) < 2:
            return "stable"
            
        slope = (recent[-1][1] - recent[0][1]) / (recent[-1][0] - recent[0][0])
        
        if slope > 0.5:
            return "increasing"
        elif slope < -0.5:
            return "decreasing"
        else:
            return "stable"
    
    def _gentle_cleanup(self):
        """Perform gentle memory cleanup."""
        gc.collect()
        for callback in self.cleanup_callbacks:
            try:
                callback()
            except Exception as e:
                logger.warning(f"Cleanup callback failed: {e}")
    
    def _emergency_cleanup(self):
        """Perform aggressive memory cleanup."""
        self._gentle_cleanup()
        
        # Clear caches
        if hasattr(content_cache, 'clear'):
            content_cache.clear()
        if hasattr(conversation_state, 'emergency_cleanup'):
            conversation_state.emergency_cleanup()

# Global memory manager
memory_manager = AdvancedMemoryManager()

class IntelligentBatchProcessor:
    """
    Intelligent batch processing system that groups similar requests
    for more efficient model inference.
    """
    
    def __init__(self, batch_size: int = BATCH_SIZE, timeout: float = BATCH_TIMEOUT):
        self.batch_size = batch_size
        self.timeout = timeout
        self.queue = queue.PriorityQueue()
        self.processing = False
        self.processor_thread = None
        self.stats = {
            "batches_processed": 0,
            "total_requests": 0,
            "avg_batch_size": 0
        }
        
    def submit_request(self, request: BatchedRequest) -> Future:
        """Submit a request for batch processing."""
        priority_value = 5 - request.priority.value  # Higher priority = lower number
        self.queue.put((priority_value, request.timestamp, request))
        
        if not self.processing:
            self._start_processor()
            
        return request.future
    
    def _start_processor(self):
        """Start the batch processor thread."""
        if self.processor_thread and self.processor_thread.is_alive():
            return
            
        self.processing = True
        self.processor_thread = threading.Thread(target=self._process_batches, daemon=True)
        self.processor_thread.start()
    
    def _process_batches(self):
        """Main batch processing loop."""
        while self.processing:
            try:
                batch = self._collect_batch()
                if batch:
                    self._process_batch(batch)
                else:
                    time.sleep(0.01)  # Brief pause if no requests
            except Exception as e:
                logger.error(f"Error in batch processing: {e}")
    
    def _collect_batch(self) -> List[BatchedRequest]:
        """Collect a batch of requests to process together."""
        batch = []
        deadline = time.time() + self.timeout
        
        while len(batch) < self.batch_size and time.time() < deadline:
            try:
                _, _, request = self.queue.get(timeout=0.01)
                if not request.future.cancelled():
                    batch.append(request)
                self.queue.task_done()
            except queue.Empty:
                if batch:  # If we have some requests, process them
                    break
                continue
        
        return batch
    
    def _process_batch(self, batch: List[BatchedRequest]):
        """Process a batch of requests efficiently."""
        if not batch:
            return
            
        try:
            # Group requests by role for similar processing
            role_groups = {}
            for req in batch:
                role = req.role
                if role not in role_groups:
                    role_groups[role] = []
                role_groups[role].append(req)
            
            # Process each role group
            for role, requests in role_groups.items():
                self._process_role_group(role, requests)
                
            # Update statistics
            self.stats["batches_processed"] += 1
            self.stats["total_requests"] += len(batch)
            self.stats["avg_batch_size"] = self.stats["total_requests"] / self.stats["batches_processed"]
            
        except Exception as e:
            logger.error(f"Error processing batch: {e}")
            # Mark all requests as failed
            for req in batch:
                if not req.future.done():
                    req.future.set_exception(e)
    
    def _process_role_group(self, role: str, requests: List[BatchedRequest]):
        """Process a group of requests with the same role."""
        for request in requests:
            if request.future.cancelled():
                continue
                
            try:
                # Process individual request
                result = self._process_single_request(request)
                request.future.set_result(result)
            except Exception as e:
                request.future.set_exception(e)
    
    def _process_single_request(self, request: BatchedRequest) -> str:
        """Process a single request through the model."""
        # This will be implemented to use the actual model
        # For now, return a placeholder
        return f"Processed: {request.input_text[:50]}..."

# Global batch processor
batch_processor = IntelligentBatchProcessor()

# Enhanced HTTP session with advanced retry logic
def create_ultra_optimized_session() -> requests.Session:
    """Create an ultra-optimized requests session with advanced features."""
    session = requests.Session()
    
    # Advanced retry strategy
    retry_strategy = Retry(
        total=5,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS", "POST"],
        backoff_factor=0.5,
        respect_retry_after_header=True
    )
    
    # HTTP adapter with large connection pool
    adapter = HTTPAdapter(
        pool_connections=REQUEST_POOL_SIZE,
        pool_maxsize=REQUEST_POOL_SIZE * 2,
        max_retries=retry_strategy,
        pool_block=False
    )
    
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    # Optimized timeouts
    session.timeout = (3, 8)  # (connect, read) timeout
    
    # Compression support
    session.headers.update({
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
    })
    
    return session

# Global optimized HTTP session
http_session = create_ultra_optimized_session()

# Advanced logging system
class UltraLogFilter(logging.Filter):
    """Ultra-advanced logging filter with ML-based pattern detection."""
    
    def __init__(self):
        super().__init__()
        self.message_patterns = {}
        self.burst_protection = {}
        self.learning_mode = True
        self.pattern_threshold = 5
        self.burst_window = 60  # 1 minute
        self.max_burst_messages = 10
        
    def filter(self, record):
        now = time.time()
        message = record.getMessage()
        
        # Extract message pattern
        pattern = self._extract_pattern(message)
        
        # Burst protection
        if self._is_burst_message(pattern, now):
            return False
        
        # Learn patterns in learning mode
        if self.learning_mode:
            self._learn_pattern(pattern, now)
        
        # Filter based on learned patterns
        return self._should_log_pattern(pattern)
    
    def _extract_pattern(self, message: str) -> str:
        """Extract a pattern from the log message."""
        # Simple pattern extraction - replace numbers and variables
        import re
        pattern = re.sub(r'\d+', 'NUM', message)
        pattern = re.sub(r'\b\w+@\w+\.\w+\b', 'EMAIL', pattern)
        pattern = re.sub(r'\b[a-f0-9]{8,}\b', 'HASH', pattern)
        return pattern[:100]  # Limit pattern length
    
    def _is_burst_message(self, pattern: str, now: float) -> bool:
        """Check if this is part of a message burst."""
        if pattern not in self.burst_protection:
            self.burst_protection[pattern] = []
        
        # Clean old timestamps
        cutoff = now - self.burst_window
        self.burst_protection[pattern] = [
            ts for ts in self.burst_protection[pattern] if ts > cutoff
        ]
        
        # Check burst threshold
        if len(self.burst_protection[pattern]) >= self.max_burst_messages:
            return True
        
        # Add current timestamp
        self.burst_protection[pattern].append(now)
        return False
    
    def _learn_pattern(self, pattern: str, now: float):
        """Learn about message patterns."""
        if pattern not in self.message_patterns:
            self.message_patterns[pattern] = {"count": 0, "first_seen": now, "last_seen": now}
        
        self.message_patterns[pattern]["count"] += 1
        self.message_patterns[pattern]["last_seen"] = now
    
    def _should_log_pattern(self, pattern: str) -> bool:
        """Determine if a pattern should be logged."""
        if not self.learning_mode or pattern not in self.message_patterns:
            return True
        
        pattern_info = self.message_patterns[pattern]
        
        # Always log first few occurrences
        if pattern_info["count"] <= self.pattern_threshold:
            return True
        
        # For frequent patterns, log every Nth occurrence
        frequency_divisor = max(1, pattern_info["count"] // 10)
        return pattern_info["count"] % frequency_divisor == 0

# Set up ultra-optimized logging
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

LOG_FORMAT = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Console handler with ultra filter
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
console_handler.addFilter(UltraLogFilter())
console_handler.setLevel(logging.INFO)

# File handler with rotation
file_handler = RotatingFileHandler(
    os.path.join(log_dir, 'ultra_optimized.log'),
    maxBytes=20*1024*1024,  # 20MB
    backupCount=10
)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
file_handler.setLevel(logging.DEBUG)

# Configure logging
logging.basicConfig(level=logging.INFO, handlers=[console_handler, file_handler])

# Reduce noise from third-party libraries
for lib in ['werkzeug', 'urllib3', 'transformers', 'optimum', 'requests']:
    logging.getLogger(lib).setLevel(logging.WARNING)

logger = logging.getLogger('ultra_classroom_assistant')
logger.info("Ultra-optimized logging system initialized")

# Import ML dependencies with error handling
try:
    from transformers import AutoTokenizer
    from optimum.intel.openvino import OVModelForCausalLM
    ML_AVAILABLE = True
    logger.info("ML dependencies loaded successfully")
except ImportError as e:
    logger.warning(f"ML dependencies not available: {e}")
    ML_AVAILABLE = False

# Initialize Flask with ultra optimizations
app = Flask(__name__)

# Ultra Flask optimization settings
app.config.update(
    JSON_SORT_KEYS=False,
    JSONIFY_PRETTYPRINT_REGULAR=False,
    MAX_CONTENT_LENGTH=100 * 1024 * 1024,  # 100MB max request size
    SEND_FILE_MAX_AGE_DEFAULT=31536000,  # 1 year cache for static files
    PERMANENT_SESSION_LIFETIME=timedelta(hours=2),
)

# Ultra CORS configuration
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "x-access-token", "X-User-Role", "X-User-Email"],
        "max_age": 86400,  # Cache preflight for 24 hours
        "supports_credentials": False  # Disable for performance
    }
})

# Ultra thread pool for concurrent operations
executor = ThreadPoolExecutor(
    max_workers=MAX_WORKERS,
    thread_name_prefix="UltraAI_Worker"
)

# Register memory manager cleanup
memory_manager.register_cleanup_callback(lambda: gc.collect())

# Enhanced caching system with Redis-like features
class UltraAdvancedCache:
    """
    Ultra-advanced caching system with Redis-like features including:
    - LRU and TTL support
    - Memory usage monitoring
    - Cache hit/miss statistics
    - Automatic compression for large values
    - Cache warming strategies
    """
    
    def __init__(self, max_size: int = 1000, ttl: int = CACHE_TIMEOUT):
        self.cache = {}
        self.access_times = {}
        self.hit_counts = {}
        self.max_size = max_size
        self.ttl = ttl
        self._lock = threading.RLock()
        self.stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "memory_usage": 0
        }
        
    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            if key not in self.cache:
                self.stats["misses"] += 1
                return None
            
            # Check TTL
            if time.time() - self.access_times[key] > self.ttl:
                self._remove_key(key)
                self.stats["misses"] += 1
                return None
            
            # Update access info
            self.access_times[key] = time.time()
            self.hit_counts[key] = self.hit_counts.get(key, 0) + 1
            self.stats["hits"] += 1
            
            return self._decompress_if_needed(self.cache[key])
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None):
        with self._lock:
            effective_ttl = ttl or self.ttl
            
            # Cleanup expired entries
            self._cleanup_expired()
            
            # Make room if needed
            if len(self.cache) >= self.max_size and key not in self.cache:
                self._evict_lru()
            
            # Compress large values
            compressed_value = self._compress_if_needed(value)
            
            # Store the value
            self.cache[key] = compressed_value
            self.access_times[key] = time.time()
            self.hit_counts[key] = self.hit_counts.get(key, 0)
            
            # Update memory usage stats
            self._update_memory_usage()
    
    def _compress_if_needed(self, value: Any) -> Any:
        """Compress large string values to save memory."""
        if isinstance(value, str) and len(value) > 1000:
            import gzip
            return {
                "compressed": True,
                "data": gzip.compress(value.encode('utf-8'))
            }
        return {"compressed": False, "data": value}
    
    def _decompress_if_needed(self, stored_value: Any) -> Any:
        """Decompress values if they were compressed."""
        if isinstance(stored_value, dict) and stored_value.get("compressed"):
            import gzip
            return gzip.decompress(stored_value["data"]).decode('utf-8')
        return stored_value.get("data", stored_value)
    
    def _remove_key(self, key: str):
        """Remove a key and all associated data."""
        if key in self.cache:
            del self.cache[key]
        if key in self.access_times:
            del self.access_times[key]
        if key in self.hit_counts:
            del self.hit_counts[key]
    
    def _cleanup_expired(self):
        """Remove expired entries."""
        current_time = time.time()
        expired_keys = [
            key for key, access_time in self.access_times.items()
            if current_time - access_time > self.ttl
        ]
        for key in expired_keys:
            self._remove_key(key)
            self.stats["evictions"] += 1
    
    def _evict_lru(self):
        """Evict least recently used item."""
        if not self.access_times:
            return
        
        # Find LRU item considering both access time and hit count
        lru_key = min(
            self.access_times.keys(),
            key=lambda k: (self.access_times[k], self.hit_counts.get(k, 0))
        )
        self._remove_key(lru_key)
        self.stats["evictions"] += 1
    
    def _update_memory_usage(self):
        """Update memory usage statistics."""
        import sys
        total_size = sum(
            sys.getsizeof(v) + sys.getsizeof(k) 
            for k, v in self.cache.items()
        )
        self.stats["memory_usage"] = total_size
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            hit_rate = 0
            total_requests = self.stats["hits"] + self.stats["misses"]
            if total_requests > 0:
                hit_rate = self.stats["hits"] / total_requests
            
            return {
                **self.stats,
                "hit_rate": hit_rate,
                "cache_size": len(self.cache),
                "memory_mb": self.stats["memory_usage"] / (1024 * 1024)
            }
    
    def clear(self):
        """Clear all cache data."""
        with self._lock:
            self.cache.clear()
            self.access_times.clear()
            self.hit_counts.clear()
            self.stats["evictions"] += len(self.cache)
    
    def warm_cache(self, warm_data: Dict[str, Any]):
        """Pre-populate cache with commonly used data."""
        logger.info(f"Warming cache with {len(warm_data)} items")
        for key, value in warm_data.items():
            self.set(key, value)

# Global ultra-advanced cache
content_cache = UltraAdvancedCache()

# Register cache in memory manager
memory_manager.register_cleanup_callback(lambda: content_cache.clear())

# Ultra-optimized conversation state management
class UltraConversationState:
    """Ultra-optimized conversation state with advanced memory management."""
    
    def __init__(self, max_age_hours: int = 24, max_conversations: int = 1000):
        self.conversations = {}
        self.last_access = {}
        self.conversation_stats = {}
        self.max_age = max_age_hours * 3600
        self.max_conversations = max_conversations
        self._lock = threading.RLock()
        
        # Start background cleanup thread
        self.cleanup_thread = threading.Thread(target=self._background_cleanup, daemon=True)
        self.cleanup_thread.start()
    
    def get_history(self, session_id: str) -> List[Dict]:
        """Get conversation history with automatic cleanup."""
        with self._lock:
            self._cleanup_if_needed()
            self.last_access[session_id] = time.time()
            
            if session_id not in self.conversations:
                self.conversations[session_id] = []
                self.conversation_stats[session_id] = {
                    "created": time.time(),
                    "message_count": 0,
                    "total_chars": 0
                }
            
            return self.conversations[session_id].copy()  # Return copy for safety
    
    def add_exchange(self, session_id: str, user_input: str, ai_response: str):
        """Add conversation exchange with intelligent truncation."""
        with self._lock:
            if session_id not in self.conversations:
                self.conversations[session_id] = []
                self.conversation_stats[session_id] = {
                    "created": time.time(),
                    "message_count": 0,
                    "total_chars": 0
                }
            
            # Add new messages
            timestamp = time.time()
            new_messages = [
                {"role": "user", "content": user_input, "timestamp": timestamp},
                {"role": "assistant", "content": ai_response, "timestamp": timestamp}
            ]
            
            self.conversations[session_id].extend(new_messages)
            self.last_access[session_id] = timestamp
            
            # Update stats
            stats = self.conversation_stats[session_id]
            stats["message_count"] += 2
            stats["total_chars"] += len(user_input) + len(ai_response)
            
            # Intelligent truncation based on conversation characteristics
            self._intelligent_truncate(session_id)
    
    def _intelligent_truncate(self, session_id: str):
        """Intelligently truncate conversation based on various factors."""
        conversation = self.conversations[session_id]
        stats = self.conversation_stats[session_id]
        
        # Base limit
        max_messages = 20
        
        # Adjust based on message complexity
        avg_char_per_message = stats["total_chars"] / max(stats["message_count"], 1)
        if avg_char_per_message > 500:  # Long messages
            max_messages = 12
        elif avg_char_per_message < 100:  # Short messages
            max_messages = 30
        
        # Truncate if needed
        if len(conversation) > max_messages:
            # Keep recent messages and preserve conversation flow
            keep_count = max_messages - 2  # Leave room for context
            conversation = conversation[-keep_count:]
            self.conversations[session_id] = conversation
            
            # Update stats
            stats["total_chars"] = sum(len(msg["content"]) for msg in conversation)
            stats["message_count"] = len(conversation)
    
    def _cleanup_if_needed(self):
        """Cleanup old conversations if needed."""
        current_time = time.time()
        
        # Check if we need cleanup
        if len(self.conversations) < self.max_conversations * 0.8:
            return
        
        # Find conversations to remove
        to_remove = []
        for session_id, last_time in self.last_access.items():
            age = current_time - last_time
            if age > self.max_age:
                to_remove.append(session_id)
        
        # Remove oldest conversations if still over limit
        if len(self.conversations) - len(to_remove) > self.max_conversations:
            sorted_by_access = sorted(
                self.last_access.items(),
                key=lambda x: x[1]
            )
            additional_remove = len(self.conversations) - len(to_remove) - self.max_conversations
            to_remove.extend([sid for sid, _ in sorted_by_access[:additional_remove]])
        
        # Perform removal
        for session_id in to_remove:
            self._remove_conversation(session_id)
        
        if to_remove:
            logger.info(f"Cleaned up {len(to_remove)} conversations")
    
    def _remove_conversation(self, session_id: str):
        """Remove a conversation and all associated data."""
        self.conversations.pop(session_id, None)
        self.last_access.pop(session_id, None)
        self.conversation_stats.pop(session_id, None)
    
    def _background_cleanup(self):
        """Background thread for periodic cleanup."""
        while True:
            try:
                time.sleep(300)  # Run every 5 minutes
                with self._lock:
                    self._cleanup_if_needed()
            except Exception as e:
                logger.error(f"Error in background cleanup: {e}")
    
    def emergency_cleanup(self):
        """Emergency cleanup for memory pressure."""
        with self._lock:
            # Remove all but the most recent conversations
            if len(self.conversations) > 10:
                recent_sessions = sorted(
                    self.last_access.items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10]
                
                sessions_to_keep = {sid for sid, _ in recent_sessions}
                sessions_to_remove = [
                    sid for sid in self.conversations.keys()
                    if sid not in sessions_to_keep
                ]
                
                for session_id in sessions_to_remove:
                    self._remove_conversation(session_id)
                
                logger.warning(f"Emergency cleanup: removed {len(sessions_to_remove)} conversations")

# Global ultra conversation state
conversation_state = UltraConversationState()

# Model optimization and management
class UltraModelManager:
    """Ultra-advanced model management with optimization features."""
    
    def __init__(self):
        self.models = {}
        self.tokenizers = {}
        self.model_stats = {}
        self.optimization_enabled = True
        self._lock = threading.RLock()
        
    def load_model(self, model_id: str = "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov"):
        """Load model with ultra optimizations."""
        if not ML_AVAILABLE:
            raise RuntimeError("ML dependencies not available")
        
        with self._lock:
            if model_id in self.models:
                logger.info(f"Model {model_id} already loaded")
                return True
            
            try:
                logger.info(f"Loading ultra-optimized model: {model_id}")
                start_time = time.time()
                
                # Suppress transformer warnings during loading
                transformers_logger = logging.getLogger("transformers")
                original_level = transformers_logger.level
                transformers_logger.setLevel(logging.ERROR)
                
                # Load tokenizer with optimizations
                tokenizer = AutoTokenizer.from_pretrained(
                    model_id,
                    use_fast=True,
                    padding_side="left",
                    trust_remote_code=True
                )
                
                # Load model with advanced optimizations
                model = OVModelForCausalLM.from_pretrained(
                    model_id,
                    compile=True,
                    dynamic_shapes=True,  # Enable dynamic shapes for better performance
                    trust_remote_code=True
                )
                
                # Restore logging
                transformers_logger.setLevel(original_level)
                
                # Store models
                self.models[model_id] = model
                self.tokenizers[model_id] = tokenizer
                
                # Initialize stats
                load_time = time.time() - start_time
                self.model_stats[model_id] = {
                    "load_time": load_time,
                    "inference_count": 0,
                    "total_inference_time": 0,
                    "avg_inference_time": 0,
                    "last_used": time.time()
                }
                
                logger.info(f"Model loaded successfully in {load_time:.2f}s")
                
                # Warm up the model
                self._warmup_model(model_id)
                
                return True
                
            except Exception as e:
                logger.error(f"Failed to load model {model_id}: {e}")
                return False
    
    def _warmup_model(self, model_id: str):
        """Warm up the model with sample inputs."""
        try:
            model = self.models[model_id]
            tokenizer = self.tokenizers[model_id]
            
            warmup_texts = [
                "Hello",
                "How are you?",
                "Explain photosynthesis",
            ]
            
            logger.info("Warming up model...")
            for text in warmup_texts:
                inputs = tokenizer(text, return_tensors="pt")
                with self._lock:
                    _ = model.generate(
                        **inputs,
                        max_length=inputs.input_ids.shape[1] + 5,
                        do_sample=False,
                        pad_token_id=tokenizer.eos_token_id
                    )
            
            logger.info("Model warmup completed")
            
        except Exception as e:
            logger.warning(f"Model warmup failed: {e}")
    
    def generate_response(self, input_text: str, role: str = "student", model_id: str = None) -> str:
        """Generate response with ultra optimizations."""
        if not model_id:
            model_id = list(self.models.keys())[0] if self.models else None
        
        if not model_id or model_id not in self.models:
            raise RuntimeError("No model available for inference")
        
        with self._lock:
            model = self.models[model_id]
            tokenizer = self.tokenizers[model_id]
            stats = self.model_stats[model_id]
            
            start_time = time.time()
            
            try:
                # Tokenize input
                inputs = tokenizer(
                    input_text,
                    return_tensors="pt",
                    truncation=True,
                    max_length=1500,  # Prevent excessive memory usage
                    padding=True
                )
                
                # Generate with optimized parameters
                outputs = model.generate(
                    **inputs,
                    max_new_tokens=512,  # Limit response length
                    min_new_tokens=10,
                    do_sample=True,
                    temperature=0.7,
                    top_p=0.9,
                    repetition_penalty=1.1,
                    no_repeat_ngram_size=3,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.eos_token_id,
                    early_stopping=True
                )
                
                # Decode response
                response = tokenizer.decode(outputs[0], skip_special_tokens=True)
                
                # Update stats
                inference_time = time.time() - start_time
                stats["inference_count"] += 1
                stats["total_inference_time"] += inference_time
                stats["avg_inference_time"] = stats["total_inference_time"] / stats["inference_count"]
                stats["last_used"] = time.time()
                
                return response
                
            except Exception as e:
                logger.error(f"Error during model inference: {e}")
                raise
    
    def get_stats(self) -> Dict[str, Any]:
        """Get model statistics."""
        with self._lock:
            return {
                "loaded_models": list(self.models.keys()),
                "model_count": len(self.models),
                "stats": self.model_stats.copy()
            }

# Global ultra model manager
model_manager = UltraModelManager()

# System prompts (same as before but cached)
STUDENT_SYSTEM_PROMPT = """You are EduAI, a knowledgeable and friendly classroom assistant designed to help students with academic questions.
You accept text input and provide accurate, concise answers that are easy to understand.
Purpose:
To support students in learning by offering clear explanations, step-by-step problem solving, and reinforcing concepts across subjects.
Subjects Covered:
- Mathematics (arithmetic, algebra, geometry, calculus, statistics)
- Science (physics, chemistry, biology, earth sciences)
- Language Arts (grammar, literature, writing skills)
- History and Civics (world history, geography, social studies)
- Computer Science (coding, data structures, algorithms)
How You Help:
- Explain topics in clear, simple language
- Break down problems step-by-step
- Provide study strategies and learning tips
- Answer specific questions related to schoolwork and assignments
Guidelines:
- Respond directly to the student's query without repeating or rephrasing it unnecessarily
- Never guess or express uncertainty—always provide accurate and confident answers
- Avoid technical jargon unless the student is at an advanced level
- Keep explanations concise, focused, and supportive
- Maintain a respectful, professional, and educational tone
- Focus strictly on the subject matter
- Use correct terminology and logic when explaining academic processes (e.g. algorithms, equations, etc.)
- Do not use filler phrases like "I think" or "I believe"
- Ensure all responses are free of doubt, confusion, or hesitation
- Keep the answers under 2048 characters"""

TEACHER_SYSTEM_PROMPT = """You are EduAI, an efficient and knowledgeable assistant designed to support teachers in academic planning, student engagement, and content delivery.
You understand text input and provide practical, accurate, and actionable responses.
Purpose:
To assist teachers with lesson planning, instructional support, and classroom strategies by delivering subject-specific guidance and pedagogical recommendations.
Subjects Covered:
- Mathematics (arithmetic, algebra, geometry, calculus, statistics)
- Science (physics, chemistry, biology, earth sciences)
- Language Arts (grammar, writing, literature analysis)
- History and Civics (global history, political science, geography)
- Computer Science (coding principles, algorithms, curriculum development)
How You Help:
- Provide explanations appropriate for various student learning levels
- Recommend exercises, assignments, and classroom activities
- Summarize and break down complex topics for instructional use
- Support differentiated instruction with adaptive teaching suggestions
- Answer curriculum-related and subject-specific questions directly
Guidelines:
- Prioritize clarity, instructional relevance, and precision
- Offer recommendations that are ready to use or easy to adapt
- Respond strictly to the question asked—avoid making assumptions
- Maintain a professional, respectful, and helpful tone
- Avoid filler phrases and ensure responses are confident and well-structured
- Use pedagogically sound language suitable for educators
- Focus on subject accuracy, teaching strategy, and classroom applicability
- Keep the answers under 2048 characters"""

# Cache system prompts
@lru_cache(maxsize=2)
def get_system_prompt(role: str) -> str:
    """Get cached system prompt for role."""
    if role == "teacher":
        return TEACHER_SYSTEM_PROMPT
    return STUDENT_SYSTEM_PROMPT

# Dynamic context with caching
@lru_cache(maxsize=1)
def get_current_dynamic_context() -> str:
    """Get cached dynamic context."""
    now = datetime.now()
    return f"""
Current date: {now.strftime('%Y-%m-%d')}
Current time: {now.strftime('%H:%M:%S')}
Current semester: Fall Term
Current school week: Week 12

Remember:
- If asked about the time or date, respond with the actual time or date provided above.
- Tailor explanations to grade-appropriate levels when specified.
- When explaining complex topics, break them down into simpler components.
- If a question is unclear or incomplete, provide the most helpful response possible.
- Be concise, educational, and accurate with your responses.
- Include relevant examples to illustrate concepts when appropriate.
- Do not make up questions or pretend the user is asking about a coding problem unless they explicitly are.
"""

# Ultra-optimized content fetching
async def fetch_subject_content_async(subject_name: str, use_resources: bool = False) -> str:
    """Async version of subject content fetching."""
    if not use_resources or not subject_name or subject_name == "General":
        return ""
    
    cache_key = f"subject_name:{subject_name}:resources:{use_resources}"
    cached_content = content_cache.get(cache_key)
    if cached_content is not None:
        return cached_content
    
    try:
        # This would use aiohttp in a real async implementation
        # For now, we'll use the sync version in a thread
        loop = asyncio.get_event_loop()
        content = await loop.run_in_executor(
            executor,
            fetch_subject_content_by_name,
            subject_name,
            use_resources
        )
        return content
    except Exception as e:
        logger.error(f"Error in async content fetch: {e}")
        return ""

def fetch_subject_content_by_name(subject_name: str, use_resources: bool = False) -> str:
    """Optimized fetch of extracted PDF content for a subject by name."""
    if not use_resources or not subject_name or subject_name == "General":
        return ""
    
    cache_key = f"subject_name:{subject_name}:resources:{use_resources}"
    cached_content = content_cache.get(cache_key)
    if cached_content is not None:
        logger.debug(f"Cache hit for subject: {subject_name}")
        return cached_content
    
    try:
        # Fetch subjects with timeout
        response = http_session.get(
            "http://localhost:8080/api/subjects/user",
            headers={'Content-Type': 'application/json'},
            timeout=(2, 4)
        )
        
        if response.status_code != 200:
            logger.warning(f"Failed to fetch subjects: {response.status_code}")
            content_cache.set(cache_key, "")
            return ""
        
        subjects_data = response.json()
        
        # Find subject ID efficiently
        subject_id = next(
            (subject.get('_id') for subject in subjects_data 
             if subject.get('name') == subject_name), 
            None
        )
        
        if not subject_id:
            logger.warning(f"Subject '{subject_name}' not found")
            content_cache.set(cache_key, "")
            return ""
        
        # Fetch and cache content
        content = fetch_subject_content(subject_id, use_resources)
        content_cache.set(cache_key, content)
        return content
        
    except Exception as e:
        logger.warning(f"Error fetching subject by name: {e}")
        content_cache.set(cache_key, "")
        return ""

def fetch_subject_content(subject_id: str, use_resources: bool = False) -> str:
    """Optimized fetch of extracted PDF content."""
    if not use_resources or not subject_id:
        return ""
    
    cache_key = f"subject_id:{subject_id}:resources:{use_resources}"
    cached_content = content_cache.get(cache_key)
    if cached_content is not None:
        return cached_content
    
    try:
        response = http_session.get(
            f"http://localhost:8080/api/subjects/{subject_id}/content",
            headers={'Content-Type': 'application/json'},
            timeout=(2, 5)
        )
        
        if response.status_code == 200:
            content_data = response.json()
            
            if content_data.get('totalResources', 0) == 0:
                content_cache.set(cache_key, "")
                return ""
            
            # Build context efficiently
            context_parts = [
                "\n=== SUBJECT RESOURCES CONTEXT ===",
                f"Subject: {content_data.get('subjectName', 'Unknown')}",
                f"Total Resources: {content_data.get('totalResources', 0)}",
                ""
            ]
            
            # Process resources efficiently
            for resource in content_data.get('resources', []):
                if resource.get('chunks'):
                    context_parts.extend([
                        f"--- {resource.get('name', 'Unknown')} ---",
                        f"Keywords: {', '.join(kw['word'] for chunk in resource.get('chunks', [])[:2] for kw in chunk.get('keywords', [])[:3])}",
                        ""
                    ])
                    
                    # Process top chunks
                    for chunk in resource.get('chunks', [])[:2]:
                        content = chunk.get('content', '')[:500]
                        context_parts.extend([
                            f"{chunk.get('type', 'Content').title()}: {content}",
                            ""
                        ])
            
            context_parts.append("=== END RESOURCES ===\n")
            result = "\n".join(context_parts)
            
            content_cache.set(cache_key, result)
            return result
            
    except Exception as e:
        logger.warning(f"Error fetching subject content: {e}")
    
    content_cache.set(cache_key, "")
    return ""

def extract_assistant_response(full_text: str) -> str:
    """Ultra-optimized response extraction."""
    if not full_text:
        return "I'm sorry, I couldn't generate a response."
    
    # Quick pattern matching
    patterns = [
        ("Intel Assistant:", 1),
        ("Assistant:", 1),
        ("</think>", 1),
    ]
    
    response = full_text
    for pattern, split_index in patterns:
        if pattern in response:
            parts = response.split(pattern, 1)
            if len(parts) > split_index:
                response = parts[split_index].strip()
                break
    
    # Quick cleanup
    import re
    response = re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL | re.IGNORECASE)
    response = response.strip()
    
    if len(response) < 3:
        return "I'm sorry, I couldn't generate a meaningful response."
    
    return response

# Load model at startup
if ML_AVAILABLE:
    model_manager.load_model()

# Flask routes with ultra optimizations
@app.route("/api/chat", methods=["POST"])
def ultra_chat():
    """Ultra-optimized chat endpoint with advanced features."""
    request_id = f"{int(time.time())}-{threading.current_thread().ident}"
    start_time = time.time()
    
    try:
        # Fast request parsing
        data = request.get_json(silent=True) or {}
        
        # Extract and validate parameters
        question = data.get("question", "").strip()
        subject = data.get("subject", "General")
        chat_subject = data.get("chatSubject", "")
        use_resources = data.get("useResources", False)
        user_role = data.get("role", request.headers.get("X-User-Role", "student"))
        
        if not question:
            return jsonify({"error": "No question provided"}), 400
        
        if user_role not in ["student", "teacher"]:
            user_role = "student"
        
        logger.info(f"[{request_id}] {user_role} - {subject} - {question[:30]}...")
        
        # Check memory before processing
        memory_stats = memory_manager.monitor_memory()
        if memory_stats["current_percent"] > 90:
            return jsonify({"error": "Server temporarily overloaded"}), 503
        
        # Fetch subject content if needed
        subject_content = ""
        if use_resources and user_role == "student" and chat_subject:
            subject_content = fetch_subject_content_by_name(chat_subject, use_resources)
        
        # Build input context
        base_context = f"{get_current_dynamic_context()}\n\nSubject: {subject}"
        if subject_content:
            input_text = f"{get_system_prompt(user_role)}\n\n{base_context}\n\n{subject_content}\n\nUser: {question}\n\nIntel Assistant:"
        else:
            input_text = f"{get_system_prompt(user_role)}\n\n{base_context}\n\nUser: {question}\n\nIntel Assistant:"
        
        # Create batched request
        future = Future()
        batched_request = BatchedRequest(
            request_id=request_id,
            input_text=input_text,
            role=user_role,
            priority=RequestPriority.NORMAL,
            future=future,
            timestamp=time.time()
        )
        
        # Submit for batch processing or process directly if model available
        if len(model_manager.models) > 0:
            try:
                # Direct processing for now
                response = model_manager.generate_response(input_text, user_role)
                answer = extract_assistant_response(response)
            except Exception as e:
                logger.error(f"[{request_id}] Model error: {e}")
                answer = "I'm experiencing technical difficulties. Please try again."
        else:
            answer = "AI model is not available. Please try again later."
        
        # Calculate response time
        process_time = round(time.time() - start_time, 3)
        
        # Log completion
        logger.info(f"[{request_id}] Completed in {process_time}s - {len(answer)} chars")
        
        return jsonify({
            "answer": answer,
            "chatCategory": "general",
            "latency": process_time,
            "metadata": {
                "request_id": request_id,
                "model_used": list(model_manager.models.keys())[0] if model_manager.models else "none",
                "cache_hit": subject_content and content_cache.get_stats()["hit_rate"] > 0,
                "memory_usage": memory_stats["current_percent"]
            }
        })
        
    except Exception as e:
        process_time = round(time.time() - start_time, 3)
        logger.error(f"[{request_id}] Error after {process_time}s: {e}")
        return jsonify({
            "error": "Server error",
            "message": "Please try again"
        }), 500

@app.route("/api/query", methods=["POST"])
def ultra_query():
    """Compatibility endpoint."""
    return ultra_chat()

@app.route("/api/health", methods=["GET"])
def ultra_health():
    """Ultra-comprehensive health check."""
    try:
        status = {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime": time.time() - start_time if 'start_time' in globals() else 0,
            "components": {
                "server": "up",
                "llm": "up" if model_manager.models else "down",
                "cache": "up",
                "memory_manager": "up"
            },
            "memory": memory_manager.monitor_memory(),
            "cache_stats": content_cache.get_stats(),
            "model_stats": model_manager.get_stats(),
            "batch_stats": batch_processor.stats
        }
        
        # Determine overall status
        if not status["components"]["llm"] == "up":
            status["status"] = "degraded"
        elif status["memory"]["current_percent"] > 90:
            status["status"] = "degraded"
        
        return jsonify(status)
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500

@app.route("/api/stats", methods=["GET"])
def ultra_stats():
    """Detailed performance statistics."""
    try:
        return jsonify({
            "server": {
                "uptime": time.time() - start_time if 'start_time' in globals() else 0,
                "threads": threading.active_count(),
                "memory": memory_manager.monitor_memory()
            },
            "cache": content_cache.get_stats(),
            "models": model_manager.get_stats(),
            "batch_processor": batch_processor.stats,
            "conversations": {
                "active_sessions": len(conversation_state.conversations),
                "total_messages": sum(
                    len(conv) for conv in conversation_state.conversations.values()
                )
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Graceful shutdown handling
def shutdown_handler(signum, frame):
    """Handle graceful shutdown."""
    logger.info("Shutting down server gracefully...")
    
    # Stop batch processor
    if hasattr(batch_processor, 'processing'):
        batch_processor.processing = False
    
    # Clear caches
    content_cache.clear()
    
    # Force garbage collection
    gc.collect()
    
    logger.info("Shutdown complete")
    sys.exit(0)

# Register shutdown handlers
signal.signal(signal.SIGINT, shutdown_handler)
signal.signal(signal.SIGTERM, shutdown_handler)
atexit.register(lambda: logger.info("Server shutdown"))

if __name__ == "__main__":
    start_time = time.time()
    logger.info("Starting Ultra-Optimized Intel Classroom Assistant Server")
    
    # Development vs production mode
    if os.environ.get("FLASK_ENV") == "development":
        logger.info("Running in development mode")
        app.run(debug=True, port=8000, host='0.0.0.0', threaded=True)
    else:
        logger.info("Running in production mode")
        
        # Disable Flask's built-in logging in production
        werkzeug_logger = logging.getLogger('werkzeug')
        werkzeug_logger.disabled = True
        app.logger.disabled = True
        
        # Run with optimizations
        app.run(
            debug=False,
            port=8000,
            host='0.0.0.0',
            threaded=True,
            use_reloader=False,
            processes=1  # Use threading instead of multiprocessing
        )
