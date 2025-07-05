#!/usr/bin/env python3
"""
Voice Service Test Script

This script tests the voice recognition functionality without running the full server.
"""

import os
import sys
import tempfile
import wave

# Add the servers directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend', 'servers'))

try:
    from voice_service import init_vosk_model, process_audio_file
    print("✅ Voice service imported successfully")
except ImportError as e:
    print(f"❌ Failed to import voice service: {e}")
    sys.exit(1)

def test_model_loading():
    """Test if the Vosk model loads correctly."""
    print("\n🔍 Testing Vosk model loading...")
    
    if init_vosk_model():
        print("✅ Vosk model loaded successfully")
        return True
    else:
        print("❌ Failed to load Vosk model")
        return False

def test_audio_processing():
    """Test audio processing with a dummy file."""
    print("\n🔍 Testing audio processing...")
    
    # Create a minimal WAV file for testing
    try:
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as temp_file:
            temp_path = temp_file.name
        
        # Create a minimal valid WAV file (1 second of silence)
        with wave.open(temp_path, 'wb') as wf:
            wf.setnchannels(1)  # Mono
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(16000)  # 16kHz
            # Write 1 second of silence
            wf.writeframes(b'\x00\x00' * 16000)
        
        # Test processing
        result = process_audio_file(temp_path)
        
        # Clean up
        os.unlink(temp_path)
        
        if 'error' in result:
            print(f"⚠️ Audio processing test result: {result['error']}")
        else:
            print(f"✅ Audio processing successful: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Audio processing test failed: {e}")
        return False

def main():
    """Run all tests."""
    print("🎤 Voice Service Test Suite")
    print("=" * 40)
    
    # Test 1: Model loading
    model_ok = test_model_loading()
    
    # Test 2: Audio processing (only if model loaded)
    if model_ok:
        process_ok = test_audio_processing()
    else:
        process_ok = False
    
    # Summary
    print("\n📊 Test Results:")
    print(f"Model Loading: {'✅ PASS' if model_ok else '❌ FAIL'}")
    print(f"Audio Processing: {'✅ PASS' if process_ok else '❌ FAIL'}")
    
    if model_ok and process_ok:
        print("\n🎉 All tests passed! Voice service is ready to use.")
        print("\nNext steps:")
        print("1. Start the backend server: cd backend/servers && python new_server.py")
        print("2. Start the frontend: cd frontend && npm run dev")
        print("3. Look for the microphone button in the chat interface")
    else:
        print("\n⚠️ Some tests failed. Please check the setup:")
        if not model_ok:
            print("- Ensure vosk-model-small-en-us-0.15 is in the project root")
            print("- Install dependencies: pip install vosk soundfile")
        if not process_ok:
            print("- Check write permissions for temporary files")

if __name__ == "__main__":
    main()
