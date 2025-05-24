import queue
import sounddevice as sd
import sys
import json
import time
from vosk import Model, KaldiRecognizer

q = queue.Queue()
model_path = "vosk-model-small-en-us-0.15"  # Path to the extracted Vosk model folder

model = Model(model_path)
rec = KaldiRecognizer(model, 16000)

def audio_callback(indata, frames, time_info, status):
    q.put(bytes(indata))

def main():
    print("Listening... Speak into your microphone.")
    last_speech_time = time.time()
    timeout_seconds = 3  # Stop if silence > 3 seconds
    last_partial = ""

    with sd.RawInputStream(samplerate=16000, blocksize=8000, dtype='int16', channels=1, callback=audio_callback):
        while True:
            if not q.empty():
                data = q.get()
                if rec.AcceptWaveform(data):
                    result = rec.Result()
                    text = json.loads(result).get("text", "")
                    if text.strip():
                        # Clear previous partial before printing final result
                        print("\r" + " " * len(last_partial), end="\r")
                        print(text)
                        last_partial = ""
                        last_speech_time = time.time()
                else:
                    partial = json.loads(rec.PartialResult()).get("partial", "")
                    if partial != last_partial:
                        # Clear previous partial and print new partial on the same line
                        print("\r" + " " * len(last_partial), end="\r")
                        print("\r" + partial, end="")
                        sys.stdout.flush()
                        last_partial = partial
                        if partial.strip():
                            last_speech_time = time.time()

            # Stop listening after timeout of silence
            if time.time() - last_speech_time > timeout_seconds:
                print("\nSilence detected for 3 seconds. Stopping...")
                break

if __name__ == "__main__":
    main()
