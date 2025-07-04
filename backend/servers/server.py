import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import gc
import logging
import threading
import psutil
from datetime import datetime
import traceback
from logging.handlers import RotatingFileHandler

# Configure improved logging with filtering
log_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Set up log format and handlers
LOG_FORMAT = '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
LOG_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Create a custom filter to reduce repetitive or low-value logs
class LogFilter(logging.Filter):
    def __init__(self):
        super().__init__()
        self.last_messages = {}
        self.repeat_threshold = 5  # Only show repeated messages after this many occurrences
        self.repeat_counts = {}
        
    def filter(self, record):
        # Filter out certain verbose OpenVINO messages
        if any(msg in record.getMessage() for msg in [
            "Setting `pad_token_id`", 
            "attention mask is not set",
            "The attention mask and the pad token id were not set"
        ]):
            return False
        
        # Handle repeated messages
        message = record.getMessage()
        if message in self.last_messages:
            self.repeat_counts[message] = self.repeat_counts.get(message, 0) + 1
            if self.repeat_counts[message] < self.repeat_threshold:
                return False
            else:
                self.repeat_counts[message] = 0
                record.getMessage = lambda: f"{message} (repeated {self.repeat_threshold} times)"
        
        self.last_messages[message] = time.time()
        return True

# Create console handler with filter
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=LOG_DATE_FORMAT))
console_handler.addFilter(LogFilter())
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

# Wrap Vosk import in try-except to handle import errors gracefully
try:
    from vosk import Model, KaldiRecognizer
    VOSK_AVAILABLE = True
except ImportError:
    logger.warning("Vosk not available. Speech recognition will be disabled.")
    VOSK_AVAILABLE = False

from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # Configure CORS to allow requests from any origin


# Configure Vosk model path - allow environment variable override
VOSK_MODEL_PATH = os.environ.get("VOSK_MODEL_PATH", "vosk-model-small-en-us-0.15")

try:
    if VOSK_AVAILABLE:
        logger.info(f"Loading Vosk model from: {VOSK_MODEL_PATH}")
        if os.path.exists(VOSK_MODEL_PATH):
            asr_model = Model(VOSK_MODEL_PATH)
            rec = KaldiRecognizer(asr_model, 16000)
            logger.info("Vosk model loaded successfully")
        else:
            logger.error(f"Vosk model not found at: {VOSK_MODEL_PATH}")
            VOSK_AVAILABLE = False
except Exception as e:
    logger.error(f"Error loading Vosk model: {str(e)}")
    logger.debug(traceback.format_exc())  # Use debug level for stack traces
    VOSK_AVAILABLE = False

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

def get_current_dynamic_context():
    """
    Generate dynamic context with current date and time information.
    
    Returns:
        str: Formatted context string with current date/time
    """
    return DYNAMIC_CONTEXT_TEMPLATE.format(
        date=datetime.now().strftime('%Y-%m-%d'),
        time=datetime.now().strftime('%H:%M:%S')
    )

# Model storage for conversation history
class ConversationState:
    """
    Stores conversation history and state.
    
    Attributes:
        history (list): List of conversation messages
    """
    def __init__(self):
        self.history = []

# Global conversation state
conversation_state = ConversationState()

