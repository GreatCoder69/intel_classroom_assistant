import React, { useState, useRef, useEffect } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';
import { FaMicrophone, FaMicrophoneSlash, FaStop } from 'react-icons/fa';
import './VoiceToText.css';

const VoiceToText = ({ onTranscription, disabled = false }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  // Check if voice recognition is supported
  useEffect(() => {
    const checkSupport = async () => {
      try {
        // Check if getUserMedia is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError("Voice recording is not supported in this browser");
          return;
        }

        // Check if MediaRecorder is supported
        if (!window.MediaRecorder) {
          setError("MediaRecorder is not supported in this browser");
          return;
        }

        // Check if backend voice service is available
        const response = await fetch('/api/voice/status');
        const status = await response.json();
        
        if (status.available) {
          setIsSupported(true);
        } else {
          setError("Voice recognition service is not available on the server");
        }
      } catch (err) {
        console.error('Error checking voice support:', err);
        setError("Unable to check voice recognition support");
      }
    };

    checkSupport();
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,  // Vosk prefers 16kHz
          channelCount: 1,    // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      chunksRef.current = [];

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;

      // Handle data available
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Handle recording stop
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        setIsProcessing(true);
        
        try {
          await processRecording();
        } catch (err) {
          console.error('Error processing recording:', err);
          setError("Failed to process voice recording");
        } finally {
          setIsProcessing(false);
        }
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const processRecording = async () => {
    if (chunksRef.current.length === 0) {
      setError("No audio data recorded");
      return;
    }

    try {
      // Create blob from recorded chunks
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      
      // Create FormData for upload
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Send to backend for transcription
      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.error) {
        setError(result.error);
      } else if (result.text) {
        // Call the callback with transcribed text
        onTranscription(result.text);
        setError(null);
      } else {
        setError("No speech detected in recording");
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError("Failed to transcribe audio");
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  if (!isSupported && !error) {
    return null; // Loading check
  }

  if (error && !isSupported) {
    return (
      <Button 
        variant="outline-secondary" 
        size="sm" 
        disabled 
        title={error}
      >
        <FaMicrophoneSlash />
      </Button>
    );
  }

  return (
    <div className="voice-to-text-container">
      <Button
        variant={isRecording ? "danger" : "outline-primary"}
        size="sm"
        onClick={handleClick}
        disabled={disabled || isProcessing}
        title={
          isRecording 
            ? "Click to stop recording" 
            : isProcessing 
              ? "Processing speech..." 
              : "Click to start voice recording"
        }
        className="voice-button"
      >
        {isProcessing ? (
          <Spinner animation="border" size="sm" />
        ) : isRecording ? (
          <FaStop />
        ) : (
          <FaMicrophone />
        )}
      </Button>
      
      {error && (
        <Alert variant="warning" className="mt-2 small" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {isRecording && (
        <div className="recording-indicator mt-1">
          <small className="text-danger">
            🔴 Recording... Click to stop
          </small>
        </div>
      )}
    </div>
  );
};

export default VoiceToText;
