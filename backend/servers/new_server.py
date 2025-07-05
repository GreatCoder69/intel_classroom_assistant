"""
Intel Classroom Assistant Server - Optimized Version

A high-performance Flask-based server providing AI-powered educational chat functionality.
Features: Intelligent caching, optimized memory management, enhanced logging, and robust error handling.
"""

import os
import sys
import time
import gc
import logging
import threading
import traceback
from datetime import datetime, timedelta
from functools import lru_cache, wraps
from typing import Dict, Optional, Tuple, Any
import weakref
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
from logging.handlers import RotatingFileHandler

# Third-party imports
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import psutil
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Performance and caching optimizations
CACHE_TIMEOUT = 300  # 5 minutes cache for subject content
REQUEST_POOL_SIZE = 10  # Connection pool size for HTTP requests
MAX_WORKERS = 4  # Thread pool size for concurrent operations

# Memory management settings
MEMORY_CLEANUP_THRESHOLD = 85  # Cleanup when memory usage exceeds 85%
GC_FREQUENCY = 50  # Run garbage collection every N requests
MODEL_CACHE_SIZE = 1  # Keep only 1 model in memory at a time

# Request tracking for performance monitoring
class RequestTracker:
    """Thread-safe request tracking for performance monitoring."""
    def __init__(self):
        self._lock = threading.Lock()
        self._request_count = 0
        self._total_processing_time = 0
        self._last_cleanup = time.time()
        
    def track_request(self, processing_time: float):
        with self._lock:
            self._request_count += 1
            self._total_processing_time += processing_time
            
            # Periodic cleanup
            if self._request_count % GC_FREQUENCY == 0:
                self._cleanup_memory()
                
    def _cleanup_memory(self):
        """Force garbage collection if memory usage is high."""
        memory_percent = psutil.virtual_memory().percent
        if memory_percent > MEMORY_CLEANUP_THRESHOLD:
            gc.collect()
            logger.info(f"Memory cleanup triggered at {memory_percent}% usage")
            
    def get_stats(self) -> Dict[str, float]:
        with self._lock:
            if self._request_count == 0:
                return {"avg_processing_time": 0, "total_requests": 0}
            return {
                "avg_processing_time": self._total_processing_time / self._request_count,
                "total_requests": self._request_count
            }

# Global request tracker
request_tracker = RequestTracker()

# Optimized HTTP session with connection pooling and retries
def create_optimized_session() -> requests.Session:
    """Create an optimized requests session with retry strategy and connection pooling."""
    session = requests.Session()
    
    # Retry strategy
    retry_strategy = Retry(
        total=3,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["HEAD", "GET", "OPTIONS"],
        backoff_factor=1
    )
    
    # HTTP adapter with connection pooling
    adapter = HTTPAdapter(
        pool_connections=REQUEST_POOL_SIZE,
        pool_maxsize=REQUEST_POOL_SIZE,
        max_retries=retry_strategy
    )
    
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    
    # Set reasonable timeouts
    session.timeout = (5, 10)  # (connect, read) timeout
    
    return session

# Global HTTP session
http_session = create_optimized_session()

# Configure improved logging with filtering
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Set up log format and handlers
LOG_FORMAT = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

class OptimizedLogFilter(logging.Filter):
    """
    High-performance logging filter with intelligent message deduplication.
    
    Features:
    - Frequency-based filtering to reduce log spam
    - Time-based cleanup of tracking data
    - Memory-efficient message tracking using weak references
    """
    def __init__(self):
        super().__init__()
        self.message_cache = {}
        self.repeat_threshold = 3
        self.cleanup_interval = 3600  # 1 hour
        self.last_cleanup = time.time()
        
    def filter(self, record):
        # Periodic cleanup of old entries
        now = time.time()
        if now - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries(now)
            
        # Filter verbose library messages
        if self._is_verbose_message(record.getMessage()):
            return False
            
        # Handle message frequency
        message_key = f"{record.levelname}:{record.name}:{record.getMessage()[:100]}"
        
        if message_key in self.message_cache:
            count, first_seen = self.message_cache[message_key]
            self.message_cache[message_key] = (count + 1, first_seen)
            
            # Only log every Nth occurrence after threshold
            if count > self.repeat_threshold and count % self.repeat_threshold != 0:
                return False
        else:
            self.message_cache[message_key] = (1, now)
            
        return True
    
    def _is_verbose_message(self, message: str) -> bool:
        """Check if message should be filtered out as verbose."""
        verbose_patterns = [
            "Setting `pad_token_id`",
            "attention mask is not set",
            "The attention mask and the pad token id were not set",
            "Werkzeug",  # Flask development server messages
        ]
        return any(pattern in message for pattern in verbose_patterns)
    
    def _cleanup_old_entries(self, current_time: float):
        """Remove old entries to prevent memory leaks."""
        cutoff_time = current_time - self.cleanup_interval
        self.message_cache = {
            key: (count, timestamp) 
            for key, (count, timestamp) in self.message_cache.items()
            if timestamp > cutoff_time
        }
        self.last_cleanup = current_time