# Role-specific system prompts
STUDENT_SYSTEM_PROMPT = """You are EduAI, a knowledgeable and friendly classroom assistant designed to help students with academic questions.
You accept both text and voice input and provide accurate, concise answers that are easy to understand.
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
You understand both text and voice input and provide practical, accurate, and actionable responses.
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

# Model inference lock to prevent concurrent requests
model_lock = threading.RLock()

# LLM setup with reduced logging
try:
    model_id = "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov" 
    logger.info(f"Loading model: {model_id}")
    
    # Temporarily suppress transformer warnings during model loading
    transformers_logger = logging.getLogger("transformers")
    original_level = transformers_logger.level
    transformers_logger.setLevel(logging.ERROR)
    
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = OVModelForCausalLM.from_pretrained(model_id)
    
    # Restore original logging level
    transformers_logger.setLevel(original_level)
    
    # Store tokenized system prompts for different roles
    logger.info("Preparing system prompts")
    student_prompt_ids = tokenizer(STUDENT_SYSTEM_PROMPT, return_tensors="pt").input_ids
    teacher_prompt_ids = tokenizer(TEACHER_SYSTEM_PROMPT, return_tensors="pt").input_ids
    
    # Store them in a dictionary for easy access
    system_prompt_ids = {
        "student": student_prompt_ids,
        "teacher": teacher_prompt_ids
    }
    
    # Initialize the model with the base (student) system prompt as default
    logger.info("Initializing model with system prompt")
    with model_lock:
        _ = model.generate(student_prompt_ids, max_length=len(student_prompt_ids[0]) + 1)
    logger.info("Model ready for inference")
    model_ready = True
except Exception as e:
    logger.error(f"Error loading the model: {str(e)}")
    logger.debug(traceback.format_exc())  # Use debug level for stack traces
    model_ready = False

def extract_assistant_response(full_text):
    """
    Extract only the assistant's response from the full model output.
    
    Args:
        full_text (str): Complete model output text
    
    Returns:
        str: Cleaned assistant response text
    """
    # Look for the assistant's response after "Intel Assistant:" marker
    if "Intel Assistant:" in full_text:
        response = full_text.split("Intel Assistant:", 1)[1].strip()
        
        # Remove any </think> tokens or other debugging artifacts
        if "</think>" in response:
            response = response.split("</think>", 1)[1].strip()
        
        # Remove any blank lines at the beginning
        response = response.lstrip("\n")
          # Remove any system prompt parts that might have leaked into the response
        system_prompt_fragments = [
            "You are a helpful classroom assistant",
            "Your purpose is to help students learn",
            "Your purpose is to help teachers improve",
            "Current date:", 
            "Current time:", 
            "Current semester:",
            "Current school week:"
        ]
        
        for fragment in system_prompt_fragments:
            if response.startswith(fragment):
                # Try to find the next paragraph after the system prompt fragment
                parts = response.split("\n\n", 1)
                if len(parts) > 1:
                    response = parts[1].strip()
                    break
        
        return response
    
    # Fallback - if we can't find the marker, return a cleaned version of the text
    # Remove any common markers and debugging artifacts
    cleaned = full_text
    for marker in ["User:", "Intel Assistant:", "</think>", "<think>", "system:", "assistant:"]:
        if marker.lower() in cleaned.lower():
            parts = cleaned.lower().split(marker.lower(), 1)
            if len(parts) > 1:
                cleaned = parts[1].strip()
    
    return cleaned

# Audio callback for Vosk
def audio_callback(indata, frames, time_info, status):
    """
    Audio callback function for Vosk speech recognition.
    
    Args:
        indata: Input audio data
        frames: Number of frames
        time_info: Time information
        status: Status information
    """
    q.put(bytes(indata))

@app.route("/listen", methods=["GET"])
def listen():
    """
    Listen for speech input and return transcribed text.
    
    Returns:
        JSON: Transcribed speech text or error message
    """
    # Check if Vosk is available
    if not VOSK_AVAILABLE or rec is None:
        logger.error("Speech recognition requested but Vosk is not available")
        return jsonify({
            "error": "Speech recognition is not available",
            "message": "The speech recognition system is not properly configured."
        }), 503  # Service Unavailable
    
    request_id = datetime.now().strftime("%Y%m%d%H%M%S")
    logger.info(f"[{request_id}] Speech recognition started")
    recognized_text = ""
    last_speech_time = time.time()
    timeout_seconds = 10

    try:
        with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16',
                            channels=1, callback=audio_callback):
            while True:
                if not q.empty():
                    data = q.get()
                    if rec.AcceptWaveform(data):
                        result = rec.Result()
                        text = json.loads(result).get("text", "")
                        if text.strip():
                            recognized_text = text
                            logger.info(f"[{request_id}] Speech recognized: '{text}'")
                            break
                    else:
                        partial = json.loads(rec.PartialResult()).get("partial", "")
                        if partial.strip():
                            last_speech_time = time.time()
                            logger.debug(f"[{request_id}] Partial recognition: '{partial}'")

                if time.time() - last_speech_time > timeout_seconds:
                    logger.warning(f"[{request_id}] Timeout - no speech detected after {timeout_seconds} seconds")
                    break
    except Exception as e:
        logger.error(f"[{request_id}] Error during speech recognition: {str(e)}")
        return jsonify({
            "error": "Speech recognition failed",
            "message": str(e)
        }), 500

    logger.info(f"[{request_id}] Sending response back to frontend: '{recognized_text}'")
    return jsonify({"transcript": recognized_text})

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
    Process user queries using LLM and return AI-generated responses.
    Designed to match the Node.js API structure.
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
        # Add subject context to enhance the response
        context_and_question = f"{get_current_dynamic_context()}\n\nSubject: {subject}\nUser: {question}\n\nIntel Assistant:"
        
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

@app.route("/api/listen", methods=["GET"])
def api_listen():
    """
    Alias of the listen function with /api prefix for compatibility.
    """
    return listen()

@app.route("/api/health", methods=["GET"])
def health_check():
    """
    Check the health status of the server and its components.
    
    Returns:
        JSON: Health status information
    """
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "components": {
            "server": "up",
            "speech_recognition": "up" if VOSK_AVAILABLE and rec is not None else "down",
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