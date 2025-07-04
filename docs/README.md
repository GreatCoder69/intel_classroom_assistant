# Intel Classroom Assistant - Documentation

📚 **Comprehensive documentation** for the Intel Classroom Assistant platform, including guides, tutorials, and reference materials.

## 🌟 Overview

This directory contains detailed documentation for system administrators, developers, and end users of the Intel Classroom Assistant platform. The documentation covers database management, API references, deployment guides, and troubleshooting information.

## 📁 Documentation Structure

### 🗄️ **Database Management**
- **[MongoDB Guide](mongodb-guide.md)** - Complete MongoDB setup and management guide
- **Database schema documentation** - Collection structures and relationships
- **Migration guides** - Database upgrade and migration procedures

### 🛠️ **System Administration**
- **Deployment guides** - Production deployment instructions
- **Configuration management** - Environment setup and configuration
- **Monitoring and maintenance** - System health and performance monitoring

### 👨‍💻 **Developer Resources**
- **API documentation** - Complete REST API reference
- **Integration guides** - Third-party service integration
- **Contributing guidelines** - Development workflow and standards

### 👥 **User Guides**
- **Student user manual** - How to use the platform as a student
- **Teacher user manual** - Content management and teaching tools
- **Administrator guide** - User and system management

## 📚 Available Documents

### 🗄️ **[MongoDB Database Management Guide](mongodb-guide.md)**
Comprehensive guide for managing the MongoDB database:
- **MongoDB Compass** - GUI-based database management
- **Command line operations** - CLI-based database management
- **Backup and restore** - Data protection procedures
- **Performance optimization** - Database tuning and indexing
- **Security configuration** - Access control and authentication

**Quick Commands:**
```bash
# Connect to database
mongosh "mongodb://localhost:27017/intel_classroom_assistant"

# Backup database
mongodump --db intel_classroom_assistant --out backup/

# Restore database
mongorestore --db intel_classroom_assistant backup/intel_classroom_assistant/
```

## 🚀 Quick Reference

### 🌐 **API Endpoints Summary**
```
Authentication:
POST /api/auth/signin     # User login
POST /api/auth/signup     # User registration
GET  /api/auth/profile    # Get user profile

Chat & AI:
POST /api/chat           # Send message to AI
GET  /api/chat/history   # Get chat history

Subjects & Resources:
GET  /api/subjects       # List subjects
POST /api/subjects       # Create subject
POST /api/subjects/:id/upload  # Upload resources

Admin:
GET  /api/admin/stats    # System statistics
GET  /api/admin/users    # User management
```

### 🔧 **Configuration Templates**

**Environment Variables (.env)**
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
```

**AI Server Configuration (config.json)**
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
    "timeout": 60
  }
}
```

## 🛠️ System Requirements

### 📋 **Minimum Requirements**
- **OS**: Windows 10/11, Ubuntu 18.04+, macOS 10.15+
- **Node.js**: 18.0.0 or higher
- **Python**: 3.8.0 or higher
- **MongoDB**: 4.4.0 or higher
- **RAM**: 8 GB minimum, 16 GB recommended
- **Storage**: 10 GB free space minimum

### 🚀 **Recommended Specifications**
- **CPU**: Intel Core i5 or equivalent (4+ cores)
- **RAM**: 16 GB or more
- **Storage**: SSD with 50 GB free space
- **Network**: Stable internet connection for model downloads

## 📊 Performance Benchmarks

### ⚡ **Response Time Targets**
- **AI Chat Responses**: < 2 seconds average
- **File Upload**: < 30 seconds for 40MB files
- **Database Queries**: < 100ms for simple queries
- **Authentication**: < 500ms for login/logout

### 📈 **Scalability Metrics**
- **Concurrent Users**: Supports 100+ concurrent users
- **Daily Requests**: 10,000+ API requests per day
- **Storage**: Handles 10GB+ of educational resources
- **Uptime**: 99.9% availability target

## 🔧 Troubleshooting Guide

### ❌ **Common Issues**

**Database Connection Failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Check logs
sudo journalctl -u mongod
```

**AI Server Not Responding**
```bash
# Check server status
curl http://localhost:8000/api/health

# Check server logs
tail -f backend/servers/logs/classroom_assistant.log

# Restart AI server
python backend/servers/ultra_optimized_server.py
```

**High Memory Usage**
```bash
# Monitor system resources
python dev_utils/performance_monitor.py

