"""
Optimized Intel Classroom Assistant Server

This optimized version includes:
- Efficient model loading and caching
- Memory management and monitoring
- Batched request processing
- Context window optimization
- Improved error handling and logging
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import queue
import sounddevice as sd
import json
import time
import gc
import logging
import threading
import psutil
from datetime import datetime
from optimized_model_manager import OptimizedModelManager, ModelConfig

# Configure enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Initialize Flask app with optimizations
app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Global configuration
MODEL_CONFIG = ModelConfig(
    model_id="openvino/phi-2-quant-int4",
    cache_dir="./model_cache",
    max_context_length=1024,
    sliding_window_size=512,
    batch_size=2,  # Smaller batch for real-time responses
    max_queue_size=10,
    memory_threshold=95.0,
    enable_kv_cache=True
)

# Initialize optimized model manager
model_manager = OptimizedModelManager(MODEL_CONFIG)

# Vosk setup with optimization
q = queue.Queue(maxsize=100)  # Limit queue size

# Enhanced conversation state with memory optimization
class OptimizedConversationState:
    """
    Optimized conversation state management with memory limits.
    
    Features:
    - Automatic history pruning
    - Memory-efficient storage
    - Role-based context separation
    """
    
    def __init__(self, max_history: int = 10):
        """
        Initialize conversation state with memory limits.
        
        Args:
            max_history (int): Maximum number of messages to keep
        """
        self.history = {}  # Role-based history separation
        self.max_history = max_history
        self.lock = threading.Lock()
    
    def add_message(self, role: str, user_input: str, ai_response: str):
        """
        Add message to conversation history with automatic pruning.
        
        Args:
            role (str): User role (student/teacher)
            user_input (str): User's input message
            ai_response (str): AI's response message
        """
        with self.lock:
            if role not in self.history:
                self.history[role] = []
            
            self.history[role].append({
                "timestamp": datetime.now().isoformat(),
                "user": user_input,
                "assistant": ai_response
            })
            
            # Prune old messages to maintain memory efficiency
            if len(self.history[role]) > self.max_history:
                self.history[role] = self.history[role][-self.max_history:]
    
    def get_context(self, role: str) -> list:
        """
        Get conversation context for a specific role.
        
        Args:
            role (str): User role
            
        Returns:
            list: Recent conversation messages
        """
        with self.lock:
            return self.history.get(role, [])
    
    def clear_history(self, role: str = None):
        """
        Clear conversation history for a role or all roles.
        
        Args:
            role (str, optional): Specific role to clear, or None for all
        """
        with self.lock:
            if role:
                self.history.pop(role, None)
            else:
                self.history.clear()

# Global optimized conversation state
conversation_state = OptimizedConversationState(max_history=8)

# Dynamic context with caching
_context_cache = {}
_context_cache_time = 0
CONTEXT_CACHE_DURATION = 300  # 5 minutes

def get_current_dynamic_context():
    """
    Generate dynamic context with caching for performance.
    
    Returns:
        str: Cached or fresh dynamic context
    """
    global _context_cache, _context_cache_time
    
    current_time = time.time()
    if current_time - _context_cache_time > CONTEXT_CACHE_DURATION:
        _context_cache = f"""
Current date: {datetime.now().strftime('%Y-%m-%d')}
Current time: {datetime.now().strftime('%H:%M:%S')}
Current semester: Fall Term
Current school week: Week 12

