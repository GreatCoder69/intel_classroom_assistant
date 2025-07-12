# Intel Classroom Assistant

AI-powered educational platform for enhanced classroom learning and teaching experiences.

## Demo for the project
[View Project](https://drive.google.com/file/d/11sRZqKlo8bDoo9KVdPb2S3LApgh75vHY/view?usp=sharing)

## Features

### Core Functionality
- AI Chat Interface with intelligent tutoring
- Subject Management and resource organization
- PDF Resource Integration with AI processing
- User Authentication with role-based access
- Performance Monitoring

### Role-Based Access
- **Students**: Interactive learning and resource access
- **Teachers**: Content management and class administration
- **Admins**: System management and analytics

## Architecture

```
intel_classroom_assistant/
├── frontend/              # React.js Application
│   ├── src/components/    # UI components
│   ├── src/pages/         # Route pages
│   └── src/styles/        # CSS styling
├── backend/               # Backend Services
│   ├── server.js          # Main Node.js server
│   ├── app/              # Express application
│   └── servers/          # AI Flask servers
├── docs/                 # Documentation
└── uploads/              # File storage
```

## Technology Stack

### Frontend
- React 18
- Vite
- Bootstrap 5
- Axios

### Backend
- Node.js + Express
- Python Flask
- MongoDB
- JWT Authentication

## Quick Setup

### Prerequisites
- Node.js 18+
- Python 3.8+
- MongoDB

### Installation

1. Clone repository
   ```bash
   git clone <repository-url>
   cd intel_classroom_assistant
   ```

2. Install dependencies
   ```bash
   pip install -r requirements.txt
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. Environment variables
   Create `.env` file in backend directory:
   ```bash
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=mongodb://localhost:27017/classroom_assistant
   ```

### Running the Application

1. Start MongoDB
   ```bash
   mongod
   ```

2. Start AI server
   ```bash
   cd backend/servers
   python ultra_optimized_server.py
   ```

3. Start backend
   ```bash
   cd backend
   npm start
   ```

4. Start frontend
   ```bash
   cd frontend
   npm run dev
   ```

Access the application at `http://localhost:5173`

## License

MIT License