# Force garbage collection
curl -X POST http://localhost:8000/api/admin/cleanup

# Check memory leaks
python -m memory_profiler backend/servers/ultra_optimized_server.py
```

### 🔧 **Performance Optimization**

**Database Optimization**
```javascript
// Create indexes for better query performance
db.users.createIndex({ "email": 1 });
db.chats.createIndex({ "userId": 1, "timestamp": -1 });
db.subjects.createIndex({ "name": 1 });
```

**AI Server Optimization**
```json
{
  "performance": {
    "max_workers": 8,        // Increase for more CPU cores
    "batch_size": 16,        // Increase for better throughput
    "memory_threshold": 75   // Adjust based on available RAM
  }
}
```

## 🚦 Deployment Guide

### 🌐 **Production Deployment**

1. **Server Setup**
   ```bash
   # Clone repository
   git clone https://github.com/your-org/intel-classroom-assistant.git
   cd intel-classroom-assistant
   
   # Install dependencies
   npm install
   pip install -r backend/servers/requirements_ultra_optimized.txt
   ```

2. **Environment Configuration**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Edit configuration
   nano .env
   ```

3. **Database Setup**
   ```bash
   # Start MongoDB
   sudo systemctl start mongod
   
   # Create database user
   mongosh --eval "db.createUser({user:'appuser', pwd:'password', roles:['readWrite']})"
   ```

4. **Start Services**
   ```bash
   # Start backend services
   npm start &
   python backend/servers/ultra_optimized_server.py &
   
   # Start frontend (if serving with Node.js)
   cd frontend && npm run build && npm run serve
   ```

### 🐳 **Docker Deployment**
```bash
# Build containers
docker-compose build

# Start all services
docker-compose up -d

# Monitor logs
docker-compose logs -f
```

## 📱 User Guide Highlights

### 👨‍🎓 **For Students**
- **Sign up** with student role to access learning features
- **Chat with AI** to get help with academic questions
- **Browse subjects** to find relevant educational materials
- **Access resources** uploaded by teachers
- **Track progress** through chat history and interactions

### 👩‍🏫 **For Teachers**
- **Create subjects** and organize course materials
- **Upload PDF resources** for AI-enhanced learning
- **Monitor student engagement** through admin dashboard
- **Manage class content** and educational resources
- **Access analytics** on student interactions

### 👨‍💼 **For Administrators**
- **Manage users** and assign roles
- **Monitor system health** and performance
- **View usage statistics** and analytics
- **Configure system settings** and optimizations
- **Manage backups** and data integrity

## 🔗 External Resources

### 📚 **Technology Documentation**
- **[MongoDB Documentation](https://docs.mongodb.com/)** - Database management
- **[Node.js Documentation](https://nodejs.org/docs/)** - Backend runtime
- **[React Documentation](https://reactjs.org/docs/)** - Frontend framework
- **[OpenVINO Documentation](https://docs.openvino.ai/)** - AI optimization
- **[Flask Documentation](https://flask.palletsprojects.com/)** - AI server framework

### 🛠️ **Development Tools**
- **[MongoDB Compass](https://www.mongodb.com/products/compass)** - Database GUI
- **[Postman](https://www.postman.com/)** - API testing
- **[VS Code](https://code.visualstudio.com/)** - Code editor
- **[Docker](https://www.docker.com/)** - Containerization

### 🔒 **Security Resources**
- **[OWASP Guidelines](https://owasp.org/)** - Web application security
- **[JWT Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)** - Token security
- **[MongoDB Security](https://docs.mongodb.com/manual/security/)** - Database security

## 🤝 Contributing to Documentation

### 📝 **How to Contribute**
1. **Identify gaps** in current documentation
2. **Create or update** relevant documentation files
3. **Follow markdown standards** for consistency
4. **Test examples** and code snippets
5. **Submit pull request** with documentation changes

### ✍️ **Writing Guidelines**
- **Clear headings** with proper hierarchy
- **Code examples** with syntax highlighting
- **Step-by-step instructions** for procedures
- **Screenshots** where helpful
- **Links** to external resources

### 🔍 **Review Process**
- Technical accuracy review
- Clarity and readability check
- Example validation
- Link verification
- Consistency with existing docs

For more information on contributing, see the main [Contributing Guide](../README.md#contributing).
