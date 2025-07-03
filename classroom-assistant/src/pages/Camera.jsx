import React, { useRef, useEffect, useState } from 'react';
import * as faceapi from 'face-api.js';
import './Camera.css';

const FaceExpressionTracker = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(null); // Off-screen canvas for flipping
  const streamRef = useRef(null); // Store the stream reference
  const [expressions, setExpressions] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
          faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
          faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);
        console.log('✅ All models loaded');
        setIsLoading(false);
        startCamera();
      } catch (err) {
        console.error('❌ Error loading models:', err);
        setError('Failed to load facial recognition models. Please try refreshing the page.');
      }
    };

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('❌ Camera error:', err);
        setError('Camera access denied. Please allow camera permissions.');
      }
    };

    loadModels();

    return () => {
      // Stop the stream if it exists
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Also clear the video element's srcObject
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isLoading || error) return;

    const detectExpressions = async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      // Wait for video to be ready
      if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        requestAnimationFrame(detectExpressions);
        return;
      }

      // Prepare offscreen canvas
      let offscreen = offscreenCanvasRef.current;
      if (!offscreen) {
        offscreen = document.createElement('canvas');
        offscreenCanvasRef.current = offscreen;
      }
      offscreen.width = video.videoWidth;
      offscreen.height = video.videoHeight;

      // Flip video horizontally on offscreen canvas
      const offCtx = offscreen.getContext('2d');
      offCtx.save();
      offCtx.scale(-1, 1);
      offCtx.drawImage(video, -offscreen.width, 0, offscreen.width, offscreen.height);
      offCtx.restore();

      // Run face-api on the flipped frame
      const detections = await faceapi
        .detectSingleFace(offscreen, new faceapi.TinyFaceDetectorOptions({ inputSize: 512, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceExpressions();

      const canvas = canvasRef.current;
      canvas.width = offscreen.width;
      canvas.height = offscreen.height;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections) {
        setExpressions(detections.expressions);
        const resized = faceapi.resizeResults(detections, {
          width: offscreen.width,
          height: offscreen.height
        });
        // Draw the flipped video (not overlays) to the main canvas
        ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
        // Draw overlays (not flipped)
        faceapi.draw.drawDetections(canvas, resized);
        faceapi.draw.drawFaceLandmarks(canvas, resized);
        faceapi.draw.drawFaceExpressions(canvas, resized);
      } else {
        setExpressions(null);
        // Still draw the flipped video
        ctx.drawImage(offscreen, 0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(detectExpressions);
    };

    detectExpressions();
  }, [isLoading, error]);

  const getDominantExpression = () => {
    if (!expressions) return { expression: "Detecting...", probability: 0 };

    let max = { expression: "neutral", probability: 0 };
    for (const [expr, prob] of Object.entries(expressions)) {
      if (prob > max.probability) {
        max = { expression: expr, probability: prob };
      }
    }
    return max;
  };

  const expressionEmojis = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    fearful: "😨",
    disgusted: "🤢",
    surprised: "😲",
    neutral: "😐",
    "Detecting...": "⌛"
  };

  const expressionColors = {
    happy: "#4CAF50",
    sad: "#2196F3",
    angry: "#F44336",
    fearful: "#9C27B0",
    disgusted: "#795548",
    surprised: "#FFC107",
    neutral: "#9E9E9E",
    "Detecting...": "#ccc"
  };

  const renderExpressionGraph = () => {
    if (!expressions) return null;

    return (
      <div className="expression-graph">
        {Object.entries(expressions).map(([expr, prob]) => (
          <div key={expr} className="expression-bar">
            <div className="expression-label">
              <span className="expression-name">{expr.charAt(0).toUpperCase() + expr.slice(1)}</span>
              <span className="expression-percent">{Math.round(prob * 100)}%</span>
            </div>
            <div className="expression-track">
              <div
                className="expression-progress"
                style={{ width: `${prob * 100}%`, backgroundColor: expressionColors[expr] || "#000" }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const dominant = getDominantExpression();

  return (
  <div className="expression-tracker">
    <div className="camera-container">
      <video ref={videoRef} width="640" height="480" autoPlay muted playsInline className="camera-feed" />
      <canvas ref={canvasRef} width="640" height="480" className="overlay-canvas" />
    </div>

    <div className="right-panel">
      <div className="dominant-expression">
        <div className="expression-icon">{expressionEmojis[dominant.expression] || "❓"}</div>
        <div className="expression-text">
          <h2>{dominant.expression.charAt(0).toUpperCase() + dominant.expression.slice(1)}</h2>
          <p>{Math.round(dominant.probability * 100)}% confidence</p>
        </div>
      </div>

      <div className="expression-graph-container">
        <h3>Expression Analysis</h3>
        {renderExpressionGraph()}
      </div>
    </div>
  </div>
);

};

export default FaceExpressionTracker;
