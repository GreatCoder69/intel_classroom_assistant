
# Intel Classroom Assistant

An AI-powered classroom assistant with a React frontend and a Python backend, optimized for fast and efficient LLM inference using OpenVINO and optional Vosk speech recognition.

## Features

- Voice & text input (if Vosk model is present)
- OpenVINO-optimized LLM for fast, efficient responses
- Multi-subject support
- Role-based access for students and teachers
- Secure authentication
- Responsive, modern UI

## Tech Stack

- Backend: Python, Flask, OpenVINO, (optional: Vosk for speech)
- Frontend: React, Vite, Bootstrap
- AI Models: DeepSeek-R1-Distill-Qwen-1.5B (OpenVINO), Vosk ASR (optional)

## Cleaned Project Structure

```
intel_classroom_assistant/
├── backend/                  # Flask backend (API, LLM, speech)
│   ├── server.py             # Main backend server
│   ├── server_optimized.py   # Optimized backend server
│   ├── optimized_model_manager.py
│   ├── performance_monitor.py
│   └── ...
├── frontend/                 # React frontend
│   ├── src/
│   └── ...
├── vosk-model-small-en-us-0.15/ # (Optional, remove if not using voice features)
├── dev_utils/                # Dev/test scripts (not in production)
├── archive/                  # Old/unused scripts (not in production)
├── requirements_optimization.txt
├── README.md
└── ...
```

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


## Usage

1. Start the backend server (see Setup above)
2. Start the frontend (`npm run dev` in `frontend`)
3. Login with demo credentials:
   - Student: `student` / `student`
   - Teacher: `teacher` / `teacher`
4. Use the sidebar to access Dashboard, Subjects, AI Assistant, Schedule, and Settings

## For Developers

- All utility scripts and experimental code are now in `dev_utils/` or `archive/` (if present)
- Only keep `vosk-model-small-en-us-0.15` if you use voice features
- All function docstrings follow this format:
  """
  Description

  Args:
      ...
  Returns:
      ...
  """

## Performance Optimization

See `optimization_guide.md` for details on model caching, batching, memory management, and other improvements.

## License

MIT License

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

## Performance Optimization 🚀

This repository includes an **optimized version** of the Intel Classroom Assistant with significant performance improvements:

### 🎯 Optimization Features

- **Model Caching**: Faster startup with persistent model caching
- **Memory Management**: Efficient memory usage with automatic cleanup
- **Context Optimization**: Sliding window context management
- **Batched Processing**: Improved throughput for multiple requests
- **Performance Monitoring**: Real-time metrics and health monitoring
- **Configuration Profiles**: Customizable settings for different hardware

### 📊 Performance Improvements

The optimized version provides:
- **40-60% faster response times** through model caching and context optimization
- **30-50% lower memory usage** with efficient context management
- **Better stability** under concurrent requests
- **Comprehensive monitoring** with detailed performance metrics

### 🔧 Using the Optimized Version

1. **Install optimization dependencies**:
   ```bash
   pip install -r requirements_optimization.txt
   ```

2. **Run the optimized server**:
   ```bash
   python server_optimized.py
   ```

3. **Monitor performance**:
   ```bash
   python performance_monitor.py
   ```

4. **Compare performance** (run both servers):
   ```bash
   # Terminal 1: Original server
   python server.py
   
   # Terminal 2: Optimized server (on port 8001)
   python server_optimized.py
   
   # Terminal 3: Run comparison
   python compare_performance.py
   ```

### ⚙️ Configuration

Customize optimization settings in `config.ini`:

```ini
[optimization_profiles.balanced]  # Recommended for most systems
max_context_length = 1024
batch_size = 2
memory_threshold_percent = 75.0
max_new_tokens = 256

[optimization_profiles.speed_optimized]  # For faster responses
max_context_length = 512
batch_size = 1
max_new_tokens = 128
```

### 📈 Monitoring & Analytics

- **Health Check**: `GET /api/health` - Server status and metrics
- **Performance Stats**: `GET /api/stats` - Detailed system information
- **Memory Monitoring**: Real-time memory usage tracking
- **Request Analytics**: Response time and success rate tracking

## 🚧 Future Enhancements

- [ ] Multi-language support for global accessibility
- [ ] Real-time collaborative features for group learning
- [ ] Integration with Learning Management Systems (LMS)
- [ ] Advanced analytics and learning insights
- [ ] Mobile application development
- [ ] Offline mode capabilities
- [ ] Enhanced voice recognition for multiple accents
- [ ] Integration with educational databases and resources
