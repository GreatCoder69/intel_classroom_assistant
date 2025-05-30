"""
Combined LLM and Microphone Testing Module

This module tests the integration of Vosk speech recognition with OpenVINO LLM.
Captures voice input, converts to text, and generates AI responses.
"""

import queue
import sounddevice as sd
import sys
import json
import time
from vosk import Model, KaldiRecognizer

from transformers import AutoTokenizer
from optimum.intel.openvino import OVModelForCausalLM

# --- Vosk ASR Setup ---
q = queue.Queue()
model_path = "vosk-model-small-en-us-0.15"  # your Vosk model folder
asr_model = Model(model_path)
rec = KaldiRecognizer(asr_model, 16000)

def audio_callback(indata, frames, time_info, status):
    """
    Audio callback function for speech recognition input stream.
    
    Args:
        indata: Input audio data from microphone
        frames: Number of audio frames
        time_info: Timestamp information
        status: Stream status information
    """
    q.put(bytes(indata))

# --- OpenVINO LLM Setup ---
model_id = "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov"  # <-- changed here
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = OVModelForCausalLM.from_pretrained(model_id)

def query_llm(question: str) -> tuple[str, float]:
    """
    Query the LLM model with a text question and return response.
    
    Args:
        question (str): Text question to ask the model
        
    Returns:
        tuple: (response_text, latency_seconds)
    """
    inputs = tokenizer(question, return_tensors="pt")
    start = time.time()
    outputs = model.generate(**inputs, max_length=200)
    end = time.time()
    answer = tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
    latency = end - start
    return answer, latency

def main():
    """
    Main function to test combined speech recognition and LLM response.
    
    Listens for voice input for 10 seconds, converts to text,
    and generates an AI response using the LLM model.
    """
    print("Listening... Speak into your microphone.")
    last_speech_time = time.time()
    timeout_seconds = 10  # Stop listening after 10 sec silence
    last_partial = ""
    recognized_text = ""

    with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16', channels=1, callback=audio_callback):
        while True:
            if not q.empty():
                data = q.get()
                if rec.AcceptWaveform(data):
                    result = rec.Result()
                    text = json.loads(result).get("text", "")
                    if text.strip():
                        print("\r" + " " * len(last_partial), end="\r")  # Clear partial
                        print(f"Recognized question: {text}")
                        recognized_text = text
                        break  # stop listening after first full recognized question
                    last_partial = ""
                else:
                    partial = json.loads(rec.PartialResult()).get("partial", "")
                    if partial != last_partial:
                        print("\r" + " " * len(last_partial), end="\r")
                        print("\r" + partial, end="")
                        sys.stdout.flush()
                        last_partial = partial
                        if partial.strip():
                            last_speech_time = time.time()

            # timeout if no speech detected for 10 seconds
            if time.time() - last_speech_time > timeout_seconds:
                print("\nSilence detected for 10 seconds. Stopping...")
                break

    if recognized_text:
        print("LLM is thinking...")
        answer, latency = query_llm(recognized_text)
        print(f"Answer:\n{answer}")
        print(f"LLM latency: {latency:.2f} seconds")
    else:
        print("No speech detected. Exiting.")

if __name__ == "__main__":
    main()
