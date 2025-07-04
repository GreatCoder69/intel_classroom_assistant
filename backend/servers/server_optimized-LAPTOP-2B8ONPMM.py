# Ultra-Optimized Intel Classroom Assistant Server v2

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import queue
import sounddevice as sd
import json
import time
import gc
import logging
import threading
import psutil
import re
import numpy as np
from datetime import datetime
from vosk import Model, KaldiRecognizer
from collections import OrderedDict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from openvino.runtime import Core
from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

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

# ================= Model Configuration =================
class ModelConfig:
    def __init__(self, model_id, cache_dir, max_context_length, sliding_window_size, 
                 max_queue_size, memory_threshold):
        self.model_id = model_id
        self.cache_dir = cache_dir
        self.max_context_length = max_context_length
        self.sliding_window_size = sliding_window_size
        self.max_queue_size = max_queue_size
        self.memory_threshold = memory_threshold

class OptimizedModelManager:
    def __init__(self, config: ModelConfig):
        self.config = config
        self.model = None
        self.tokenizer = None
        self.is_model_loaded = False
        self.ov_core = Core()

    def load_model_cached(self):
        try:
            logger.info(f"🚀 Loading OpenVINO model: {self.config.model_id}")
            
            # Initialize tokenizer
            self.tokenizer = AutoTokenizer.from_pretrained(
                self.config.model_id, 
                cache_dir=self.config.cache_dir,
                use_fast=True  # Optimized tokenizer
            )
            
            # Load OpenVINO model with hardware optimizations
            self.model = OVModelForCausalLM.from_pretrained(
                self.config.model_id,
                cache_dir=self.config.cache_dir,
                device="CPU",
                ov_config={
                    "PERFORMANCE_HINT": "LATENCY",
                    "INFERENCE_PRECISION_HINT": "f32",
                    "CACHE_DIR": self.config.cache_dir
                }
            )
            
            self.is_model_loaded = True
            logger.info("✅ OpenVINO model loaded and optimized successfully")
            return True
        except Exception as e:
            logger.error(f"❌ Model loading failed: {str(e)}")
            return False

    def warm_up_model(self):
        """Warm up model with short inferences"""
        if not self.is_model_loaded:
            return
            
        logger.info("🔥 Warming up model...")
        warm_up_prompts = [
            "What is 1+1?",
            "Hello, how are you?",
            "Explain gravity in one sentence."
        ]
        
        for prompt in warm_up_prompts:
            self.generate_response_optimized(prompt, max_new_tokens=20)
        
        logger.info("✅ Model warm-up completed")
        self.perform_memory_cleanup()

    def perform_memory_cleanup(self):
        logger.info("🧹 Performing memory cleanup...")
        gc.collect()
        logger.info("✅ Memory cleanup completed")

    def get_memory_stats(self):
        mem = psutil.virtual_memory()
        return {
            "total_mb": round(mem.total / (1024 ** 2), 1),
            "available_mb": round(mem.available / (1024 ** 2), 1),
            "used_percent": mem.percent
        }

    def generate_response_optimized(self, input_text: str, 
                                   max_new_tokens: int = 256,
                                   temperature: float = 0.7,
                                   top_p: float = 0.9) -> tuple:
        """
        Optimized response generation with OpenVINO
        
        Args:
            input_text: Full input text with context
            max_new_tokens: Max tokens to generate
            temperature: Creativity control
            top_p: Nucleus sampling threshold
            
        Returns:
            tuple: (response, generation_time)
        """
        if not self.is_model_loaded:
            return "Model not loaded. Please try again later.", 0.0
            
        start_time = time.time()
        
        # Memory management
        mem_before = self.get_memory_stats()
        if mem_before['used_percent'] > self.config.memory_threshold:
            self.perform_memory_cleanup()
        
        # Generate response
        try:
            # Tokenize input
            inputs = self.tokenizer(
                input_text,
                return_tensors="pt",
                truncation=True,
                max_length=self.config.max_context_length
            )
            
            # Generate with OpenVINO
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id,
                stopping_criteria=[SentenceLimitStoppingCriteria(self.tokenizer)]  # Pass tokenizer here
            )
            
            # Decode response
            response = self.tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
            generation_time = time.time() - start_time
            
            # Post-generation cleanup
            if self.get_memory_stats()['used_percent'] > self.config.memory_threshold:
                self.perform_memory_cleanup()
                
            return response, generation_time
        
        except Exception as e:
            logger.error(f"❌ Response generation failed: {str(e)}")
            return "I'm having trouble with that request. Please try again.", 0.0