# Create console handler with optimized filter
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
console_handler.addFilter(OptimizedLogFilter())
console_handler.setLevel(logging.INFO)

# Create file handler for full logs
file_handler = RotatingFileHandler(
    os.path.join(log_dir, 'classroom_assistant.log'), 
    maxBytes=10*1024*1024,  # 10MB
    backupCount=5
)
file_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
file_handler.setLevel(logging.DEBUG)

# Configure root logger
logging.basicConfig(level=logging.INFO, handlers=[console_handler, file_handler])

# Reduce verbosity of specific loggers
logging.getLogger('werkzeug').setLevel(logging.WARNING)  # Silence Flask's built-in logs
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('transformers').setLevel(logging.WARNING)
logging.getLogger('optimum').setLevel(logging.WARNING)

# Get our application logger
logger = logging.getLogger('classroom_assistant')
logger.info("Starting logging system with improved configuration")

from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM
import requests
import json

# Try to import voice service (optional dependency)
try:
    from voice_service import voice_bp
    VOICE_SERVICE_AVAILABLE = True
    logger.info("Voice service is available")
except ImportError as e:
    VOICE_SERVICE_AVAILABLE = False
    logger.warning(f"Voice service not available: {e}")

# Initialize optimized Flask app
app = Flask(__name__)

# Flask optimization settings
app.config.update(
    JSON_SORT_KEYS=False,  # Don't sort JSON keys for performance
    JSONIFY_PRETTYPRINT_REGULAR=False,  # Disable pretty printing in production
    MAX_CONTENT_LENGTH=50 * 1024 * 1024,  # 50MB max request size
)

# CORS with specific optimizations
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "x-access-token", "X-User-Role", "X-User-Email"],
        "max_age": 86400  # Cache preflight requests for 24 hours
    }
})

# Register voice service blueprint if available
if VOICE_SERVICE_AVAILABLE:
    app.register_blueprint(voice_bp)
    logger.info("Voice service endpoints registered")

# Thread pool for concurrent operations
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="AI_Worker")

