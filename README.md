
# Intel Classroom Assistant

AI-powered classroom assistant with text-based chat interface, built with React and Python.

## Features

- Text-based chat interface
- OpenVINO-optimized AI models for fast responses
- Multi-subject support (math, science, language arts)
- Role-based access (students and teachers)
- User authentication and management
- Modern, responsive UI

## Tech Stack

- **Frontend**: React, Vite, Bootstrap
- **Backend**: Python Flask, Node.js Express
- **AI**: OpenVINO optimized models (DeepSeek-R1-Distill-Qwen-1.5B)
- **Database**: MongoDB

## Project Structure

```
intel_classroom_assistant/
├── frontend/                 # React frontend
├── backend/                  # Flask + Node.js backend
│   ├── server.js            # Main Node.js server
│   ├── app/                 # Express routes, controllers, models
│   └── servers/             # Python Flask servers
├── documentation/           # Project documentation
└── dev_utils/              # Development utilities
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd intel_classroom_assistant
   ```
   ```

2. **Backend Setup**
   ```bash
   # Node.js server
   cd backend
   npm install
   npm start
   
   # Python server (for AI chat)
   pip install flask flask-cors transformers psutil optimum[openvino]
   python servers/server_optimized.py
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the Application**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3000`
   - Python AI server: `http://localhost:8000`

## Usage

1. Start all servers (Node.js backend, Python AI server, React frontend)
2. Open the application in your browser
3. Sign up for a new account or login
4. Choose your role (student/teacher)
5. Start chatting with the AI assistant

## Development

- Backend routes are in `backend/app/routes/`
- Frontend components are in `frontend/src/components/`
- AI model management is in `backend/servers/optimized_model_manager.py`

## API Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/chat` - Chat with AI assistant
- `GET /api/users` - Get user profile
- `POST /api/admin/*` - Admin functions

## License

MIT License

## License

This project is licensed under the MIT License.
