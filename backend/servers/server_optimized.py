"""
Intel Classroom Assistant Server - Optimized Version

A Flask-based server providing AI-powered chat functionality for educational purposes.
Features optimized model management, conversation state tracking, and memory monitoring.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import logging
import threading
import os
import json
from datetime import datetime
from optimized_model_manager import OptimizedModelManager, ModelConfig

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:5173", "http://localhost:8080"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "X-User-Role"],
        "expose_headers": ["Content-Type", "Content-Length"]
    }
})

MODEL_CONFIG = ModelConfig(
    model_id="microsoft/phi-2",
    cache_dir="./model_cache",
    max_context_length=1024,
    sliding_window_size=512,
    batch_size=2,
    max_queue_size=10,
    memory_threshold=95.0,
    enable_kv_cache=True
)

model_manager = OptimizedModelManager(MODEL_CONFIG)

class OptimizedConversationState:
    """
    Manages conversation history with automatic pruning for memory efficiency.
    
    Stores conversation exchanges by user role and automatically limits history
    to prevent memory bloat while maintaining context for AI responses.
    """
    
    def __init__(self, max_history: int = 10):
        """
        Initialize conversation state manager.
        
        Args:
            max_history (int): Maximum number of conversation exchanges to keep per role
        """
        self.history = {}
        self.max_history = max_history
        self.lock = threading.Lock()
    
    def add_message(self, role: str, user_input: str, ai_response: str):
        """
        Add a new conversation exchange to the history.
        
        Args:
            role (str): User role ('student' or 'teacher')
            user_input (str): Original user message
            ai_response (str): AI assistant response
        """
        with self.lock:
            if role not in self.history:
                self.history[role] = []
            self.history[role].append({
                "timestamp": datetime.now().isoformat(),
                "user": user_input,
                "assistant": ai_response
            })
            if len(self.history[role]) > self.max_history:
                self.history[role] = self.history[role][-self.max_history:]
    
    def get_context(self, role: str) -> list:
        """
        Retrieve conversation history for a specific role.
        
        Args:
            role (str): User role to get history for
            
        Returns:
            list: List of conversation exchanges with timestamps
        """
        with self.lock:
            return self.history.get(role, [])
    
    def clear_history(self, role: str = None):
        """
        Clear conversation history for specific role or all roles.
        
        Args:
            role (str, optional): Specific role to clear. If None, clears all history
        """
        with self.lock:
            if role:
                self.history.pop(role, None)
            else:
                self.history.clear()

conversation_state = OptimizedConversationState(max_history=8)

_context_cache = {}
_context_cache_time = 0
CONTEXT_CACHE_DURATION = 300

def get_current_dynamic_context():
    """
    Generate dynamic context with current date/time and system instructions.
    
    Uses caching to avoid regenerating context on every request for performance.
    Cache expires after CONTEXT_CACHE_DURATION seconds.
    
    Returns:
        str: Formatted context string with current datetime and system instructions
    """
    global _context_cache, _context_cache_time
    current_time = time.time()
    if current_time - _context_cache_time > CONTEXT_CACHE_DURATION:
        _context_cache = f"""
Current date: {datetime.now().strftime('%Y-%m-%d')}
Current time: {datetime.now().strftime('%H:%M:%S')}

You are the Intel Classroom Assistant, an AI designed to help students and teachers with educational content.
Your responses should be accurate, helpful, and appropriate for an educational setting.

