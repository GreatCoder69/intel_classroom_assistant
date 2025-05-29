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
from vosk import Model, KaldiRecognizer
from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow requests from your React frontend

# Vosk setup
q = queue.Queue()
asr_model = Model("vosk-model-small-en-us-0.15")
rec = KaldiRecognizer(asr_model, 16000)

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

# Function to get updated dynamic context with current time/date
def get_current_dynamic_context():
    return DYNAMIC_CONTEXT_TEMPLATE.format(
        date=datetime.now().strftime('%Y-%m-%d'),
        time=datetime.now().strftime('%H:%M:%S')
    )

# Model storage for conversation history
class ConversationState:
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
- Do not use filler phrases like “I think” or “I believe”
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

# LLM setup
try:
    model_id = "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov" 
    logger.info(f"Loading model: {model_id}")
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model = OVModelForCausalLM.from_pretrained(model_id)
    
    # Store tokenized system prompts for different roles
    logger.info("Tokenizing role-specific system prompts")
    student_prompt_ids = tokenizer(STUDENT_SYSTEM_PROMPT, return_tensors="pt").input_ids
    teacher_prompt_ids = tokenizer(TEACHER_SYSTEM_PROMPT, return_tensors="pt").input_ids
    
    # Store them in a dictionary for easy access
    system_prompt_ids = {
        "student": student_prompt_ids,
        "teacher": teacher_prompt_ids
    }
    
    # Initialize the model with the base (student) system prompt as default
    logger.info("Initializing model with default system prompt")
    _ = model.generate(student_prompt_ids, max_length=len(student_prompt_ids[0]) + 1)
    logger.info("Model initialized with system prompt")
    
    logger.info(f"Model loaded successfully and initialized with system prompts: {model_id}")
except Exception as e:
    logger.error(f"Error loading the model: {str(e)}")

def extract_assistant_response(full_text):
    """Extract only the assistant's response from the full model output."""
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
    q.put(bytes(indata))

# User credentials (in a real application, this would be in a database with hashed passwords)
users = {
    "student": {"password": "student", "role": "student"},
    "teacher": {"password": "teacher", "role": "teacher"}
}

@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"message": "Username and password are required"}), 400
    
    user = users.get(username)
    if user and user["password"] == password:
        # In a real app, you would create a JWT or session token here
        return jsonify({
            "username": username,
            "role": user["role"],
            "message": "Login successful"
        })
    
    return jsonify({"message": "Invalid credentials"}), 401

@app.route("/listen", methods=["GET"])
def listen():
    request_id = datetime.now().strftime("%Y%m%d%H%M%S")
    logger.info(f"[{request_id}] Speech recognition started")
    recognized_text = ""
    last_speech_time = time.time()
    timeout_seconds = 10

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

    logger.info(f"[{request_id}] Sending response back to frontend: '{recognized_text}'")
    return jsonify({"transcript": recognized_text})

class TimeoutException(Exception):
    pass

def timeout_handler(signum, frame):
    raise TimeoutException("LLM generation timed out")

@app.route("/query", methods=["POST"])
def query():
    request_id = datetime.now().strftime("%Y%m%d%H%M%S")
    
    # Monitor initial memory usage
    mem_before = psutil.virtual_memory()
    logger.info(f"[{request_id}] Memory usage before processing: {mem_before.percent}% (Available: {mem_before.available / (1024*1024):.2f} MB)")
    
    data = request.get_json()
    question = data.get("question", "")
    # Get user role from request, default to "student" if not provided
    user_role = data.get("role", "student")
    
    logger.info(f"[{request_id}] Received question from frontend, role: {user_role}, question: '{question}'")
    if not question:
        logger.warning(f"[{request_id}] No question provided in request")
        return jsonify({"error": "No question provided"}), 400
    
    # Validate role
    if user_role not in ["student", "teacher"]:
        logger.warning(f"[{request_id}] Invalid role provided: {user_role}, defaulting to student")
        user_role = "student"
        
    logger.info(f"[{request_id}] Tokenizing input and preparing LLM for {user_role} role")
    # Only add dynamic context with the user question, not the full system prompt
    context_and_question = f"{get_current_dynamic_context()}\n\nUser: {question}\n\nIntel Assistant:"
    logger.info(f"[{request_id}] Using dynamic context with user query for {user_role} role")
      # Prepare input text based on user's role
    input_text = context_and_question
    inputs = tokenizer(input_text, return_tensors="pt")
    
    # Get the appropriate system prompt based on user role
    role_prompt_ids = system_prompt_ids.get(user_role, system_prompt_ids["student"])
    
    logger.info(f"[{request_id}] Starting LLM generation with {user_role} role system prompt")
    start = time.time()
    
    # Set a timeout for LLM generation (30 seconds)
    timeout_seconds = 60
    answer = None
    
    try:        # Use threading with timeout for generation
        def generate_response():
            nonlocal answer
            try:                # Increased max_length and added min_length for longer responses
                # Use the appropriate system prompt based on user role
                logger.info(f"[{request_id}] Generating response with {user_role} system prompt")
                
                # Determine which system prompt to use based on role
                current_prompt_ids = role_prompt_ids
                  # Combine the system prompt prefix with the input
                # For OpenVINO models, we need to handle this with the tokenizer
                # First get the tokenized system prompt for the role
                role_system_prompt = STUDENT_SYSTEM_PROMPT if user_role == "student" else TEACHER_SYSTEM_PROMPT
                
                # Create combined input with role-specific system prompt
                combined_input = f"{role_system_prompt}\n\n{input_text}"
                combined_inputs = tokenizer(combined_input, return_tensors="pt")
                
                outputs = model.generate(
                    **combined_inputs,
                    max_length=2048,       # Increased from 200
                    min_length=20,        # Ensure minimum output length
                    do_sample=True,       # Enable sampling for more diverse outputs
                    temperature=0.7,      # Control randomness (lower = more deterministic)
                    no_repeat_ngram_size=3 # Prevent repetition of n-grams
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
    logger.info(f"[{request_id}] LLM generation took {process_time} seconds")
    
    # Force garbage collection to free memory
    gc.collect()
    
    # Monitor final memory usage
    mem_after = psutil.virtual_memory()
    logger.info(f"[{request_id}] Memory usage after processing: {mem_after.percent}% (Available: {mem_after.available / (1024*1024):.2f} MB)")
    
    if answer:
        logger.info(f"[{request_id}] Sending response to frontend: '{answer[:100]}...' ({len(answer)} chars)")
    else:
        answer = "Sorry, I couldn't generate a response. Please try again."
        logger.warning(f"[{request_id}] No response was generated")
    
    return jsonify({"answer": answer, "latency": process_time})

if __name__ == "__main__":
    logger.info("Starting Intel Classroom Assistant server")
    # logger.info(f"Speech model: vosk-model-small-en-us-0.15")
    # logger.info(f"LLM model: {model_id}")
    # logger.info(f"Server running at http://localhost:8000")
    app.run(debug=True, port=8000)
