"""
Optimized Intel Classroom Assistant Server

This optimized version includes:
- Efficient model loading and caching
- Memory management and monitoring
- Batched request processing
- Context window optimization
- Improved error handling and logging
"""
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
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import logging
import threading
import psutil
import os
from datetime import datetime
from optimized_model_manager import OptimizedModelManager, ModelConfig
from vosk import Model, KaldiRecognizer

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
        "origins": ["http://localhost:5173", "http://localhost:8080"],  # Add Node.js proxy server
        "origins": ["http://localhost:5173", "http://localhost:8080"],  # Add Node.js proxy server
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-Email", "X-User-ID", "X-User-Role"],  # Add proxy headers
        "expose_headers": ["Content-Type", "Content-Length"]
    }
})

# Global configuration
        "allow_headers": ["Content-Type", "X-User-Email", "X-User-ID", "X-User-Role"],  # Add proxy headers
        "expose_headers": ["Content-Type", "Content-Length"]
    }
})

# Global configuration
MODEL_CONFIG = ModelConfig(
    model_id="microsoft/phi-2",  # Change to a public model that doesn't require auth, old :openvino/phi-2-quant-int4
    model_id="microsoft/phi-2",  # Change to a public model that doesn't require auth, old :openvino/phi-2-quant-int4
    cache_dir="./model_cache",
    max_context_length=1024,
    sliding_window_size=512,
    batch_size=2,  # Smaller batch for real-time responses
    batch_size=2,  # Smaller batch for real-time responses
    max_queue_size=10,
    memory_threshold=95.0,
    enable_kv_cache=True
    memory_threshold=95.0,
    enable_kv_cache=True
)

# Initialize optimized model manager
model_manager = OptimizedModelManager(MODEL_CONFIG)