Guidelines:
- Always identify yourself as the Intel Classroom Assistant
- Focus only on answering the specific question asked
- Keep responses concise and to the point
- Provide factually correct information only
- If you don't know something, admit it rather than making up information
- Tailor explanations to the user's role and level
- Be concise and helpful
"""
        _context_cache_time = current_time
    return _context_cache

ROLE_CONFIG = {
    "student": {
        "context_limit": 512,
        "response_limit": 256
    },
    "teacher": {
        "context_limit": 1024,
        "response_limit": 512
    },
    "default": {
        "context_limit": 512,
        "response_limit": 256
    }
}

def extract_assistant_response(full_text: str) -> str:
    """
    Extract clean assistant response from model output text.
    
    Removes system markers, artifacts, and trailing questions to provide
    clean, user-focused responses. Truncates to 2000 characters max.
    
    Args:
        full_text (str): Raw model output text
        
    Returns:
        str: Cleaned response text suitable for user display
    """
    markers = ["Intel Assistant:", "Assistant:", "Response:"]
    for marker in markers:
        if marker in full_text:
            response = full_text.split(marker, 1)[1].strip()
            break
    else:
        response = full_text.strip()
    
    artifacts = ["</think>", "<think>", "User:", "System:", "Question:"]
    for artifact in artifacts:
        response = response.replace(artifact, "").strip()
    
    question_starters = ["Do you have", "Would you like", "What do you", "Can I help", "Is there anything", "Do you want"]
    for starter in question_starters:
        if starter in response:
            parts = response.split(starter)
            response = parts[0].strip()
    
    response = response.strip()[:2000]
    return response or "I apologize, but I couldn't generate a proper response. Please try again."

def get_role_config(role: str) -> dict:
    """
    Get configuration settings for a specific user role.
    
    Args:
        role (str): User role ('student', 'teacher', or other)
        
    Returns:
        dict: Configuration with context_limit and response_limit
    """
    return ROLE_CONFIG.get(role, ROLE_CONFIG["default"])

@app.route("/api/chat", methods=["GET", "POST"])
def chat():
    """
    Main chat endpoint for AI assistant interactions.
    
    Handles both GET and POST requests with text messages, processes them
    through the AI model, manages conversation history, and returns formatted
    responses with metadata including performance metrics.
    
    Request formats:
        GET: ?message=text&role=student|teacher
        POST: {"message": "text", "role": "student|teacher"}
    
    Returns:
        JSON response with:
        - answer/message: AI response text
        - latency: Response time in seconds
        - metadata: Request ID, timing, memory usage, etc.
    """
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    start_time = time.time()
    mem_before = model_manager.get_memory_stats()
    
    try:
        if request.method == "GET":
            if not request.args:
                welcome_message = "Welcome to the Intel Classroom Assistant. Send a message to start chatting."
                return jsonify({
                    "message": welcome_message,
                    "answer": welcome_message,
                    "metadata": {"request_id": request_id, "status": "success"}
                })
            question = request.args.get("message", "").strip()
            user_role = request.args.get("role", "student")
        else:
            data = request.get_json(silent=True) or {}
            question = data.get("message", data.get("question", "")).strip()
            user_role = data.get("role", "student")
        
        if not question:
            return jsonify({
                "error": "No message provided",
                "message": "Please provide a message to chat with the assistant.",
                "metadata": {"request_id": request_id, "status": "error"}
            }), 400
        
        if user_role not in ["student", "teacher"]:
            user_role = "student"
        
        logger.info(f"[{request_id}] Processing chat for {user_role}: '{question[:50]}...'")
        
        context_history = conversation_state.get_context(user_role)
        context_texts = [f"User: {msg['user']}\nAssistant: {msg['assistant']}" 
                        for msg in context_history[-3:]]
        
        dynamic_context = get_current_dynamic_context()
        full_input = f"{dynamic_context}\n\nUser: {question}\n\nIntel Assistant:"
        
        if not model_manager.is_model_loaded:
            cleaned_response = generate_fallback_response(question)
            generation_time = 0.01
        else:
            identity_questions = ["who are you", "who made you", "what are you", "your name", "who developed you"]
            if any(q in question.lower() for q in identity_questions):
                cleaned_response = generate_fallback_response(question)
                generation_time = 0.01
            else:
                response, generation_time = model_manager.generate_response_optimized(
                    input_text=full_input,
                    role=user_role,
                    conversation_history=context_texts
                )
                cleaned_response = extract_assistant_response(response)
        
        conversation_state.add_message(user_role, question, cleaned_response)
        
        mem_after = model_manager.get_memory_stats()
        total_time = time.time() - start_time
        
        response_data = {
            "answer": cleaned_response,
            "message": cleaned_response,
            "latency": round(total_time, 3),
            "chatCategory": "general",
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
        return jsonify({
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
    Health check endpoint for monitoring server status.
    
    Returns:
        JSON response with:
        - status: 'healthy' if model loaded, 'degraded' otherwise
        - service: Service name identifier
        - timestamp: Current server time
        - model_loaded: Boolean model status
        - memory: Current memory usage statistics
        - uptime_seconds: Server uptime
    """
    memory_stats = model_manager.get_memory_stats()
    return jsonify({
        "status": "healthy" if model_manager.is_model_loaded else "degraded",
        "service": "Intel Classroom Assistant AI Service",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": model_manager.is_model_loaded,
        "memory": memory_stats,
        "uptime_seconds": int(time.time() - start_time) if 'start_time' in globals() else 0
    })