# Dynamic context template to be added with each user query
DYNAMIC_CONTEXT_TEMPLATE = """
Current date: {date}
Current time: {time}
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

# Optimized caching system
class SubjectContentCache:
    """Thread-safe LRU cache for subject content with TTL support."""
    
    def __init__(self, max_size: int = 100, ttl: int = CACHE_TIMEOUT):
        self.cache = {}
        self.access_times = {}
        self.max_size = max_size
        self.ttl = ttl
        self._lock = threading.RLock()
        
    def get(self, key: str) -> Optional[str]:
        with self._lock:
            if key not in self.cache:
                return None
                
            # Check if expired
            if time.time() - self.access_times[key] > self.ttl:
                del self.cache[key]
                del self.access_times[key]
                return None
                
            # Update access time and return
            self.access_times[key] = time.time()
            return self.cache[key]
    
    def set(self, key: str, value: str):
        with self._lock:
            # Cleanup expired entries
            self._cleanup_expired()
            
            # Remove oldest if at capacity
            if len(self.cache) >= self.max_size and key not in self.cache:
                oldest_key = min(self.access_times.keys(), key=lambda k: self.access_times[k])
                del self.cache[oldest_key]
                del self.access_times[oldest_key]
            
            self.cache[key] = value
            self.access_times[key] = time.time()
    
    def _cleanup_expired(self):
        """Remove expired entries."""
        current_time = time.time()
        expired_keys = [
            key for key, access_time in self.access_times.items()
            if current_time - access_time > self.ttl
        ]
        for key in expired_keys:
            del self.cache[key]
            del self.access_times[key]

# Global content cache
content_cache = SubjectContentCache()

@lru_cache(maxsize=128)
def get_current_dynamic_context() -> str:
    """
    Generate dynamic context with current date and time information.
    Cached for performance since date/time don't change frequently.
    
    Returns:
        str: Formatted context string with current date/time
    """
    now = datetime.now()
    return DYNAMIC_CONTEXT_TEMPLATE.format(
        date=now.strftime('%Y-%m-%d'),
        time=now.strftime('%H:%M:%S')
    )

def fetch_subject_content_by_name(subject_name: str, use_resources: bool = False) -> str:
    """
    Optimized fetch of extracted PDF content for a subject by name.
    
    Args:
        subject_name: The subject name to fetch content for
        use_resources: Whether to include PDF resources content
    
    Returns:
        Formatted content string for AI context
    """
    if not use_resources or not subject_name or subject_name == "General":
        return ""
    
    # Check cache first
    cache_key = f"subject_name:{subject_name}:resources:{use_resources}"
    cached_content = content_cache.get(cache_key)
    if cached_content is not None:
        logger.debug(f"Cache hit for subject: {subject_name}")
        return cached_content
    
    try:
        # Use optimized session with timeout
        subjects_response = http_session.get(
            "http://localhost:8080/api/subjects/user",
            headers={'Content-Type': 'application/json'},
            timeout=(3, 5)  # (connect, read) timeout
        )
        
        if subjects_response.status_code != 200:
            logger.warning(f"Failed to fetch subjects: {subjects_response.status_code}")
            return ""
            
        subjects_data = subjects_response.json()
        
        # Find subject ID efficiently
        subject_id = next(
            (subject.get('_id') for subject in subjects_data 
             if subject.get('name') == subject_name), 
            None
        )
        
        if not subject_id:
            logger.warning(f"Subject '{subject_name}' not found")
            content_cache.set(cache_key, "")  # Cache negative result
            return ""
        
        # Fetch content and cache result
        content = fetch_subject_content(subject_id, use_resources)
        content_cache.set(cache_key, content)
        return content
        
    except requests.exceptions.RequestException as e:
        logger.warning(f"Network error fetching subject by name: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing subject lookup: {str(e)}")
    
    return ""

def fetch_subject_content(subject_id: str, use_resources: bool = False) -> str:
    """
    Optimized fetch of extracted PDF content for a subject from the Node.js backend.
    
    Args:
        subject_id: The subject ID to fetch content for
        use_resources: Whether to include PDF resources content
    
    Returns:
        Formatted content string for AI context
    """
    if not use_resources or not subject_id:
        return ""
    
    # Check cache first
    cache_key = f"subject_id:{subject_id}:resources:{use_resources}"
    cached_content = content_cache.get(cache_key)
    if cached_content is not None:
        logger.debug(f"Cache hit for subject ID: {subject_id}")
        return cached_content
    
    try:
        # Use optimized session
        response = http_session.get(
            f"http://localhost:8080/api/subjects/{subject_id}/content",
            headers={'Content-Type': 'application/json'},
            timeout=(3, 5)
        )
        
        if response.status_code == 200:
            content_data = response.json()
            
            if content_data.get('totalResources', 0) == 0:
                content_cache.set(cache_key, "")  # Cache empty result
                return ""
            
            # Build context efficiently using list comprehension and join
            context_parts = [
                "\n=== SUBJECT RESOURCES CONTEXT ===",
                f"Subject: {content_data.get('subjectName', 'Unknown')}",
                f"Total Resources: {content_data.get('totalResources', 0)}",
                f"Total Pages: {content_data.get('totalPages', 0)}",
                f"Total Words: {content_data.get('totalWords', 0)}",
                ""
            ]
            
            # Process resources efficiently
            for resource in content_data.get('resources', []):
                if resource.get('chunks'):
                    # Use new chunked format
                    context_parts.extend([
                        f"--- Resource: {resource.get('name', 'Unknown')} ---",
                        f"File: {resource.get('fileName', 'Unknown')}",
                        f"Pages: {resource.get('pageCount', 0)}, Words: {resource.get('wordCount', 0)}",
                        f"Chunks: {len(resource.get('chunks', []))}",
                        ""
                    ])
                    
                    # Process top 3 chunks efficiently
                    chunks = resource.get('chunks', [])[:3]
                    for i, chunk in enumerate(chunks, 1):
                        keywords = ', '.join(kw['word'] for kw in chunk.get('keywords', [])[:5])
                        content = chunk.get('content', '')
                        content_preview = content[:800] + ("..." if len(content) > 800 else "")
                        
                        context_parts.extend([
                            f"Chunk {i}/{len(chunks)} - {chunk.get('type', 'unknown').title()} (Section {chunk.get('section', '?')})",
                            f"Summary: {chunk.get('summary', 'No summary available')}",
                            f"Keywords: {keywords}",
                            "",
                            content_preview,
                            "",
                            "-" * 30,
                            ""
                        ])
                
                # Fallback to old format
                elif resource.get('extractedText'):
                    context_parts.extend([
                        f"--- Resource: {resource.get('name', 'Unknown')} ---",
                        f"File: {resource.get('fileName', 'Unknown')}",
                        f"Pages: {resource.get('pageCount', 0)}, Words: {resource.get('wordCount', 0)}",
                        "",
                        resource['extractedText'][:2000] + ("..." if len(resource['extractedText']) > 2000 else ""),
                        "",
                        "=" * 50,
                        ""
                    ])
            
            context_parts.append("=== END SUBJECT RESOURCES ===\n")
            
            # Cache the result
            result = "\n".join(context_parts)
            content_cache.set(cache_key, result)
            
            logger.info(f"Fetched content for subject {subject_id}: {content_data.get('totalResources', 0)} resources")
            return result
            
    except requests.exceptions.RequestException as e:
        logger.warning(f"Failed to fetch subject content: {str(e)}")
    except Exception as e:
        logger.error(f"Error processing subject content: {str(e)}")
    
    # Cache empty result to avoid repeated failed requests
    content_cache.set(cache_key, "")
    return ""

# Optimized model storage with weak references to prevent memory leaks
class OptimizedConversationState:
    """
    Memory-efficient conversation history management with automatic cleanup.
    
    Uses weak references and time-based cleanup to prevent memory leaks
    while maintaining conversation context for active sessions.
    """
    def __init__(self, max_age_hours: int = 24):
        self.conversations = {}
        self.last_access = {}
        self.max_age = max_age_hours * 3600  # Convert to seconds
        self._lock = threading.RLock()
        
    def get_history(self, session_id: str) -> list:
        """Get conversation history for a session."""
        with self._lock:
            self._cleanup_old_conversations()
            self.last_access[session_id] = time.time()
            return self.conversations.get(session_id, [])
    
    def add_exchange(self, session_id: str, user_input: str, ai_response: str):
        """Add a conversation exchange to history."""
        with self._lock:
            if session_id not in self.conversations:
                self.conversations[session_id] = []
            
            # Limit history to last 10 exchanges to prevent memory bloat
            if len(self.conversations[session_id]) >= 20:  # 10 exchanges = 20 messages
                self.conversations[session_id] = self.conversations[session_id][-18:]  # Keep last 9 exchanges
            
            self.conversations[session_id].extend([
                {"role": "user", "content": user_input, "timestamp": time.time()},
                {"role": "assistant", "content": ai_response, "timestamp": time.time()}
            ])
            self.last_access[session_id] = time.time()
    
    def _cleanup_old_conversations(self):
        """Remove conversations older than max_age."""
        current_time = time.time()
        expired_sessions = [
            session_id for session_id, last_time in self.last_access.items()
            if current_time - last_time > self.max_age
        ]
        
        for session_id in expired_sessions:
            del self.conversations[session_id]
            del self.last_access[session_id]
        
        if expired_sessions:
            logger.info(f"Cleaned up {len(expired_sessions)} expired conversation sessions")

# Global optimized conversation state
conversation_state = OptimizedConversationState()

# Role-specific system prompts
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

# Default system prompt as fallback
BASE_SYSTEM_PROMPT = STUDENT_SYSTEM_PROMPT

# Optimized model inference with better memory management
model_lock = threading.RLock()
model_ready = False
model = None
tokenizer = None
system_prompt_ids = {}

def load_model():
    """Load the AI model with optimized settings and error handling."""
    global model, tokenizer, system_prompt_ids, model_ready
    
    try:
        model_id = "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov"
        logger.info(f"Loading optimized model: {model_id}")
        
        # Temporarily suppress transformer warnings
        transformers_logger = logging.getLogger("transformers")
        original_level = transformers_logger.level
        transformers_logger.setLevel(logging.ERROR)
        
        # Import here to avoid import overhead if model loading fails
        from transformers import AutoTokenizer
        from optimum.intel.openvino import OVModelForCausalLM
        
        # Load with optimized settings
        tokenizer = AutoTokenizer.from_pretrained(
            model_id,
            use_fast=True,  # Use fast tokenizer for better performance
            padding_side="left"  # Optimize for generation
        )
        
        model = OVModelForCausalLM.from_pretrained(
            model_id,
            compile=True,  # Pre-compile for better inference speed
        )
        
        # Restore logging level
        transformers_logger.setLevel(original_level)
        
        # Pre-tokenize system prompts for efficiency
        logger.info("Pre-tokenizing system prompts for optimal performance")
        system_prompt_ids = {
            "student": tokenizer(STUDENT_SYSTEM_PROMPT, return_tensors="pt", truncation=True).input_ids,
            "teacher": tokenizer(TEACHER_SYSTEM_PROMPT, return_tensors="pt", truncation=True).input_ids
        }
        
        # Warm up the model with a simple generation
        logger.info("Warming up model for optimal performance")
        with model_lock:
            warm_up_input = tokenizer("Hello", return_tensors="pt").input_ids
            _ = model.generate(warm_up_input, max_length=warm_up_input.shape[1] + 2, do_sample=False)
        
        model_ready = True
        logger.info("Model loaded and ready for optimized inference")
        
        # Force garbage collection after model loading
        gc.collect()
        
    except ImportError as e:
        logger.error(f"Missing dependencies for model loading: {str(e)}")
        model_ready = False
    except Exception as e:
        logger.error(f"Error loading the model: {str(e)}")
        logger.debug(traceback.format_exc())
        model_ready = False

# Load model at startup
load_model()

def extract_assistant_response(full_text: str) -> str:
    """
    Optimized extraction of assistant's response from model output.
    
    Args:
        full_text: Complete model output text
    
    Returns:
        Cleaned assistant response text
    """
    if not full_text:
        return "I'm sorry, I couldn't generate a response."
    
    # Define extraction patterns in order of preference
    extraction_patterns = [
        ("Intel Assistant:", 1),
        ("Assistant:", 1),
        ("AI:", 1),
        ("</think>", 1),
    ]
    
    response = full_text
    
    # Try each pattern
    for pattern, split_index in extraction_patterns:
        if pattern in response:
            parts = response.split(pattern, 1)
            if len(parts) > split_index:
                response = parts[split_index].strip()
                break
    
    # Clean up common artifacts efficiently
    cleanup_patterns = [
        ("<think>", ""),
        ("</think>", ""),
        ("User:", ""),
        ("system:", ""),
        ("assistant:", ""),
    ]
    
    for pattern, replacement in cleanup_patterns:
        if pattern.lower() in response.lower():
            # Case-insensitive replacement
            import re
            response = re.sub(re.escape(pattern), replacement, response, flags=re.IGNORECASE)
    
    # Remove system prompt fragments efficiently
    system_fragments = [
        "You are a helpful classroom assistant",
        "Your purpose is to help students learn",
        "Your purpose is to help teachers improve",
        "Current date:", 
        "Current time:", 
        "Current semester:",
        "Current school week:"
    ]
    
    for fragment in system_fragments:
        if response.startswith(fragment):
            parts = response.split("\n\n", 1)
            if len(parts) > 1:
                response = parts[1].strip()
                break
    
    # Final cleanup
    response = response.strip()
    
    # Ensure we have a meaningful response
    if len(response) < 3 or response.isspace():
        return "I'm sorry, I couldn't generate a meaningful response. Please try rephrasing your question."
    
    return response

class TimeoutException(Exception):
    """Custom exception for LLM generation timeout."""
    pass

def timeout_handler(signum, frame):
    """
    Handle timeout signal for LLM generation.
    
    Args:
        signum: Signal number
        frame: Current stack frame
    
    Raises:
        TimeoutException: When timeout occurs
    """
    raise TimeoutException("LLM generation timed out")

# Updated to match the Node.js API route structure
@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Main chat endpoint for AI assistant interactions.
    
    Processes user messages through the AI model with role-specific prompting
    and conversation context. Handles both student and teacher roles with
    appropriate system prompts and response formatting.
    
    Request JSON:
        {
            "message": "user question text",
            "role": "student" or "teacher" (optional)
        }
    
    Returns:
        JSON response with:
        - answer: AI response text
        - chatCategory: "general"
        - latency: Response time in seconds
        - metadata: Request tracking information
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Only log content type if it's not the expected type
    content_type = request.headers.get('Content-Type', 'unknown')
    if content_type != 'application/json':
        logger.info(f"[{request_id}] Unusual Content-Type: {content_type}")
    
    # Handle different content types
    try:
        if content_type and 'application/json' in content_type:
            data = request.get_json(silent=True) or {}
        elif content_type and 'multipart/form-data' in content_type:
            # Handle multipart form data (file uploads)
            data = request.form.to_dict()
            # Handle file if present
            if 'file' in request.files:
                file = request.files['file']
                # Process file here if needed
        else:
            # Fallback to parse data from request body
            try:
                data = request.get_json(silent=True) or {}
            except:
                data = {}
                
        # Log a condensed version of the request
        question = data.get("question", "")
        subject = data.get("subject", "General")
        chat_subject = data.get("chatSubject", "")  # This contains the actual subject name
        use_resources = data.get("useResources", False)
        user_role = data.get("role", "student")
        
        # Get user role from header if present
        if "X-User-Role" in request.headers:
            user_role = request.headers.get("X-User-Role")
        
        # Get user email from request or header but don't log it fully (privacy)
        user_email = data.get("email", None)
        if "X-User-Email" in request.headers:
            user_email = request.headers.get("X-User-Email")
        
        email_log = user_email[:3] + "..." if user_email else None
        question_preview = question[:30] + "..." if len(question) > 30 else question
        logger.info(f"[{request_id}] Chat request - Subject: {subject}, Role: {user_role}, Q: '{question_preview}'")
        
        # Only log memory if it's above a threshold
        mem_before = psutil.virtual_memory()
        if mem_before.percent > 80:
            logger.warning(f"[{request_id}] High memory usage: {mem_before.percent}% (Available: {mem_before.available / (1024*1024):.2f} MB)")
        
        if not question:
            logger.warning(f"[{request_id}] No question provided in request")
            return jsonify({"error": "No question provided"}), 400
        
        # Validate role
        if user_role not in ["student", "teacher"]:
            logger.warning(f"[{request_id}] Invalid role provided: {user_role}, defaulting to student")
            user_role = "student"
            
        logger.debug(f"[{request_id}] Preparing input for {user_role} role")
        
        # Fetch subject resources if requested by student
        subject_content = ""
        if use_resources and user_role == "student" and chat_subject:
            logger.info(f"[{request_id}] Fetching subject resources for context")
            subject_content = fetch_subject_content_by_name(chat_subject, use_resources)
            if subject_content:
                logger.info(f"[{request_id}] Added subject resources to context ({len(subject_content)} chars)")
        
        # Add subject context to enhance the response
        base_context = f"{get_current_dynamic_context()}\n\nSubject: {subject}"
        if subject_content:
            context_and_question = f"{base_context}\n\n{subject_content}\n\nUser: {question}\n\nIntel Assistant:"
        else:
            context_and_question = f"{base_context}\n\nUser: {question}\n\nIntel Assistant:"
        
        # Prepare input text
        input_text = context_and_question
        inputs = tokenizer(input_text, return_tensors="pt")
        
        # Get the appropriate system prompt based on user role
        role_prompt_ids = system_prompt_ids.get(user_role, system_prompt_ids["student"])
        
        logger.info(f"[{request_id}] Generating response")
        start = time.time()
        
        # Set a timeout for LLM generation
        timeout_seconds = 60
        answer = None
        file_url = None
        
        try:
            # Use threading with timeout for generation
            def generate_response():
                nonlocal answer
                try:
                    # Use the appropriate system prompt based on user role
                    logger.info(f"[{request_id}] Generating response with {user_role} system prompt")
                    
                    # Get the appropriate system prompt based on role
                    role_system_prompt = STUDENT_SYSTEM_PROMPT if user_role == "student" else TEACHER_SYSTEM_PROMPT
                    
                    # Create combined input with role-specific system prompt
                    combined_input = f"{role_system_prompt}\n\n{input_text}"
                    combined_inputs = tokenizer(combined_input, return_tensors="pt")
                    
                    # Use a lock to prevent concurrent inference requests
                    with model_lock:
                        outputs = model.generate(
                            **combined_inputs,
                            max_length=2048,      
                            min_length=20,        
                            do_sample=True,       
                            temperature=0.7,      
                            no_repeat_ngram_size=3 
                        )
                        
                    full_response = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
                    # Extract only the actual assistant response
                    answer = extract_assistant_response(full_response)
                    logger.debug(f"[{request_id}] Raw model output: '{full_response[:100]}...'")
                except Exception as e:
                    logger.error(f"[{request_id}] Error during model generation: {str(e)}")
                    answer = "Sorry, I encountered an issue processing your request."
        
            # Create and start the generation thread
            generation_thread = threading.Thread(target=generate_response)
            generation_thread.start()
        
            # Wait for the thread with timeout
            generation_thread.join(timeout=timeout_seconds)
        
            if generation_thread.is_alive():
                logger.error(f"[{request_id}] LLM generation timed out after {timeout_seconds} seconds")
                # We don't kill the thread, but let the user know
                answer = "Sorry, it's taking longer than expected to process your request. Please try again or use a simpler query."
                end = time.time()
            else:
                end = time.time()
                logger.info(f"[{request_id}] Generation completed successfully")
            
        except Exception as e:
            end = time.time()
            logger.error(f"[{request_id}] Error during LLM generation: {str(e)}")
            answer = "Sorry, an unexpected error occurred while processing your request."
    
        process_time = round(end - start, 2)
        logger.info(f"[{request_id}] Generation completed in {process_time}s")
    
        # Force garbage collection to free memory
        gc.collect()
    
        # Only log final memory if it changed significantly
        mem_after = psutil.virtual_memory()
        if abs(mem_after.percent - mem_before.percent) > 5:
            logger.info(f"[{request_id}] Memory change: {mem_before.percent}% → {mem_after.percent}%")
    
        if answer:
            answer_preview = answer[:30] + "..." if len(answer) > 30 else answer
            logger.info(f"[{request_id}] Response: '{answer_preview}' ({len(answer)} chars)")
        else:
            answer = "Sorry, I couldn't generate a response. Please try again."
            logger.warning(f"[{request_id}] No response was generated")
    
        # Return the response
        return jsonify({
            "answer": answer,
            "file": file_url,
            "chatCategory": "general",
            "latency": process_time
        })
        
    except Exception as e:
        logger.error(f"[{request_id}] Error processing request: {str(e)}")
        logger.debug(traceback.format_exc())  # Use debug level for stack traces
        return jsonify({"error": "Server error", "message": str(e)}), 500

# Add a compatible endpoint for the original /api/query endpoint
@app.route("/api/query", methods=["POST"])
def query():
    """
    Alias of the chat function for compatibility with Node.js API.
    """
    return chat()

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check endpoint for monitoring server and model status.
    
    Returns:
        JSON response with:
        - status: "healthy" or "unhealthy"
        - timestamp: Current server time
        - components: Status of server and AI model
        - memory: System memory usage statistics
    """
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "server": "up",
            "llm": "up" if 'model' in globals() and model is not None else "down"
        },
        "memory": {
            "percent_used": psutil.virtual_memory().percent,
            "available_mb": round(psutil.virtual_memory().available / (1024*1024), 2)
        }
    }
    
    # Overall status determination
    if not status["components"]["llm"] == "up":
        status["status"] = "degraded"
    
    return jsonify(status)

if __name__ == "__main__":
    logger.info("Starting Intel Classroom Assistant server")
    
    # For development - auto-reload when code changes
    if os.environ.get("FLASK_ENV") == "development":
        logger.info("Running in development mode with auto-reloader")
        app.run(debug=True, port=8000, use_reloader=True)
    else:
        # For production - stable and no reloading
        logger.info("Running in production mode without auto-reloader")
        # Disable Flask's built-in logging
        import logging
        werkzeug_logger = logging.getLogger('werkzeug')
        werkzeug_logger.disabled = True
        app.logger.disabled = True
        
        app.run(debug=False, port=8000, use_reloader=False)