import React, { useRef, useEffect, useState } from 'react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks, FACEMESH_TESSELATION } from '@mediapipe/drawing_utils';

const FaceMeshExpressionTracker = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const cameraRef = useRef(null);
  const [expression, setExpression] = useState("Detecting...");

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      const canvasCtx = canvasRef.current.getContext('2d');
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];

        // Draw mesh
        drawConnectors(canvasCtx, landmarks, FACEMESH_TESSELATION, {
          color: '#00FF00',
          lineWidth: 0.5,
        });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1 });

        // Expression logic (simple heuristic)
        const topLip = landmarks[13];
        const bottomLip = landmarks[14];
        const leftEyebrow = landmarks[65];
        const leftEye = landmarks[159];
        const rightEyebrow = landmarks[295];
        const rightEye = landmarks[386];

        const mouthOpen = Math.abs(bottomLip.y - topLip.y);
        const leftEyeOpen = Math.abs(leftEyebrow.y - leftEye.y);
        const rightEyeOpen = Math.abs(rightEyebrow.y - rightEye.y);

        if (mouthOpen > 0.05 && leftEyeOpen > 0.02 && rightEyeOpen > 0.02) {
          setExpression("Surprised 😲");
        } else if (mouthOpen > 0.03) {
          setExpression("Happy 😊");
        } else {
          setExpression("Neutral 😐");
        }
      }

      canvasCtx.restore();
    });

    if (typeof videoRef.current !== 'undefined' && videoRef.current !== null) {
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          await faceMesh.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });

      cameraRef.current.start();
    }

    return () => {
      if (cameraRef.current) cameraRef.current.stop();
    };
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 640, height: 480, margin: 'auto' }}>
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          className="input_video"
        />
        <canvas
          ref={canvasRef}
          className="output_canvas"
          width={640}
          height={480}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      </div>
      <div style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>
        Facial Expression: {expression}
      </div>
    </div>
  );
};

export default FaceMeshExpressionTracker;
  