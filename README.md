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

**Backend**: Python, Flask, Vosk, OpenVINO™, Threading, psutil  
**Frontend**: React, Bootstrap, Vite, React Router, React Icons  
**AI Models**: DeepSeek-R1-Distill-Qwen-1.5B (OpenVINO optimized), Vosk ASR  
**Development**: ESLint, Vite development server, Hot module replacement

## Architecture

- **Authentication**: Role-based user authentication with localStorage persistence
- **Speech Recognition**: Vosk model for accurate speech-to-text conversion
- **LLM Processing**: OpenVINO-optimized language model for educational responses
- **Memory Management**: Efficient resource usage with garbage collection and timeout handling
- **Frontend Routing**: Protected routes with role-based access control
- **State Management**: React Context API for authentication and user state

## Setup

### Requirements
- Python 3.8+, Node.js 18+
- Microphone (for speech features)

### Quick Start

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd intel_classroom_assistant
   ```

2. **Backend Setup**:
   ```bash
   # Create and activate virtual environment (recommended)
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install flask flask-cors vosk sounddevice transformers psutil optimum[openvino]
   
   # Download Vosk speech recognition model
   curl -LO https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
   unzip vosk-model-small-en-us-0.15.zip
   
   # Start the backend server
   python server.py
   ```

3. **Frontend Setup**:
   ```bash
   cd classroom-assistant
   npm install
   npm run dev
   ```

4. **Access the Application**:
   - Open `http://localhost:5173` in your browser
   - Backend API runs on `http://localhost:8000`

## Usage Guide

### Getting Started
1. **Launch Services**: Start both backend server (`python server.py`) and frontend (`npm run dev`)
2. **Login**: Access the application and use demo credentials:
   - **Student Access**: Username `student`, Password `student`
   - **Teacher Access**: Username `teacher`, Password `teacher`
3. **Navigate**: Use the sidebar to access different features:
   - **Dashboard**: Overview of activities and schedule
   - **Subjects**: Browse available subjects with progress tracking
   - **AI Assistant**: Interactive chat with voice/text input
   - **Schedule**: View and manage class timetables
   - **Settings**: Configure preferences and system options

### Using the AI Assistant
- **Text Input**: Type questions directly in the chat interface
- **Voice Input**: Click the microphone button and speak your question
- **Educational Topics**: Ask about mathematics, science, history, literature, computer science
- **Role-Specific Responses**: Receive answers tailored to your role (student/teacher)

## Project Structure

```
intel_classroom_assistant/
├── server.py                 # Flask backend server with LLM and speech processing
├── classroom-assistant/       # React frontend application
│   ├── src/
│   │   ├── components/        # Reusable React components
│   │   ├── context/           # Authentication and state management
│   │   ├── pages/             # Application pages (Dashboard, Chat, etc.)
│   │   └── ...
├── content/                   # Additional content and configurations
├── documentation/             # Project documentation
├── vosk-model-small-en-us-0.15/ # Speech recognition model
├── mictest.py                 # Microphone functionality test
├── llmtest.py                 # LLM model test
├── llm+mic_test.py           # Combined speech and LLM test
└── README.md                  # This file
```

## Features by Role

### For Students
- **Interactive Learning**: Ask questions about any subject in natural language
- **Voice Recognition**: Hands-free interaction for better accessibility
- **Step-by-Step Explanations**: Complex topics broken down into understandable parts

### For Teachers
- **Lesson Planning Support**: Get help with curriculum development and teaching strategies
- **Differentiated Instruction**: Receive suggestions for various learning levels
- **Assessment Ideas**: Generate quiz questions and evaluation methods
- **Classroom Management**: Tips and strategies for effective teaching
- **Content Creation**: Help with educational materials and explanations

## Technical Details

### AI Model Information
- **Language Model**: DeepSeek-R1-Distill-Qwen-1.5B (OpenVINO optimized)
- **Speech Recognition**: Vosk small English model (15MB)
- **Optimization**: Intel OpenVINO™ for efficient CPU inference
- **Response Time**: Typically 1-3 seconds depending on query complexity

### Security Features
- Role-based authentication system
- Input validation and sanitization
- Secure session management
- Educational content filtering

## 🚧 Future Enhancements

- [ ] Multi-language support for global accessibility
- [ ] Real-time collaborative features for group learning
- [ ] Integration with Learning Management Systems (LMS)
- [ ] Advanced analytics and learning insights
- [ ] Mobile application development
- [ ] Offline mode capabilities
- [ ] Enhanced voice recognition for multiple accents
- [ ] Integration with educational databases and resources
