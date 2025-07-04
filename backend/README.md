# Backend

Flask-based backend API for Intel Classroom Assistant.

## Files

- `server.js` - Node.js Express server with authentication, chat, and user management
- `servers/server.py` - Python Flask server with basic AI chat functionality
- `servers/server_optimized.py` - Optimized Python server with model caching and memory management
- `servers/optimized_model_manager.py` - Model loading and inference utilities

## Structure

- `app/` - Node.js application (controllers, models, routes, middleware)
- `servers/` - Python Flask servers
- `uploads/` - File uploads directory

## Setup

### Node.js Server
```bash
npm install
npm start
```

### Python Server
```bash
pip install -r requirements.txt
python servers/server.py
# or optimized version:
python servers/server_optimized.py
```

## API Endpoints

- `/api/auth/*` - Authentication (signup, login, logout)
- `/api/chat` - Chat with AI assistant
- `/api/users/*` - User management
- `/api/admin/*` - Admin functions
