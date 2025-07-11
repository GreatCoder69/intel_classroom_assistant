import React, { useState } from 'react';
import { Button, Alert, Container } from 'react-bootstrap';

const VoiceTestComponent = () => {
  const [result, setResult] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState('');
  const [recognition, setRecognition] = useState(null);
  const [transcribedText, setTranscribedText] = useState('');

  const testVoice = async () => {
    // If currently recording, stop the recording
    if (isListening && recognition) {
      recognition.stop();
      setIsListening(false);
      setResult("🎤 Stopped recording");
      return;
    }

    setError('');
    setResult('');
    setTranscribedText('');
    setIsListening(true);

    try {
      // Check browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        setError("❌ Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
        setIsListening(false);
        return;
      }

      // Check for HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        setError("❌ Voice input requires HTTPS. Please access the site over HTTPS.");
        setIsListening(false);
        return;
      }

      // Check microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setResult("✅ Microphone access granted. Recording... Click again to stop");
      } catch (permissionError) {
        setError("❌ Microphone permission denied. Please allow microphone access and try again.");
        setIsListening(false);
        return;
      }

      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true; // Keep listening continuously
      recognitionInstance.interimResults = true; // Show interim results
      recognitionInstance.lang = "en-US";

      setRecognition(recognitionInstance);

      recognitionInstance.onresult = (e) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Process all results
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcribed text with final transcript
        if (finalTranscript) {
          setTranscribedText((prev) => prev ? `${prev} ${finalTranscript}` : finalTranscript);
          setResult(`✅ Voice recognized: "${finalTranscript}"`);
        }

        // Show interim results
        if (interimTranscript && !finalTranscript) {
          setResult(`🎤 Listening: "${interimTranscript}"`);
        }
      };

      recognitionInstance.onerror = (e) => {
        console.error("Speech recognition error:", e);
        let errorMessage = "";
        switch (e.error) {
          case 'not-allowed':
            errorMessage = "❌ Microphone permission denied.";
            setIsListening(false);
            setRecognition(null);
            break;
          case 'no-speech':
            errorMessage = "⚠️ No speech detected. Microphone is still active.";
            // Don't stop recording on no-speech, just warn
            break;
          case 'network':
            errorMessage = "❌ Network error. Please check your internet connection.";
            setIsListening(false);
            setRecognition(null);
            break;
          case 'service-not-allowed':
            errorMessage = "❌ Speech service not allowed. Please use HTTPS.";
            setIsListening(false);
            setRecognition(null);
            break;
          case 'aborted':
            // This is normal when user clicks stop
            break;
          default:
            errorMessage = `❌ Speech error: ${e.error || "unknown"}`;
            setIsListening(false);
            setRecognition(null);
        }
        if (errorMessage) {
          setError(errorMessage);
        }
      };

      recognitionInstance.onstart = () => {
        setResult("🎤 Recording started... Speak now!");
        setIsListening(true);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
        setRecognition(null);
        if (!error && !result.includes("Voice recognized:")) {
          setResult("🎤 Recording stopped");
        }
      };

      recognitionInstance.start();
    } catch (error) {
      console.error("Voice recognition error:", error);
      setError(`❌ Failed to start voice recognition: ${error.message}`);
      setIsListening(false);
      setRecognition(null);
    }
  };

  return (
    <Container className="mt-5">
      <h2>🎤 Voice-to-Text Debugger</h2>
      <p>Use this component to test voice recognition functionality.</p>
      
      <div className="mb-3">
        <Button 
          variant={isListening ? "danger" : "primary"} 
          onClick={testVoice} 
          size="lg"
        >
          {isListening ? "🛑 Stop Recording" : "🎤 Start Voice Recording"}
        </Button>
      </div>

      {transcribedText && (
        <Alert variant="success">
          <strong>Full Transcription:</strong> {transcribedText}
        </Alert>
      )}

      {result && (
        <Alert variant="info">
          <strong>Result:</strong> {result}
        </Alert>
      )}

      {error && (
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      )}

      <div className="mt-4">
        <h5>Browser Compatibility Check:</h5>
        <ul>
          <li>Speech Recognition API: {window.SpeechRecognition || window.webkitSpeechRecognition ? "✅ Supported" : "❌ Not Supported"}</li>
          <li>Media Devices API: {navigator.mediaDevices ? "✅ Supported" : "❌ Not Supported"}</li>
          <li>Protocol: {location.protocol === 'https:' || location.hostname === 'localhost' ? "✅ Secure" : "❌ Requires HTTPS"}</li>
          <li>User Agent: {navigator.userAgent}</li>
        </ul>
      </div>
    </Container>
  );
};

export default VoiceTestComponent;
