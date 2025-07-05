"""
Voice to Text Service using Vosk Model

Provides speech recognition functionality for the Intel Classroom Assistant.
Uses the locally available Vosk model for offline speech recognition.
"""

import os
import json
import logging
import tempfile
import wave
from flask import Blueprint, request, jsonify
from werkzeug.utils import secure_filename
import vosk

# Set up logging
logger = logging.getLogger('voice_service')

# Initialize Vosk model
MODEL_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'vosk-model-small-en-us-0.15')
model = None
rec = None

def init_vosk_model():
    """Initialize the Vosk model for speech recognition."""
    global model, rec
    try:
        if os.path.exists(MODEL_PATH):
            logger.info(f"Loading Vosk model from: {MODEL_PATH}")
            model = vosk.Model(MODEL_PATH)
            rec = vosk.KaldiRecognizer(model, 16000)  # 16kHz sample rate
            logger.info("Vosk model loaded successfully")
            return True
        else:
            logger.error(f"Vosk model not found at: {MODEL_PATH}")
            return False
    except Exception as e:
        logger.error(f"Error loading Vosk model: {str(e)}")
        return False

# Initialize model on import
model_loaded = init_vosk_model()

def process_audio_file(audio_file_path):
    """
    Process audio file and return transcribed text.
    
    Args:
        audio_file_path: Path to the audio file
        
    Returns:
        Transcribed text or error message
    """
    global rec
    
    if not model_loaded or not rec:
        return {"error": "Voice recognition model not available"}
    
    try:
        # Open and process the audio file
        with wave.open(audio_file_path, 'rb') as wf:
            # Check audio format - Vosk works best with mono 16kHz
            if wf.getnchannels() != 1:
                logger.warning("Audio file is not mono. Vosk works best with mono audio.")
                # For now, we'll process it anyway and let Vosk handle it
            
            if wf.getframerate() != 16000:
                logger.warning(f"Audio sample rate is {wf.getframerate()}Hz. Vosk works best with 16kHz.")
            
            return _process_wave_file(wf)
                    
    except Exception as e:
        logger.error(f"Error processing audio file: {str(e)}")
        return {"error": f"Error processing audio: {str(e)}"}

def _process_wave_file(wf):
    """Helper function to process a wave file object."""
    global rec
    
    # Reset recognizer
    rec = vosk.KaldiRecognizer(model, wf.getframerate())
    
    results = []
    
    # Process audio in chunks
    while True:
        data = wf.readframes(4000)  # Read 4000 frames at a time
        if len(data) == 0:
            break
            
        if rec.AcceptWaveform(data):
            result = json.loads(rec.Result())
            if result.get('text'):
                results.append(result['text'])
    
    # Get final result
    final_result = json.loads(rec.FinalResult())
    if final_result.get('text'):
        results.append(final_result['text'])
    
    # Combine all results
    full_text = ' '.join(results).strip()
    
    if full_text:
        logger.info(f"Transcription successful: '{full_text[:50]}...'")
        return {"text": full_text}
    else:
        logger.warning("No speech detected in audio file")
        return {"error": "No speech detected"}

# Flask Blueprint for voice endpoints
voice_bp = Blueprint('voice', __name__)

@voice_bp.route('/api/voice/transcribe', methods=['POST'])
def transcribe_audio():
    """
    Transcribe uploaded audio file to text.
    
    Expected: multipart/form-data with 'audio' file field
    Returns: JSON with transcribed text or error
    """
    try:
        if 'audio' not in request.files:
            return jsonify({"error": "No audio file provided"}), 400
        
        audio_file = request.files['audio']
        
        if audio_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Validate file type
        allowed_extensions = {'.wav', '.webm', '.ogg', '.mp3'}
        filename = secure_filename(audio_file.filename)
        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext not in allowed_extensions:
            return jsonify({"error": f"Unsupported file type: {file_ext}"}), 400
        
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_file:
            temp_path = temp_file.name
            audio_file.save(temp_path)
        
        try:
            # Convert to WAV if needed
            if file_ext != '.wav':
                wav_path = temp_path.replace(file_ext, '.wav')
                # You might need to add audio conversion here using pydub or ffmpeg
                # For now, we'll assume the audio is in a compatible format
                os.rename(temp_path, wav_path)
                temp_path = wav_path
            
            # Process the audio file
            result = process_audio_file(temp_path)
            
            return jsonify(result)
            
        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    except Exception as e:
        logger.error(f"Error in transcribe_audio: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@voice_bp.route('/api/voice/status', methods=['GET'])
def voice_status():
    """Check if voice recognition is available."""
    return jsonify({
        "available": model_loaded,
        "model_path": MODEL_PATH if model_loaded else None,
        "status": "ready" if model_loaded else "unavailable"
    })