@app.route("/api/stats", methods=["GET"])
def get_stats():
    """
    Detailed statistics endpoint for performance monitoring.
    
    Returns:
        JSON response with:
        - memory: Current memory usage statistics
        - model_config: AI model configuration parameters
        - conversation_stats: Number of conversations per role
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

def generate_fallback_response(question: str) -> str:
    """
    Generate predefined responses when AI model is unavailable.
    
    Provides helpful responses for common questions and identity queries
    when the main AI model fails to load or is temporarily unavailable.
    
    Args:
        question (str): User's input question
        
    Returns:
        str: Appropriate fallback response text
    """
    fallback_responses = {
        "who are you": "I am the Intel Classroom Assistant, an educational AI developed to help students and teachers with academic questions.",
        "who made you": "I was created by the Intel Classroom Assistant team as an educational AI assistant.",
        "who developed you": "I was developed by the Intel Classroom Assistant team specifically for educational purposes.",
        "what are you": "I am an AI educational assistant designed to provide helpful, accurate information for classroom use.",
        "your name": "I am the Intel Classroom Assistant, your educational AI companion.",
        "what is merge sort": "Merge sort is a sorting algorithm that uses the divide and conquer approach. It divides the input array into two halves, recursively sorts them, and then merges the sorted halves to produce the final sorted output. It has a time complexity of O(n log n).",
        "default": "I'm sorry, I can't provide a detailed response at the moment as my language model is currently unavailable. The system is operating in fallback mode. Please try again later or contact support if this issue persists."
    }
    
    question_lower = question.lower()
    for key, response in fallback_responses.items():
        if key in question_lower:
            return response
    return fallback_responses["default"]

def initialize_server():
    """
    Initialize the server by loading and warming up the AI model.
    
    Attempts to load the configured AI model, run warm-up inference,
    and set up global server state. Falls back to degraded mode if
    model loading fails, allowing basic functionality to continue.
    
    Sets global start_time for uptime tracking.
    """
    global start_time
    start_time = time.time()
    
    logger.info("Starting Intel Classroom Assistant Server")
    logger.info(f"Model: {MODEL_CONFIG.model_id}")
    logger.info(f"Cache directory: {MODEL_CONFIG.cache_dir}")
    
    try:
        if model_manager.load_model_cached():
            logger.info("Model loaded successfully")
            try:
                model_manager.warm_up_model()
                logger.info("Model warm-up completed")
            except Exception as e:
                logger.warning(f"Model warm-up failed: {str(e)}")
        else:
            logger.error("Failed to load model - Server will operate in fallback mode")
    except Exception as e:
        logger.error(f"Critical error during model loading: {str(e)}")
        logger.info("Server will operate in fallback mode")
    
    logger.info("Server initialization complete")

if __name__ == "__main__":
    initialize_server()
    app.run(debug=True, port=8000, host='127.0.0.1', threaded=True)