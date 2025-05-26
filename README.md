# Intel Classroom Assistant

AI-Powered classroom assistant using OpenVINO™ optimized models for speech recognition and LLM-based responses.

## Project Overview

The Intel Classroom Assistant is an AI-powered educational tool that combines speech recognition with large language models to create an interactive learning experience. The project was developed as part of the Intel Unnati Hackathon AI Classroom Challenge, focusing on creating innovative educational tools using OpenVINO™ optimization technologies.

### Key Features

- **Voice-Activated AI Assistant**: Ask questions verbally and get instant answers
- **Real-time Speech Recognition**: Using Vosk for efficient, offline speech-to-text
- **OpenVINO™ Optimized LLMs**: Leveraging Intel's optimization technology for efficient AI inference
- **Modern Web Interface**: React-based UI for an intuitive classroom experience

## Technology Stack

### Backend (Python)
- **Flask**: Lightweight web server
- **Vosk**: Speech recognition model
- **OpenVINO™**: Intel's toolkit for optimizing and deploying AI models
- **Optimum Intel**: Integration layer for running optimized transformers
- **SoundDevice**: Audio processing for microphone input

### Frontend (JavaScript/React)
- **React**: UI framework
- **Bootstrap**: Responsive design components
- **Vite**: Modern frontend tooling

## Project Structure

```
intel_classroom_assistant/
├── server.py                     # Flask server with API endpoints
├── llmtest.py                    # LLM testing script
├── mictest.py                    # Voice recognition testing script
├── llm+mic_test.py               # Combined test script
├── classroom-assistant/          # Frontend React application
│   ├── src/                      # React source code
│   │   ├── App.jsx               # Main application component
│   │   └── ...                   # Other React components and styles
│   ├── package.json              # Frontend dependencies
│   └── ...                       # Other frontend configuration files
└── documentation/                # Project documentation
```

## How it Works

1. The user speaks a question into their microphone
2. Vosk speech recognition converts speech to text
3. The text query is processed by an OpenVINO-optimized LLM
4. The system returns an appropriate response through the UI

## Setup Instructions

### Prerequisites
- Python 3.8+ with pip
- Node.js 18+ with npm
- OpenVINO™ Runtime
- Vosk speech recognition model

### Backend Setup
1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd intel_classroom_assistant
   ```

2. Install Python dependencies:
   ```bash
   pip install flask flask-cors vosk sounddevice transformers optimum[openvino]
   ```

3. Download the Vosk speech model:
   ```bash
   # Download and extract to project directory
   wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
   unzip vosk-model-small-en-us-0.15.zip
   ```

4. Start the Flask server:
   ```bash
   python server.py
   ```

### Frontend Setup
1. Navigate to the React application:
   ```bash
   cd classroom-assistant
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open a browser and navigate to `http://localhost:5173`

## Usage

1. Launch both the backend server and frontend application
2. Click the microphone button to ask a question verbally
3. Alternatively, type your question in the text input field
4. Receive AI-powered responses based on your queries

## Performance Considerations

- The system uses OpenVINO™ optimized models to enable efficient inference even on systems without dedicated GPUs
- Different LLM models can be swapped based on hardware capabilities:
  - Neural Chat 7B (FP16/INT8): High quality but requires more memory
  - DeepSeek 1.5B (INT4): Faster, more lightweight option

## Future Enhancements

- Classroom-specific knowledge base integration
- Student tracking and personalized learning paths
- Integration with educational content providers
- Offline mode for areas with limited connectivity