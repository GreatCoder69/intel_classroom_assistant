# Intel Classroom Assistant

AI-powered educational platform for enhanced classroom learning and teaching experiences.

## Features

### Core Functionality
- Smart AI Chat Interface - Intelligent tutoring with role-based responses
- Voice-to-Text - Speech transcription capability
- Subject Management - Organized learning by academic subjects  
- PDF Resource Integration - Upload and AI-process educational materials
- User Authentication - Secure login for students and teachers
- Performance Monitoring - System health tracking

### Role-Based Access
- **Students**: Interactive learning, resource access, AI tutoring
- **Teachers**: Content management, resource upload, class administration
- **Admins**: System management, user oversight, analytics

## Architecture

```
intel_classroom_assistant/
├── frontend/              # React.js Application
│   ├── src/components/    # UI components
│   ├── src/pages/        # Route pages
│   └── src/styles/       # CSS styling
├── backend/              # Backend Services
│   ├── server.js         # Main Node.js server
│   ├── app/             # Express application
│   └── servers/         # AI Flask servers
├── docs/                # Documentation
└── uploads/             # File storage
```

## Technology Stack

### Frontend
- React 18 - Modern UI framework
- Vite - Fast build tool and dev server
- Bootstrap 5 - Responsive CSS framework
- Axios - HTTP client for API communication

### Backend
- Node.js + Express - Main API server
- Python Flask - AI inference server
- MongoDB - Document database
- JWT - Authentication tokens

### AI & Optimization
- OpenVINO Toolkit - Model optimization
- Vosk - Speech recognition
- Intelligent caching and batch processing

## Quick Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB

### Installation

1. **Clone repository**
   ```bash
   git clone <repository-url>
   cd intel_classroom_assistant
   ```

2. **Backend setup**
   ```bash
   cd backend
   npm install
   ```

3. **Frontend setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Python AI server setup**
   ```bash
   cd backend/servers
   pip install -r requirements_ultra_optimized.txt
   ```

5. **Environment variables**
   Create `.env` file in backend directory:
   ```bash
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/classroom_assistant
   GEMINI_API_KEY=your_google_api_key
   GOOGLE_CSE_ID=your_custom_search_engine_id
   ```

### Running the Application

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start AI server**
   ```bash
   cd backend/servers
   python ultra_optimized_server.py
   ```

3. **Start backend**
   ```bash
   cd backend
   npm start
   ```

4. **Start frontend**
   ```bash
   cd frontend
   npm run dev
   ```

## Usage

1. **Access the application** at `http://localhost:5173`
2. **Register/Login** as student, teacher, or admin
3. **Start chatting** with the AI assistant
4. **Upload PDFs** for enhanced context
5. **Use voice-to-text** for natural interaction

## API Configuration

### Google APIs (Optional)
For enhanced suggestions feature:
- **YouTube Data API v3** - Video search results
- **Custom Search API** - Web search results

Without these APIs, the application provides fallback search links.

## Performance Features

- **50% Memory Reduction** through advanced caching
- **40-60% Faster Response Times** with intelligent batching
- **Connection Pooling** for database optimization
- **Background Processing** for file operations

## License

MIT License - see LICENSE file for details