Remember:
- Provide accurate, educational responses
- Do not display your thinking process we need precise answers
- If you see that the last sentence is exceeding the word limit, don't leave it incomplete. Summarise and incorporate in the previous sentence itself. 
- No unfinished sentences
- Tailor explanations to the user's role and level
- Be concise and helpful
- Include relevant examples when appropriate
"""
        _context_cache_time = current_time
    
    return _context_cache

# Enhanced user credentials with role metadata
users = {
    "student": {
        "password": "student", 
        "role": "student",
        "context_limit": 512,
        "response_limit": 256
    },
    "teacher": {
        "password": "teacher", 
        "role": "teacher",
        "context_limit": 1024,
        "response_limit": 512
    }
}

def extract_assistant_response(full_text: str) -> str:
    """
    Extract and clean assistant response from model output.
    
    Args:
        full_text (str): Raw model output
        
    Returns:
        str: Cleaned assistant response
    """
    # Enhanced response extraction with multiple fallback strategies
    markers = ["Intel Assistant:", "Assistant:", "Response:"]
    
    for marker in markers:
        if marker in full_text:
            response = full_text.split(marker, 1)[1].strip()
            break
    else:
        response = full_text.strip()
    
    # Clean up common artifacts
    artifacts = ["</think>", "<think>", "User:", "System:"]
    for artifact in artifacts:
        response = response.replace(artifact, "").strip()
    
    # Remove leading/trailing whitespace and limit length
    response = response.strip()[:2000]  # Reasonable length limit
    
    return response or "I apologize, but I couldn't generate a proper response. Please try again."

def audio_callback(indata, frames, time_info, status):
    """
    Optimized audio callback with error handling.
    
    Args:
        indata: Input audio data
        frames: Number of frames
        time_info: Timing information
        status: Stream status
    """
    if status:
        logger.warning(f"Audio callback status: {status}")
    
    try:
        if not q.full():  # Prevent queue overflow
            q.put(bytes(indata))
    except Exception as e:
        logger.error(f"Audio callback error: {str(e)}")

@app.route("/api/login", methods=["POST"])
def login():
    """
    Enhanced login with role-based configuration.
    
    Returns:
        JSON: Login response with user configuration
    """
    try:
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        
        if not username or not password:
            return jsonify({"message": "Username and password are required"}), 400
        
        user = users.get(username)
        if user and user["password"] == password:
            # Include user-specific configuration
            response_data = {
                "username": username,
                "role": user["role"],
                "message": "Login successful",
                "config": {
                    "context_limit": user.get("context_limit", 512),
                    "response_limit": user.get("response_limit", 256)
                }
            }
            logger.info(f"Successful login for user: {username} (role: {user['role']})")
            return jsonify(response_data)
        
        logger.warning(f"Failed login attempt for username: {username}")
        return jsonify({"message": "Invalid credentials"}), 401
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@app.route("/api/listen", methods=["GET"])
def listen():
    """
    Optimized speech recognition with better error handling.
    
    Returns:
        JSON: Transcribed speech with processing metadata
    """
    if not rec:
        return jsonify({"error": "Speech recognition not available"}), 503
    
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    logger.info(f"[{request_id}] Starting speech recognition")
    
    recognized_text = ""
    last_speech_time = time.time()
    timeout_seconds = 8  # Reduced timeout for better UX
    
    try:
        with sd.RawInputStream(
            samplerate=16000, 
            blocksize=4000,  # Reduced block size for lower latency
            dtype='int16',
            channels=1, 
            callback=audio_callback
        ):
            while True:
                if not q.empty():
                    try:
                        data = q.get_nowait()
                        if rec.AcceptWaveform(data):
                            result = rec.Result()
                            text = json.loads(result).get("text", "").strip()
                            if text:
                                recognized_text = text
                                logger.info(f"[{request_id}] Recognized: '{text}'")
                                break
                        else:
                            partial = json.loads(rec.PartialResult()).get("partial", "").strip()
                            if partial:
                                last_speech_time = time.time()
                    except queue.Empty:
                        pass
                    except Exception as e:
                        logger.error(f"[{request_id}] Audio processing error: {str(e)}")
                
                if time.time() - last_speech_time > timeout_seconds:
                    logger.info(f"[{request_id}] Speech recognition timeout")
                    break
                
                time.sleep(0.01)  # Small sleep to prevent CPU spinning
                
    except Exception as e:
        logger.error(f"[{request_id}] Speech recognition error: {str(e)}")
        return jsonify({"error": "Speech recognition failed"}), 500
    
    return jsonify({
        "transcript": recognized_text,
        "request_id": request_id,
        "processing_time": time.time() - last_speech_time
    })

@app.route("/api/query", methods=["POST"])
def query():
    """
    Optimized query processing with enhanced error handling and monitoring.
    
    Returns:
        JSON: AI response with comprehensive metadata
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    start_time = time.time()
    
    # Get memory stats before processing
    mem_before = model_manager.get_memory_stats()
    logger.info(f"[{request_id}] Memory before: {mem_before['used_percent']:.1f}% used")
    
    try:
        data = request.get_json()
        question = data.get("question", "").strip()
        user_role = data.get("role", "student")
        
        if not question:
            return jsonify({"error": "No question provided"}), 400
        
        if user_role not in ["student", "teacher"]:
            logger.warning(f"[{request_id}] Invalid role: {user_role}, defaulting to student")
            user_role = "student"
        
        logger.info(f"[{request_id}] Processing query for {user_role}: '{question[:50]}...'")
        
        # Get conversation context
        context_history = conversation_state.get_context(user_role)
        context_texts = [f"User: {msg['user']}\nAssistant: {msg['assistant']}" 
                        for msg in context_history[-3:]]  # Last 3 exchanges
        
        # Prepare input with dynamic context
        dynamic_context = get_current_dynamic_context()
        full_input = f"{dynamic_context}\n\nUser: {question}\n\nIntel Assistant:"
        
        # Generate response using optimized model manager
        response, generation_time = model_manager.generate_response_optimized(
            input_text=full_input,
            role=user_role,
            conversation_history=context_texts
        )
        
        # Clean up response
        cleaned_response = extract_assistant_response(response)
        
        # Update conversation state
        conversation_state.add_message(user_role, question, cleaned_response)
        
        # Get memory stats after processing
        mem_after = model_manager.get_memory_stats()
        total_time = time.time() - start_time
        
        response_data = {
            "answer": cleaned_response,
            "metadata": {
                "request_id": request_id,
                "generation_time": round(generation_time, 3),
                "total_time": round(total_time, 3),
                "user_role": user_role,
                "memory_usage": {
                    "before_percent": round(mem_before['used_percent'], 1),
                    "after_percent": round(mem_after['used_percent'], 1),
                    "available_mb": round(mem_after['available_mb'], 1)
                },
                "response_length": len(cleaned_response)
            }
        }
        
        logger.info(f"[{request_id}] Response generated successfully in {total_time:.2f}s")
        return jsonify(response_data)
        
    except Exception as e:
        error_time = time.time() - start_time
        logger.error(f"[{request_id}] Query processing error: {str(e)}")
        return jsonify({
            "error": "Failed to process query",
            "metadata": {
                "request_id": request_id,
                "error_time": round(error_time, 3),
                "error_type": type(e).__name__
            }
        }), 500

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Health check endpoint with system status.
    
    Returns:
        JSON: System health and performance metrics
    """
    memory_stats = model_manager.get_memory_stats()
    
    health_data = {
        "status": "healthy" if model_manager.is_model_loaded else "degraded",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model_manager.is_model_loaded,
        "speech_recognition": rec is not None,
        "memory": memory_stats,
        "uptime_seconds": int(time.time() - start_time) if 'start_time' in globals() else 0
    }
    
    return jsonify(health_data)

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    Get detailed system statistics.
    
    Returns:
        JSON: Comprehensive system and model statistics
    """
    return jsonify({
        "memory": model_manager.get_memory_stats(),
        "model_config": {
            "model_id": MODEL_CONFIG.model_id,
            "max_context_length": MODEL_CONFIG.max_context_length,
            "batch_size": MODEL_CONFIG.batch_size,
            "memory_threshold": MODEL_CONFIG.memory_threshold
        },
        "conversation_stats": {
            role: len(history) for role, history in conversation_state.history.items()
        }
    })

# Model initialization with startup optimization
def initialize_server():
    """Initialize server with optimized model loading."""
    global start_time
    start_time = time.time()
    
    logger.info("🚀 Starting Intel Classroom Assistant Server (Optimized)")
    logger.info(f"Model: {MODEL_CONFIG.model_id}")
    logger.info(f"Cache directory: {MODEL_CONFIG.cache_dir}")
    
    # Load model with caching
    if model_manager.load_model_cached():
        logger.info("Model loaded successfully")
        
        # Warm up model for better first-request performance
        model_manager.warm_up_model()
        logger.info("Model warm-up completed")
    else:
        logger.error("Failed to load model")
    
    logger.info("Server initialization complete")

if __name__ == "__main__":
    initialize_server()
    
    # Run with optimized settings
    app.run(
        debug=False,  # Disable debug for production
        port=8000,
        host='127.0.0.1',
        threaded=True,  # Enable threading for better concurrency
        use_reloader=False  # Disable reloader to prevent model reloading
    )