# ================= Early Termination =================
class SentenceLimitStoppingCriteria:
    """Stop generation after 5 complete sentences"""
    def __init__(self, tokenizer):
        self.tokenizer = tokenizer
        self.sentence_count = 0
        self.last_token_was_punctuation = False
        
    def __call__(self, input_ids, scores, **kwargs):
        current_token = input_ids[0][-1].item()
        decoded_token = self.tokenizer.decode([current_token])
        
        # Check for sentence-ending punctuation
        if decoded_token in ['.', '?', '!']:
            if self.last_token_was_punctuation:  # Handle multiple punctuation
                self.last_token_was_punctuation = True
                return False
                
            self.sentence_count += 1
            self.last_token_was_punctuation = True
        else:
            self.last_token_was_punctuation = False
        
        # Stop after 5 sentences
        return self.sentence_count >= 5

# ================= Server Configuration =================
MODEL_CONFIG = ModelConfig(
    model_id="OpenVINO/mistral-7b-instruct-v0.1-int4-ov",
    cache_dir="./model_cache",
    max_context_length=1024,
    sliding_window_size=512,
    max_queue_size=10,
    memory_threshold=85.0
)

# Initialize optimized model manager
model_manager = OptimizedModelManager(MODEL_CONFIG)

# Vosk setup with optimization
q = queue.Queue(maxsize=100)
try:
    asr_model = Model("vosk-model-small-en-us-0.15")
    rec = KaldiRecognizer(asr_model, 16000)
    logger.info("✅ Vosk ASR model loaded successfully")
except Exception as e:
    logger.error(f"❌ Error loading Vosk model: {str(e)}")
    asr_model = None
    rec = None

# ================= Answer Optimization System =================
class AnswerOptimizer:
    def __init__(self):
        # Predefined responses for common questions
        self.predefined_responses = {
            "hello": "Hello! How can I assist you today?",
            "hi": "Hi there! How can I help?",
            "hey": "Hey! What can I do for you?",
            "good morning": "Good morning! How can I assist you today?",
            "good afternoon": "Good afternoon! How can I help?",
            "good evening": "Good evening! What can I do for you?",
            "thank you": "You're welcome!",
            "thanks": "You're welcome!",
            "bye": "Goodbye! Have a great day!",
            "goodbye": "Goodbye! Have a great day!",
            "see you": "See you later!",
            "see ya": "See you later!",
            "whats your name": "I'm Intel Classroom Assistant, your AI teaching helper!",
            "who are you": "I'm an AI assistant designed to help with educational tasks.",
            "help": "I can answer questions, explain concepts, and assist with learning materials. What do you need help with?",
            "how are you": "I'm functioning optimally and ready to assist you!"
        }
        
        # Semantic response cache
        self.semantic_cache = OrderedDict()
        self.cache_size = 500
        self.vectorizer = TfidfVectorizer().fit(list(self.predefined_responses.values()))
        self.similarity_threshold = 0.85
        
        # Short answer detector
        self.short_patterns = re.compile(
            r"^(when|where|who|what|is|are|do|does|did|can|could|will|would|"
            r"should|shall|has|have|had|which|whom|whose)\b|"
            r"\?$|yes|no|true|false|^\d+$",
            re.IGNORECASE
        )
    
    def get_predefined_response(self, question):
        """Check for exact or similar predefined responses"""
        clean_q = re.sub(r'[^\w\s]', '', question.lower())
        
        # Check exact matches
        if clean_q in self.predefined_responses:
            return self.predefined_responses[clean_q]
        
        # Check semantic similarity
        q_vec = self.vectorizer.transform([clean_q])
        for cached_q, response in self.semantic_cache.items():
            cached_vec = self.vectorizer.transform([cached_q])
            similarity = cosine_similarity(q_vec, cached_vec)[0][0]
            if similarity > self.similarity_threshold:
                return response
        
        return None
    
    def is_short_question(self, question):
        """Determine if question can be answered concisely"""
        return bool(self.short_patterns.search(question)) and len(question.split()) < 12
    
    def add_to_cache(self, question, response):
        """Add response to semantic cache"""
        clean_q = re.sub(r'[^\w\s]', '', question.lower())
        if clean_q not in self.semantic_cache:
            if len(self.semantic_cache) >= self.cache_size:
                self.semantic_cache.popitem(last=False)
            self.semantic_cache[clean_q] = response

answer_optimizer = AnswerOptimizer()

