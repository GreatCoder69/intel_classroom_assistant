# Intel Classroom Assistant - Backend

High-performance backend services for the Intel Classroom Assistant platform.

## Architecture Overview

The backend consists of two main services:

### Node.js Express Server
- Authentication and Authorization
- User Management
- File Upload and Processing
- Subject Management
- Database Operations

### AI Flask Server
- AI inference with caching and optimization
- Performance monitoring
- Model management

## Technology Stack

- Node.js + Express
- Python Flask
- MongoDB
- JWT Authentication
- Multer for file uploads

## Quick Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB

### Installation

1. Install dependencies
   ```bash
   npm install
   pip install -r ../requirements.txt
   ```

2. Environment variables
   Create `.env` file:
   ```bash
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/classroom_assistant
   ```

3. Start servers
   ```bash
   # Start main server
   npm start
   
   # Start AI server (in another terminal)
   cd servers
   python ultra_optimized_server.py
   ```

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `node seed_subjects.js` - Seed database with default subjects

## API Endpoints

### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signup` - User registration

### Chat & AI
- `POST /api/chat` - Send chat message
- `GET /api/chat/history` - Get chat history

### Subjects & Resources
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create new subject
- `POST /api/subjects/:id/resources` - Upload PDF resource
- `GET /api/subjects/:id/content` - Get extracted content

### Admin Functions
- `GET /api/admin/users` - List all users
- `POST /api/admin/toggle-status` - Toggle user status

## License

MIT License
