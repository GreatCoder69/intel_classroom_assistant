# Intel Classroom Assistant

AI-powered classroom assistant using OpenVINO™ for LLM optimization and Vosk for speech recognition.

## Key Features

- **Voice & Text Input**: Ask questions verbally or through text
- **OpenVINO™ Optimization**: Efficient AI inference on standard hardware
- **Multi-subject Support**: Assistance across mathematics, science, language arts, history, and computer science
- **Role-Based Access**: Separate interfaces for students and teachers
- **Secure Authentication**: Password-based login system
- **Responsive UI**: Modern React-based interface

## Tech Stack

**Backend**: Python, Flask, Vosk, OpenVINO™, Threading  
**Frontend**: React, Bootstrap, Vite, React Router

## Architecture

- **Authentication**: Role-based user authentication system
- **Speech Recognition**: Vosk model converts speech to text
- **LLM Processing**: OpenVINO-optimized model generates educational responses
- **Memory Management**: Optimized for efficiency with timeout handling

## Setup

### Requirements
- Python 3.8+, Node.js 18+
- Microphone (for speech features)

### Quick Start

1. **Backend**:
   ```bash
   # Clone and navigate to repo
   # Setup Python venv (recommended)
   pip install flask flask-cors vosk sounddevice transformers psutil optimum[openvino]
   
   # Download Vosk model
   curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
   Expand-Archive -Path vosk-model-small-en-us-0.15.zip -DestinationPath .
   
   # Start server
   python server.py
   ```

2. **Frontend**:
   ```bash
   cd classroom-assistant
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173` in your browser

## Usage

1. Launch both backend server and frontend application
2. On the login page, use the following credentials:
   - For Student access: Username `student`, Password `student`
   - For Teacher access: Username `teacher`, Password `teacher`
3. After login, navigate through the application using the sidebar
4. Use microphone button or text input to ask questions
5. Receive educational responses powered by LLM

## License
[Specify license information]

## Acknowledgments
- Intel for OpenVINO™ technology and support
- Vosk project for speech recognition
- Intel Unnati Hackathon for the opportunity