# ================= Conversation State Management =================
class OptimizedConversationState:
    def __init__(self, max_history: int = 8):
        self.history = {}
        self.max_history = max_history
        self.lock = threading.Lock()
        self.user_contexts = {}
    
    def add_message(self, user_id: str, user_input: str, ai_response: str):
        with self.lock:
            if user_id not in self.history:
                self.history[user_id] = []
            
            # Prune before adding if needed
            if len(self.history[user_id]) >= self.max_history:
                self.history[user_id] = self.history[user_id][-self.max_history:]
            
            self.history[user_id].append({
                "timestamp": time.time(),
                "user": user_input,
                "assistant": ai_response
            })
    
    def get_context(self, user_id: str, max_items: int = 3) -> list:
        """Get context with adaptive length based on complexity"""
        with self.lock:
            items = self.history.get(user_id, [])
            # Return more context for complex questions
            return items[-max_items:] if len(items) > 2 else items
            
    def reset_context(self, user_id: str):
        """Reset conversation context for a user"""
        with self.lock:
            if user_id in self.history:
                del self.history[user_id]

conversation_state = OptimizedConversationState(max_history=10)

# ================= Context Management =================
_DYNAMIC_CONTEXT = None
_CONTEXT_LAST_UPDATED = 0

def get_dynamic_context():
    """Cached dynamic context generation"""
    global _DYNAMIC_CONTEXT, _CONTEXT_LAST_UPDATED
    
    current_time = time.time()  
    if not _DYNAMIC_CONTEXT or (current_time - _CONTEXT_LAST_UPDATED) > 300:
        _DYNAMIC_CONTEXT = f"""
Current date: {datetime.now().strftime('%Y-%m-%d')}
Current time: {datetime.now().strftime('%H:%M:%S')}
Current semester: Fall Term
Current school week: Week 12

Remember:
- Provide accurate, educational responses
- For short factual questions, give direct answers
- For complex questions, provide concise explanations
- Always maintain academic integrity
- Tailor responses to user's role (student/teacher)
"""
        _CONTEXT_LAST_UPDATED = current_time
    
    return _DYNAMIC_CONTEXT

# ================= User Configuration =================
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

# ================= Utility Functions =================
def extract_assistant_response(full_text: str) -> str:
    """Optimized response extraction"""
    markers = ["Intel Assistant:", "Assistant:", "Response:"]
    for marker in markers:
        if marker in full_text:
            return full_text.split(marker, 1)[1].strip()
    return full_text.strip()[:2000]

def audio_callback(indata, frames, time_info, status):
    """Optimized audio callback with batching"""
    if status:
        logger.warning(f"Audio status: {status}")
    
    try:
        if q.qsize() < q.maxsize // 2:  # Only add if queue not overloaded
            q.put(indata.copy())
    except Exception as e:
        logger.error(f"Audio error: {str(e)}")

# ================= API Endpoints =================
@app.route("/login", methods=["POST"])
def login():
    """Optimized login handler"""
    try:
        data = request.get_json()
        username = data.get("username", "").strip()
        password = data.get("password", "").strip()
        
        user = users.get(username)
        if user and user["password"] == password:
            # Reset conversation context on login
            conversation_state.reset_context(username)
            return jsonify({
                "username": username,
                "role": user["role"],
                "message": "Login successful",
                "config": {
                    "context_limit": user.get("context_limit", 512),
                    "response_limit": user.get("response_limit", 256)
                }
            })
        
        return jsonify({"message": "Invalid credentials"}), 401
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({"message": "Internal server error"}), 500

@app.route("/api/listen", methods=["GET"])
def listen():
    """Optimized speech recognition with streaming"""
    if not rec:
        return jsonify({"error": "Speech recognition unavailable"}), 503
    
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    logger.info(f"[{request_id}] 🎤 Starting speech recognition")
    
    def generate():
        last_speech_time = time.time()
        audio_buffer = bytearray()
        chunk_size = 4000  # Process in chunks
        
        with sd.RawInputStream(
            samplerate=16000, 
            blocksize=8000,  # Larger block size
            dtype='int16',
            channels=1, 
            callback=audio_callback
        ):
            while time.time() - last_speech_time < 8:  # 8s timeout
                while not q.empty():
                    try:
                        data = q.get_nowait()
                        audio_chunk = bytes(np.frombuffer(data, dtype=np.int16))
                        audio_buffer.extend(audio_chunk)
                        
                        # Process in chunks
                        if len(audio_buffer) >= chunk_size:
                            process_chunk = bytes(audio_buffer[:chunk_size])
                            audio_buffer = audio_buffer[chunk_size:]
                            
                            if rec.AcceptWaveform(process_chunk):
                                result = rec.Result()
                                text = json.loads(result).get("text", "").strip()
                                if text:
                                    yield f"data: {json.dumps({'transcript': text})}\n\n"
                                    return
                            else:
                                partial = json.loads(rec.PartialResult()).get("partial", "").strip()
                                if partial:
                                    yield f"data: {json.dumps({'partial': partial})}\n\n"
                                    last_speech_time = time.time()
                    except Exception as e:
                        logger.error(f"Processing error: {str(e)}")
                
                time.sleep(0.02)  # Yield to other threads
                
            yield "data: {\"status\": \"timeout\"}\n\n"
    
    return Response(stream_with_context(generate()), mimetype="text/event-stream")

