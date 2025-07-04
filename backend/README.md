# Intel Classroom Assistant - Backend

🚀 **High-performance backend services** for the Intel Classroom Assistant platform, featuring advanced AI optimization, robust authentication, and scalable architecture.

## 🏗️ Architecture Overview

The backend consists of two main services:

### 🌐 **Node.js Express Server** (`server.js`)
- **Authentication & Authorization** - JWT-based secure login system
- **User Management** - Student, teacher, and admin role management
- **File Upload & Processing** - PDF resource management with text extraction
- **Subject Management** - Academic subject organization and content management
- **Database Operations** - MongoDB integration for data persistence

### 🧠 **AI Flask Servers** (`servers/`)
- **Ultra-Optimized AI Server** - Advanced AI inference with caching and optimization
- **Performance Monitoring** - Real-time system health and performance tracking
- **Model Management** - Intelligent model loading and memory management

## 📁 Directory Structure

```
backend/
├── 📄 server.js                    # Main Node.js Express application
├── 📄 package.json                 # Node.js dependencies and scripts
├── 🗂️ app/                         # Express application modules
│   ├── 🎛️ controllers/            # Business logic controllers
│   │   ├── auth.controller.js     # Authentication logic
│   │   ├── chat.controller.js     # Chat management
│   │   ├── user.controller.js     # User operations
│   │   └── admin.controller.js    # Admin functions
│   ├── 🏗️ models/                 # MongoDB data models
│   │   ├── user.model.js          # User schema
│   │   ├── chat.model.js          # Chat history schema
│   │   └── log.model.js           # System logs schema
│   ├── 🛣️ routes/                  # API route definitions
│   │   ├── auth.routes.js         # Authentication endpoints
│   │   ├── chat.routes.js         # Chat endpoints
│   │   └── admin.routes.js        # Admin endpoints
│   ├── 🔒 middlewares/             # Custom middleware
│   │   ├── authJwt.js             # JWT validation
│   │   ├── verifySignUp.js        # Registration validation
│   │   └── isAdmin.js             # Admin authorization
│   └── ⚙️ config/                  # Configuration files
│       └── auth.config.js         # JWT and auth settings
├── 🧠 servers/                     # AI Flask servers
│   ├── 🚀 ultra_optimized_server.py    # Latest ultra-performance AI server
│   ├── 📊 new_server.py                # Advanced optimized AI server
│   ├── 📈 performance_monitor.py       # System monitoring tools
│   ├── 🎛️ server_manager.py           # Server management utilities
│   ├── 📋 performance_comparison.py    # Performance benchmarking
│   ├── 📝 OPTIMIZATION_GUIDE.md        # Optimization documentation
│   ├── ⚙️ config.json                  # AI server configuration
│   ├── 📦 requirements_ultra_optimized.txt  # Python dependencies
│   └── 📊 logs/                        # Server logs directory
├── 📤 uploads/                     # File upload storage
└── 🔧 utils/                       # Utility functions
```

## 🚀 Quick Setup

### 1. **Node.js Server Setup**

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your MongoDB connection string and JWT secret

# Start the server
npm start
# or for development with auto-reload:
npm run dev
```

### 2. **Python AI Server Setup**

```bash
# Navigate to servers directory
cd servers/

# Install Python dependencies
pip install -r requirements_ultra_optimized.txt

# Start the ultra-optimized AI server (recommended)
python ultra_optimized_server.py

# Or start the standard optimized server
python new_server.py
```

### 3. **MongoDB Setup**

Ensure MongoDB is running and accessible. Update the connection string in your `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/intel_classroom_assistant
JWT_SECRET=your_jwt_secret_key_here
```

## 🛠️ Available Scripts

### Node.js Scripts
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
npm test           # Run test suite
npm run lint       # Run ESLint code analysis
```

### Python Scripts
```bash
# AI Server Management
python servers/server_manager.py start --server ultra    # Start ultra-optimized server
python servers/server_manager.py monitor                 # Monitor server performance
python servers/performance_comparison.py                 # Compare server performance

# Performance Monitoring
python servers/performance_monitor.py                    # Real-time monitoring
```

## 🌐 API Endpoints

