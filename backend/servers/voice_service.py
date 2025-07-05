from flask import Flask, request, jsonify
import os
import wave
import subprocess
from vosk import Model, KaldiRecognizer
from flask_cors import CORS
app = Flask(__name__)
CORS(app)   
model_path = model_path = "C:/Users/arsha/OneDrive - Manipal Academy of Higher Education/Documents/Intel_Assistant/vosk-model-small-en-us-0.15"


# Load Vosk model once
if not os.path.exists(model_path):
    raise Exception("Please download the model first")
model = Model(model_path)

@app.route('/api/voice/status', methods=['GET'])
def status():
    return jsonify({"available": True})

@app.route('/api/voice/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    audio_path = "temp_audio.webm"
    wav_path = "temp_audio.wav"
    audio_file.save(audio_path)

    # Convert webm to wav using ffmpeg
    subprocess.run([
        "ffmpeg", "-i", audio_path, "-ar", "16000", "-ac", "1", "-f", "wav", wav_path
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    wf = wave.open(wav_path, "rb")
    rec = KaldiRecognizer(model, wf.getframerate())

    text = ""
    while True:
        data = wf.readframes(4000)
        if len(data) == 0:
            break
        if rec.AcceptWaveform(data):
            text += rec.Result()
    text += rec.FinalResult()

    os.remove(audio_path)
    os.remove(wav_path)

    # Extract final recognized text
    import json
    try:
        result_json = json.loads(text.split('\n')[-1])
        return jsonify({"text": result_json.get("text", "")})
    except:
        return jsonify({"error": "Failed to parse result"})

if __name__ == '__main__':
    app.run(port=5000)