@app.route("/api/query", methods=["POST"])
def query():
    """Aggressively optimized query processing"""
    request_id = datetime.now().strftime("%Y%m%d%H%M%S%f")[:-3]
    start_time = time.time()
    
    try:
        data = request.get_json()
        question = data.get("question", "").strip()
        user_role = data.get("role", "student")
        username = data.get("username", "default")
        
        if not question:
            return jsonify({"error": "No question provided"}), 400
        
        # 1. Check for predefined response (0ms latency)
        if predefined := answer_optimizer.get_predefined_response(question):
            return jsonify({
                "answer": predefined,
                "metadata": {
                    "request_id": request_id,
                    "processing_time": round(time.time() - start_time, 3),
                    "source": "predefined"
                }
            })
        
        # 2. Prepare context
        context_history = conversation_state.get_context(
            username, 
            max_items=3 if len(question.split()) > 8 else 1  # Adaptive context
        )
        context_texts = [f"User: {msg['user']}\nAssistant: {msg['assistant']}" 
                        for msg in context_history]
        
        # 3. Determine response strategy
        is_short = answer_optimizer.is_short_question(question)
        user_config = users.get(user_role, users['student'])
        
        # 4. Generate response
        if is_short:
            # Ultra-fast path for short answers
            response, generation_time = model_manager.generate_response_optimized(
                input_text=f"User: {question}\nAssistant:",
                max_new_tokens=48,  # Very short response
                temperature=0.1,    # Low creativity
                top_p=0.9
            )
        else:
            # Full context for complex questions
            full_input = f"{get_dynamic_context()}\n\n" + \
                         "\n".join(context_texts) + \
                         f"\n\nUser: {question}\n\nIntel Assistant:"
            
            response, generation_time = model_manager.generate_response_optimized(
                input_text=full_input,
                max_new_tokens=user_config['response_limit'],
                temperature=0.7,    # More creative
                top_p=0.95
            )
        
        # 5. Process response
        cleaned_response = extract_assistant_response(response)
        conversation_state.add_message(username, question, cleaned_response)
        answer_optimizer.add_to_cache(question, cleaned_response)
        
        # 6. Stream response for long answers
        if len(cleaned_response.split()) > 25:
            def stream_response():
                words = cleaned_response.split()
                for i in range(0, len(words), 3):  # Stream in chunks
                    yield " ".join(words[i:i+3]) + " "
                    time.sleep(0.05)
            
            return Response(stream_with_context(stream_response()), mimetype="text/plain")
        else:
            return jsonify({
                "answer": cleaned_response,
                "metadata": {
                    "request_id": request_id,
                    "processing_time": round(time.time() - start_time, 3),
                    "response_strategy": "short" if is_short else "full"
                }
            })
            
    except Exception as e:
        logger.error(f"[{request_id}] ❌ Query error: {str(e)}")
        return jsonify({
            "error": "Failed to process query",
            "metadata": {"request_id": request_id}
        }), 500

@app.route("/api/health", methods=["GET"])
def health_check():
    """System health check"""
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
    """System statistics endpoint"""
    return jsonify({
        "memory": model_manager.get_memory_stats(),
        "model_config": {
            "model_id": MODEL_CONFIG.model_id,
            "max_context_length": MODEL_CONFIG.max_context_length,
            "memory_threshold": MODEL_CONFIG.memory_threshold
        },
        "conversation_stats": {
            role: len(history) for role, history in conversation_state.history.items()
        }
    })

# ================= Server Initialization =================
def initialize_server():
    """Initialize server with optimized model loading"""
    global start_time
    start_time = time.time()
    
    logger.info("🚀 Starting Ultra-Optimized Intel Classroom Assistant v2")
    
    # Load model
    model_manager.load_model_cached()
    
    # Warm up in background thread
    def warm_up():
        if model_manager.is_model_loaded:
            model_manager.warm_up_model()
        else:
            logger.warning("Skipping warm-up: Model not loaded")
    
    threading.Thread(target=warm_up).start()
    
    logger.info("✅ Server initialization complete")

# ================= Main Execution =================
if __name__ == "__main__":
    initialize_server()
    
    # Run with production optimizations
    app.run(
        debug=False,
        port=8000,
        host='127.0.0.1',
        threaded=True,
        use_reloader=False
    )