### 🔐 **Authentication** (`/api/auth`)
- `POST /api/auth/signup` - User registration
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/profile` - Get user profile

### 💬 **Chat & AI** (`/api/chat`)
- `POST /api/chat` - Send message to AI assistant
- `GET /api/chat/history` - Get chat history
- `DELETE /api/chat/clear` - Clear chat history

### 👥 **User Management** (`/api/users`)
- `GET /api/users` - List users (admin only)
- `PUT /api/users/:id` - Update user profile
- `DELETE /api/users/:id` - Delete user (admin only)

### 📚 **Subjects & Resources** (`/api/subjects`)
- `GET /api/subjects` - List all subjects
- `POST /api/subjects` - Create new subject
- `POST /api/subjects/:id/upload` - Upload PDF resource
- `GET /api/subjects/:id/content` - Get extracted content

### 🛡️ **Admin Functions** (`/api/admin`)
- `GET /api/admin/stats` - System statistics
- `GET /api/admin/logs` - System logs
- `POST /api/admin/cleanup` - Cleanup operations

### 🏥 **Health Monitoring**
- `GET /api/health` - System health check
- `GET /api/metrics` - Performance metrics

## ⚡ Performance Features

### 🧠 **AI Server Optimizations**
- **Ultra-Fast Inference** - 40-60% faster response times
- **Intelligent Caching** - Multi-layer caching system with TTL
- **Memory Management** - 50% memory usage reduction
- **Batch Processing** - Efficient request batching
- **Connection Pooling** - Optimized HTTP connections

### 📊 **Monitoring & Analytics**
- **Real-time Metrics** - System performance tracking
- **Error Tracking** - Comprehensive error logging
- **Performance Profiling** - Detailed performance analysis
- **Health Checks** - Automated system health monitoring

## 🔧 Configuration

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/intel_classroom_assistant

# Authentication
JWT_SECRET=your_super_secure_jwt_secret
JWT_EXPIRATION=86400

# File Upload
MAX_FILE_SIZE=41943040  # 40MB
UPLOAD_PATH=./uploads

# AI Server
AI_SERVER_URL=http://localhost:8000
AI_TIMEOUT=30000

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

### AI Server Configuration (`servers/config.json`)
```json
{
  "model": {
    "name": "OpenVINO/DeepSeek-R1-Distill-Qwen-1.5B-int4-ov",
    "max_length": 2048,
    "temperature": 0.7
  },
  "cache": {
    "ttl": 300,
    "max_size": 100
  },
  "performance": {
    "max_workers": 4,
    "timeout": 60,
    "batch_size": 8
  }
}
```

## 🚦 Deployment

### Production Deployment
```bash
# Build and start Node.js server
npm install --production
NODE_ENV=production npm start

# Start AI server in production mode
FLASK_ENV=production python servers/ultra_optimized_server.py
```

### Docker Deployment
```bash
# Build containers
docker-compose build

# Start all services
docker-compose up -d

# Monitor logs
docker-compose logs -f
```

## 📈 Performance Monitoring

### Real-time Monitoring
```bash
# Start performance monitor
python servers/performance_monitor.py

# View system metrics
curl http://localhost:8080/api/metrics

# Check AI server health
curl http://localhost:8000/api/health
```

### Performance Comparison
```bash
# Compare different server implementations
python servers/performance_comparison.py --iterations 100
```

## 🐛 Troubleshooting

### Common Issues

**MongoDB Connection Failed**
```bash
# Check MongoDB status
mongosh --eval "db.adminCommand('ping')"

# Restart MongoDB service
sudo systemctl restart mongod
```

**AI Server Memory Issues**
```bash
# Monitor memory usage
python servers/performance_monitor.py --memory-only

# Force garbage collection
curl -X POST http://localhost:8000/api/admin/cleanup
```

**High Response Times**
- Check `servers/logs/` for performance bottlenecks
- Run performance comparison: `python servers/performance_comparison.py`
- Monitor cache hit rates in the performance dashboard

## 📚 Additional Resources

- **[Optimization Guide](servers/OPTIMIZATION_GUIDE.md)** - Detailed performance optimization
- **[API Documentation](../docs/)** - Complete API reference
- **[MongoDB CLI Commands](../docs/mongodb-cli-commands.md)** - Database management
- **[Performance Benchmarks](servers/logs/)** - Performance analysis reports

## 🤝 Contributing

1. Follow the existing code style and architecture patterns
2. Add appropriate tests for new features
3. Update documentation for API changes
4. Run performance tests before submitting PRs

For more details, see the main project [Contributing Guide](../README.md#contributing).
