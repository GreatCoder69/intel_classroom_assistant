from flask import Flask, request, jsonify
from flask_cors import CORS
import queue
import sounddevice as sd
import json
import time
from vosk import Model, KaldiRecognizer
from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Allow requests from your React frontend

# Vosk setup
q = queue.Queue()
asr_model = Model("vosk-model-small-en-us-0.15")
rec = KaldiRecognizer(asr_model, 16000)

# LLM setup
model_id = "OpenVINO/neural-chat-7b-v3-3-fp16-ov"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = OVModelForCausalLM.from_pretrained(model_id)

# Audio callback for Vosk
def audio_callback(indata, frames, time_info, status):
    q.put(bytes(indata))

@app.route("/listen", methods=["GET"])
def listen():
    print("Listening...")
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
                        break
                else:
                    partial = json.loads(rec.PartialResult()).get("partial", "")
                    if partial.strip():
                        last_speech_time = time.time()

            if time.time() - last_speech_time > timeout_seconds:
                print("Timeout - no speech detected.")
                break

    return jsonify({"transcript": recognized_text})

@app.route("/query", methods=["POST"])
def query():
    data = request.get_json()
    question = data.get("question", "")
    if not question:
        return jsonify({"error": "No question provided"}), 400

    inputs = tokenizer(question, return_tensors="pt")
    start = time.time()
    outputs = model.generate(**inputs, max_length=200)
    end = time.time()
    answer = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
    return jsonify({"answer": answer, "latency": round(end - start, 2)})

if __name__ == "__main__":
    app.run(debug=True, port=8000)