# Vosk setup with optimization
q = queue.Queue(maxsize=100)  # Limit queue size
rec = None  # Will be initialized in the initialize_server function

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
            if role not in self.history:
                self.history[role] = []
            
            self.history[role].append({
                "timestamp": datetime.now().isoformat(),
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
    current_time = time.time()
    if current_time - _context_cache_time > CONTEXT_CACHE_DURATION:
        _context_cache = f"""
Current date: {datetime.now().strftime('%Y-%m-%d')}
Current time: {datetime.now().strftime('%H:%M:%S')}
Current semester: Fall Term
Current school week: Week 12

You are the Intel Classroom Assistant, an AI designed to help students and teachers with educational content.
Your responses should be accurate, helpful, and appropriate for an educational setting.

IMPORTANT GUIDELINES:
- Always identify yourself as the Intel Classroom Assistant, not as any other AI.
- Focus only on answering the specific question asked.
- DO NOT make up additional questions to answer.
- DO NOT generate follow-up questions in your responses.
- DO NOT ask questions back to the user.
- Keep responses concise and to the point.
- Provide factually correct information only.
- If you don't know something, admit it rather than making up information.
- Never roleplay as a different entity or character.

You are the Intel Classroom Assistant, an AI designed to help students and teachers with educational content.
Your responses should be accurate, helpful, and appropriate for an educational setting.

IMPORTANT GUIDELINES:
- Always identify yourself as the Intel Classroom Assistant, not as any other AI.
- Focus only on answering the specific question asked.
- DO NOT make up additional questions to answer.
- DO NOT generate follow-up questions in your responses.
- DO NOT ask questions back to the user.
- Keep responses concise and to the point.
- Provide factually correct information only.
- If you don't know something, admit it rather than making up information.
- Never roleplay as a different entity or character.

Remember:
- Provide accurate, educational responses
- Do not display your thinking process, we need precise answers
- If you see that the last sentence is exceeding the word limit, don't leave it incomplete. Summarise and incorporate in the previous sentence itself. 
- No unfinished sentences
- Tailor explanations to the user's role and level
- Be concise and helpful
- Include relevant examples when appropriate
- Do not display your thinking process, we need precise answers
- If you see that the last sentence is exceeding the word limit, don't leave it incomplete. Summarise and incorporate in the previous sentence itself. 
- No unfinished sentences
- Tailor explanations to the user's role and level
- Be concise and helpful
- Include relevant examples when appropriate
"""
        _context_cache_time = current_time
        _context_cache_time = current_time
    
    return _context_cache
    return _context_cache

# Enhanced user credentials with role metadata
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
    artifacts = ["</think>", "<think>", "User:", "System:", "Question:"]
    for artifact in artifacts:
        response = response.replace(artifact, "").strip()
    
    # Remove any follow-up questions the AI might generate
    question_starters = ["Do you have", "Would you like", "What do you", "Can I help", "Is there anything", "Do you want", "Would you like"]
    for starter in question_starters:
        if starter in response:
            # Try to cut off at the point where the AI starts asking a question
            parts = response.split(starter)
            response = parts[0].strip()
    
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

# Initialize speech recognition
def initialize_speech_recognition():
    """Initialize Vosk speech recognition model."""
    global rec
    
    try:
        vosk_model_path = os.path.join("speech_models", "vosk-model-small-en-us-0.15")
        
        # Check if model exists
        if not os.path.exists(vosk_model_path):
            logger.warning(f"Speech model not found at {vosk_model_path}. Speech recognition will be disabled.")
            return False
            
        # Load speech recognition model
        logger.info(f"Loading speech recognition model from {vosk_model_path}")
        speech_model = Model(vosk_model_path)
        rec = KaldiRecognizer(speech_model, 16000)
        logger.info("Speech recognition model loaded successfully")
        return True
        
    except Exception as e:
        logger.error(f"Failed to initialize speech recognition: {str(e)}")
        rec = None
        return False

@app.route("/api/login", methods=["POST"])
def login():
    """
    Enhanced login with role-based configuration.
    
    Returns:
        JSON: Login response with user configuration
    """
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
        
        if not username or not password:
            return jsonify({"message": "Username and password are required"}), 400
        
        user = users.get(username)
        if user and user["password"] == password:
            # Include user-specific configuration
            response_data = {
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
            }
            logger.info(f"Successful login for user: {username} (role: {user['role']})")
            return jsonify(response_data)
        
        logger.warning(f"Failed login attempt for username: {username}")
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
        if not model_manager.is_model_loaded:
            logger.warning(f"[{request_id}] Model not loaded, using fallback response")
            # Generate fallback response
            cleaned_response = generate_fallback_response(question)
            generation_time = 0.01  # Minimal generation time for fallback
        else:
            # Check for identity questions that should always use fallback
            identity_questions = ["who are you", "who made you", "what are you", "your name", "who developed you"]
            if any(q in question.lower() for q in identity_questions):
                logger.info(f"[{request_id}] Identity question detected, using predefined response")
                cleaned_response = generate_fallback_response(question)
                generation_time = 0.01
            else:
                # Normal response generation
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

@app.route("/api/chat", methods=["GET", "POST"])
def chat():
    """
    Chat endpoint to process conversational requests.
    Handles both GET and POST methods for compatibility with the proxy.
    
    Returns:
        JSON: AI response similar to the query endpoint
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    start_time = time.time()
    
    # Get memory stats before processing
    mem_before = model_manager.get_memory_stats()
    logger.info(f"[{request_id}] Memory before: {mem_before['used_percent']:.1f}% used")
    
    try:
        # Handle both GET and POST methods
        if request.method == "GET":
            # For GET requests with no parameters, return a welcome message
            if not request.args:
                welcome_message = "Welcome to the Intel Classroom Assistant. Send a message to start chatting."
                return jsonify({
                    "message": welcome_message,
                    "answer": welcome_message,
                    "metadata": {
                        "request_id": request_id,
                        "status": "success"
                    }
                })
            
            # For GET requests with parameters
            question = request.args.get("message", "").strip()
            user_role = request.args.get("role", "student")
        else:  # POST method
            # Handle different content types
            content_type = request.headers.get('Content-Type', '')
            
            if 'application/json' in content_type:
                # JSON content type
                data = request.get_json(silent=True) or {}
            elif 'application/x-www-form-urlencoded' in content_type:
                # Form data
                data = request.form.to_dict() or {}
            else:
                # Try to parse as JSON anyway, with a fallback
                try:
                    data = request.get_json(silent=True) or {}
                    if not data:
                        # If parsing failed, try to get raw data and parse manually
                        raw_data = request.get_data(as_text=True)
                        if raw_data:
                            try:
                                data = json.loads(raw_data)
                            except json.JSONDecodeError:
                                # Last resort: try to parse form data
                                data = request.form.to_dict() or {}
                        else:
                            data = {}
                except Exception as e:
                    logger.warning(f"[{request_id}] Failed to parse request body: {str(e)}")
                    data = {}
            
            # Extract message and role from the data
            question = data.get("message", data.get("question", "")).strip()
            user_role = data.get("role", "student")
        
        # If no message is provided after all attempts, return an error
        if not question:
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
        if not model_manager.is_model_loaded:
            logger.warning(f"[{request_id}] Model not loaded, using fallback response")
            # Generate fallback response
            cleaned_response = generate_fallback_response(question)
            generation_time = 0.01  # Minimal generation time for fallback
        else:
            # Check for identity questions that should always use fallback
            identity_questions = ["who are you", "who made you", "what are you", "your name", "who developed you"]
            if any(q in question.lower() for q in identity_questions):
                logger.info(f"[{request_id}] Identity question detected, using predefined response")
                cleaned_response = generate_fallback_response(question)
                generation_time = 0.01
            else:
                # Normal response generation
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

@app.route("/api/chat", methods=["GET", "POST"])
def chat():
    """
    Chat endpoint to process conversational requests.
    Handles both GET and POST methods for compatibility with the proxy.
    
    Returns:
        JSON: AI response similar to the query endpoint
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    start_time = time.time()
    
    # Get memory stats before processing
    mem_before = model_manager.get_memory_stats()
    logger.info(f"[{request_id}] Memory before: {mem_before['used_percent']:.1f}% used")
    
    try:
        # Handle both GET and POST methods
        if request.method == "GET":
            # For GET requests with no parameters, return a welcome message
            if not request.args:
                welcome_message = "Welcome to the Intel Classroom Assistant. Send a message to start chatting."
                return jsonify({
                    "message": welcome_message,
                    "answer": welcome_message,
                    "metadata": {
                        "request_id": request_id,
                        "status": "success"
                    }
                })
            
            # For GET requests with parameters
            question = request.args.get("message", "").strip()
            user_role = request.args.get("role", "student")
        else:  # POST method
            # Handle different content types
            content_type = request.headers.get('Content-Type', '')
            
            if 'application/json' in content_type:
                # JSON content type
                data = request.get_json(silent=True) or {}
            elif 'application/x-www-form-urlencoded' in content_type:
                # Form data
                data = request.form.to_dict() or {}
            else:
                # Try to parse as JSON anyway, with a fallback
                try:
                    data = request.get_json(silent=True) or {}
                    if not data:
                        # If parsing failed, try to get raw data and parse manually
                        raw_data = request.get_data(as_text=True)
                        if raw_data:
                            try:
                                data = json.loads(raw_data)
                            except json.JSONDecodeError:
                                # Last resort: try to parse form data
                                data = request.form.to_dict() or {}
                        else:
                            data = {}
                except Exception as e:
                    logger.warning(f"[{request_id}] Failed to parse request body: {str(e)}")
                    data = {}
            
            # Extract message and role from the data
            question = data.get("message", data.get("question", "")).strip()
            user_role = data.get("role", "student")
        
        # If no message is provided after all attempts, return an error
        if not question:
            return jsonify({
                "error": "No message provided",
                "message": "Please provide a message to chat with the assistant.",
                "error": "No message provided",
                "message": "Please provide a message to chat with the assistant.",
                "metadata": {
                    "request_id": request_id,
                    "status": "error"
                }
            }), 400
        
        # Rest of the chat processing
        if user_role not in ["student", "teacher"]:
            logger.warning(f"[{request_id}] Invalid role: {user_role}, defaulting to student")
            user_role = "student"
        
        logger.info(f"[{request_id}] Processing chat for {user_role}: '{question[:50]}...'")
        
        # Get conversation context
        context_history = conversation_state.get_context(user_role)
                    "status": "error"
                }
            }), 400
        
        # Rest of the chat processing
        if user_role not in ["student", "teacher"]:
            logger.warning(f"[{request_id}] Invalid role: {user_role}, defaulting to student")
            user_role = "student"
        
        logger.info(f"[{request_id}] Processing chat for {user_role}: '{question[:50]}...'")
        
        # Get conversation context
        context_history = conversation_state.get_context(user_role)
        context_texts = [f"User: {msg['user']}\nAssistant: {msg['assistant']}" 
                        for msg in context_history[-3:]]  # Last 3 exchanges
        
        # Prepare input with dynamic context
        dynamic_context = get_current_dynamic_context()
        full_input = f"{dynamic_context}\n\nUser: {question}\n\nIntel Assistant:"
        
        # Generate response using optimized model manager
        logger.info(f"[{request_id}] Calling model manager for response generation")
        model_start_time = time.time()
        
        # Check if model is loaded before generating response
        if not model_manager.is_model_loaded:
            logger.warning(f"[{request_id}] Model not loaded, using fallback response")
            # Generate fallback response
            cleaned_response = generate_fallback_response(question)
            generation_time = 0.01  # Minimal generation time for fallback
                        for msg in context_history[-3:]]  # Last 3 exchanges
        
        # Prepare input with dynamic context
        dynamic_context = get_current_dynamic_context()
        full_input = f"{dynamic_context}\n\nUser: {question}\n\nIntel Assistant:"
        
        # Generate response using optimized model manager
        logger.info(f"[{request_id}] Calling model manager for response generation")
        model_start_time = time.time()
        
        # Check if model is loaded before generating response
        if not model_manager.is_model_loaded:
            logger.warning(f"[{request_id}] Model not loaded, using fallback response")
            # Generate fallback response
            cleaned_response = generate_fallback_response(question)
            generation_time = 0.01  # Minimal generation time for fallback
        else:
            # Check for identity questions that should always use fallback
            identity_questions = ["who are you", "who made you", "what are you", "your name", "who developed you"]
            if any(q in question.lower() for q in identity_questions):
                logger.info(f"[{request_id}] Identity question detected, using predefined response")
                cleaned_response = generate_fallback_response(question)
                generation_time = 0.01
            else:
                # Normal response generation
                response, generation_time = model_manager.generate_response_optimized(
                    input_text=full_input,
                    role=user_role,
                    conversation_history=context_texts
                )
                # Clean up response
                cleaned_response = extract_assistant_response(response)
        
        model_time = time.time() - model_start_time
        logger.info(f"[{request_id}] Response generated in {model_time:.2f}s")
        logger.info(f"[{request_id}] Response length: {len(cleaned_response)} chars")
        
        # Update conversation state
        conversation_state.add_message(user_role, question, cleaned_response)
        
        # Get memory stats after processing
        mem_after = model_manager.get_memory_stats()
        total_time = time.time() - start_time
        
        # Add more fields for Node.js proxy compatibility
        response_data = {
            "answer": cleaned_response,
            "message": cleaned_response,  # Duplicate for compatibility
            "latency": round(total_time, 3),  # Add latency field for proxy
            "chatCategory": "general",    # Default category for MongoDB storage
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
        
        logger.info(f"[{request_id}] Chat response generated successfully in {total_time:.2f}s")
        return jsonify(response_data)
        
            # Check for identity questions that should always use fallback
            identity_questions = ["who are you", "who made you", "what are you", "your name", "who developed you"]
            if any(q in question.lower() for q in identity_questions):
                logger.info(f"[{request_id}] Identity question detected, using predefined response")
                cleaned_response = generate_fallback_response(question)
                generation_time = 0.01
            else:
                # Normal response generation
                response, generation_time = model_manager.generate_response_optimized(
                    input_text=full_input,
                    role=user_role,
                    conversation_history=context_texts
                )
                # Clean up response
                cleaned_response = extract_assistant_response(response)
        
        model_time = time.time() - model_start_time
        logger.info(f"[{request_id}] Response generated in {model_time:.2f}s")
        logger.info(f"[{request_id}] Response length: {len(cleaned_response)} chars")
        
        # Update conversation state
        conversation_state.add_message(user_role, question, cleaned_response)
        
        # Get memory stats after processing
        mem_after = model_manager.get_memory_stats()
        total_time = time.time() - start_time
        
        # Add more fields for Node.js proxy compatibility
        response_data = {
            "answer": cleaned_response,
            "message": cleaned_response,  # Duplicate for compatibility
            "latency": round(total_time, 3),  # Add latency field for proxy
            "chatCategory": "general",    # Default category for MongoDB storage
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
        
        logger.info(f"[{request_id}] Chat response generated successfully in {total_time:.2f}s")
        return jsonify(response_data)
        
    except Exception as e:
        error_time = time.time() - start_time
        logger.error(f"[{request_id}] Chat processing error: {str(e)}")
        error_time = time.time() - start_time
        logger.error(f"[{request_id}] Chat processing error: {str(e)}")
        return jsonify({
            "error": "Failed to process chat request",
            "message": "An error occurred while processing your request",
            "metadata": {
                "request_id": request_id,
                "error_time": round(error_time, 3),
                "error_type": type(e).__name__
            }
            "error": "Failed to process chat request",
            "message": "An error occurred while processing your request",
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
            "batch_size": MODEL_CONFIG.batch_size,
            "memory_threshold": MODEL_CONFIG.memory_threshold
        },
        "conversation_stats": {
            role: len(history) for role, history in conversation_state.history.items()
        }
    })

@app.route("/api/debug", methods=["GET"])
def debug_info():
    """
    Debug endpoint for troubleshooting.
    
    Returns:
        JSON: System and request information for debugging
    """
    # Collect relevant debug information
    debug_data = {
        "server": {
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(time.time() - start_time) if 'start_time' in globals() else 0,
            "python_version": os.sys.version,
            "platform": os.sys.platform
        },
        "model": {
            "model_id": MODEL_CONFIG.model_id,
            "is_loaded": model_manager.is_model_loaded,
            "max_context_length": MODEL_CONFIG.max_context_length,
            "memory": model_manager.get_memory_stats()
        },
        "request": {
            "headers": dict(request.headers),
            "remote_addr": request.remote_addr,
            "method": request.method,
            "content_type": request.content_type
        },
        "conversation_state": {
            "roles": list(conversation_state.history.keys()),
            "history_lengths": {role: len(msgs) for role, msgs in conversation_state.history.items()}
        }
    }
    
    return jsonify(debug_data)

# Add this function for mock responses when model is not available
def generate_fallback_response(question: str) -> str:
    """Generate a fallback response when the model is not available."""
    fallback_responses = {
        # Identity questions
        "who are you": "I am the Intel Classroom Assistant, an educational AI developed to help students and teachers with academic questions.",
        "who made you": "I was created by the Intel Classroom Assistant team as an educational AI assistant.",
        "who developed you": "I was developed by the Intel Classroom Assistant team specifically for educational purposes.",
        "what are you": "I am an AI educational assistant designed to provide helpful, accurate information for classroom use.",
        "your name": "I am the Intel Classroom Assistant, your educational AI companion.",
        
        # Technical questions
        "what is merge sort": "Merge sort is a sorting algorithm that uses the divide and conquer approach. It divides the input array into two halves, recursively sorts them, and then merges the sorted halves to produce the final sorted output. It has a time complexity of O(n log n).",
        "what is recursion": "Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem. It includes a base case to prevent infinite recursion and is commonly used in algorithms like factorial calculation, tree traversal, and divide-and-conquer strategies.",
        
        # Default response
        "default": "I'm sorry, I can't provide a detailed response at the moment as my language model is currently unavailable. The system is operating in fallback mode. Please try again later or contact support if this issue persists."
    }
    
    # Convert question to lowercase for case-insensitive matching
    question_lower = question.lower()
    
    # Check if question contains any of the fallback response keys
    for key, response in fallback_responses.items():
        if key in question_lower:
            return response
    
    # Return default response
    return fallback_responses["default"]

# Model initialization with startup optimization
@app.route("/api/debug", methods=["GET"])
def debug_info():
    """
    Debug endpoint for troubleshooting.
    
    Returns:
        JSON: System and request information for debugging
    """
    # Collect relevant debug information
    debug_data = {
        "server": {
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(time.time() - start_time) if 'start_time' in globals() else 0,
            "python_version": os.sys.version,
            "platform": os.sys.platform
        },
        "model": {
            "model_id": MODEL_CONFIG.model_id,
            "is_loaded": model_manager.is_model_loaded,
            "max_context_length": MODEL_CONFIG.max_context_length,
            "memory": model_manager.get_memory_stats()
        },
        "request": {
            "headers": dict(request.headers),
            "remote_addr": request.remote_addr,
            "method": request.method,
            "content_type": request.content_type
        },
        "conversation_state": {
            "roles": list(conversation_state.history.keys()),
            "history_lengths": {role: len(msgs) for role, msgs in conversation_state.history.items()}
        }
    }
    
    return jsonify(debug_data)

# Add this function for mock responses when model is not available
def generate_fallback_response(question: str) -> str:
    """Generate a fallback response when the model is not available."""
    fallback_responses = {
        # Identity questions
        "who are you": "I am the Intel Classroom Assistant, an educational AI developed to help students and teachers with academic questions.",
        "who made you": "I was created by the Intel Classroom Assistant team as an educational AI assistant.",
        "who developed you": "I was developed by the Intel Classroom Assistant team specifically for educational purposes.",
        "what are you": "I am an AI educational assistant designed to provide helpful, accurate information for classroom use.",
        "your name": "I am the Intel Classroom Assistant, your educational AI companion.",
        
        # Technical questions
        "what is merge sort": "Merge sort is a sorting algorithm that uses the divide and conquer approach. It divides the input array into two halves, recursively sorts them, and then merges the sorted halves to produce the final sorted output. It has a time complexity of O(n log n).",
        "what is recursion": "Recursion is a programming technique where a function calls itself to solve smaller instances of the same problem. It includes a base case to prevent infinite recursion and is commonly used in algorithms like factorial calculation, tree traversal, and divide-and-conquer strategies.",
        
        # Default response
        "default": "I'm sorry, I can't provide a detailed response at the moment as my language model is currently unavailable. The system is operating in fallback mode. Please try again later or contact support if this issue persists."
    }
    
    # Convert question to lowercase for case-insensitive matching
    question_lower = question.lower()
    
    # Check if question contains any of the fallback response keys
    for key, response in fallback_responses.items():
        if key in question_lower:
            return response
    
    # Return default response
    return fallback_responses["default"]

# Model initialization with startup optimization
def initialize_server():
    """Initialize server with optimized model loading and speech recognition."""
    """Initialize server with optimized model loading and speech recognition."""
    global start_time
    start_time = time.time()
    
    logger.info("🚀 Starting Intel Classroom Assistant Server (Optimized)")
    logger.info(f"Model: {MODEL_CONFIG.model_id}")
    logger.info(f"Cache directory: {MODEL_CONFIG.cache_dir}")
    logger.info("🚀 Starting Intel Classroom Assistant Server (Optimized)")
    logger.info(f"Model: {MODEL_CONFIG.model_id}")
    logger.info(f"Cache directory: {MODEL_CONFIG.cache_dir}")
    
    # Load model with caching
    try:
        if model_manager.load_model_cached():
            logger.info("Model loaded successfully")
            
            # Warm up model for better first-request performance
            try:
                model_manager.warm_up_model()
                logger.info("Model warm-up completed")
            except Exception as e:
                logger.warning(f"Model warm-up failed: {str(e)}")
    # Load model with caching
    try:
        if model_manager.load_model_cached():
            logger.info("Model loaded successfully")
            
            # Warm up model for better first-request performance
            try:
                model_manager.warm_up_model()
                logger.info("Model warm-up completed")
            except Exception as e:
                logger.warning(f"Model warm-up failed: {str(e)}")
        else:
            logger.error("Failed to load model - Server will operate in fallback mode")
            logger.info("Fallback mode: Basic responses will be provided")
    except Exception as e:
        logger.error(f"Critical error during model loading: {str(e)}")
        logger.info("Server will operate in fallback mode")
    
    # Initialize speech recognition
    speech_rec_status = initialize_speech_recognition()
    logger.info(f"Speech recognition initialization: {'Success' if speech_rec_status else 'Failed'}")
    
    # Add signal handlers for graceful shutdown
    try:
        import signal
        
        def signal_handler(sig, frame):
            logger.info(f"Received signal {sig}, shutting down gracefully...")
            # Clean up resources if needed
            try:
                if model_manager.is_model_loaded:
                    logger.info("Cleaning up model resources")
                    # If you have an unload method:
                    # model_manager.unload_model()
            except Exception as e:
                logger.error(f"Error during cleanup: {str(e)}")
            os._exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        logger.info("Signal handlers registered for graceful shutdown")
    except Exception as e:
        logger.warning(f"Failed to set up signal handlers: {str(e)}")
    
    logger.info("Server initialization complete")

            logger.error("Failed to load model - Server will operate in fallback mode")
            logger.info("Fallback mode: Basic responses will be provided")
    except Exception as e:
        logger.error(f"Critical error during model loading: {str(e)}")
        logger.info("Server will operate in fallback mode")
    
    # Initialize speech recognition
    speech_rec_status = initialize_speech_recognition()
    logger.info(f"Speech recognition initialization: {'Success' if speech_rec_status else 'Failed'}")
    
    # Add signal handlers for graceful shutdown
    try:
        import signal
        
        def signal_handler(sig, frame):
            logger.info(f"Received signal {sig}, shutting down gracefully...")
            # Clean up resources if needed
            try:
                if model_manager.is_model_loaded:
                    logger.info("Cleaning up model resources")
                    # If you have an unload method:
                    # model_manager.unload_model()
            except Exception as e:
                logger.error(f"Error during cleanup: {str(e)}")
            os._exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        logger.info("Signal handlers registered for graceful shutdown")
    except Exception as e:
        logger.warning(f"Failed to set up signal handlers: {str(e)}")
    
    logger.info("Server initialization complete")

if __name__ == "__main__":
    initialize_server()
    
    # Run with optimized settings
    # Run with optimized settings
    app.run(
        debug=True,  # Enable debug for development
        debug=True,  # Enable debug for development
        port=8000,
        host='127.0.0.1',
        threaded=True,  # Enable threading for better concurrency
        threaded=True,  # Enable threading for better concurrency
    )