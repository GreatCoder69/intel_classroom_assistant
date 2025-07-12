require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require('compression');
const winston = require("winston");
const fs = require('fs');

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level.toUpperCase()}] ${stack || message}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message }) => {
          return `${timestamp} [${level}] ${message}`;
        })
      )
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'server.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

const app = express();

app.use(cors());

app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substr(2, 9);
  
  req.requestId = requestId;
  req.startTime = start;
  req.logger = logger;

  if (!req.path.startsWith('/uploads') && req.path !== '/') {
    logger.info(`[${requestId}] ${req.method} ${req.path} - Request started`, {
      method: req.method,
      path: req.path,
      userAgent: req.get('user-agent')?.substring(0, 50),
      ip: req.ip,
      contentType: req.get('content-type')
    });
  }
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    if (!req.path.startsWith('/uploads') && req.path !== '/') {
      const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
      const statusEmoji = res.statusCode >= 500 ? '🔴' : res.statusCode >= 400 ? '🟡' : '🟢';
      
      logger[logLevel](`[${requestId}] ${req.method} ${req.path} - ${statusEmoji} ${res.statusCode} (${duration}ms)`, {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: duration,
        contentLength: res.get('content-length')
      });
    }
  });
  
  next();
});

// Disable Express ETag generation for real-time responses
app.set('etag', false);

// Add response compression but with appropriate settings for real-time
app.use(compression({
  filter: (req, res) => {
    // Don't compress real-time chat responses
    if (req.path.includes('/api/chat')) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Increase payload size limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadDir = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, uploadDir)));

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the backend server." });
});

const db = require("./app/models");

logger.info("🔌 Connecting to MongoDB...");
db.mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    logger.info("MongoDB connected successfully");
  })
  .catch((err) => {
    logger.error("MongoDB connection failed:", err);
    process.exit(1);
  });

db.mongoose.connection.on('connected', () => {
  logger.info("🔗 Mongoose connected to MongoDB");
});

db.mongoose.connection.on('error', (err) => {
  logger.error("🔥 Mongoose connection error:", err);
});

db.mongoose.connection.on('disconnected', () => {
  logger.warn("📡 Mongoose disconnected from MongoDB");
});

logger.info("🛣️  Loading routes...");

try {
  require('./app/routes/auth.routes')(app);
  logger.debug("Auth routes loaded");
} catch (err) {
  logger.error("Failed to load auth routes:", err.message);
  throw err;
}

try {
  require('./app/routes/user.routes')(app);
  logger.debug("User routes loaded");
} catch (err) {
  logger.error("Failed to load user routes:", err.message);
  throw err;
}

try {
  require("./app/routes/chat.routes")(app);
  logger.debug("Chat routes loaded");
} catch (err) {
  logger.error("Failed to load chat routes:", err.message);
  throw err;
}

try {
  require("./app/routes/admin.routes")(app);
  logger.debug("Admin routes loaded");
} catch (err) {
  logger.error("Failed to load admin routes:", err.message);
  throw err;
}

try {
  require("./app/routes/log.routes")(app);
  logger.debug("Log routes loaded");
} catch (err) {
  logger.error("Failed to load log routes:", err.message);
  throw err;
}

try {
  require("./app/routes/subjects.routes")(app);
  logger.debug("Subjects routes loaded");
} catch (err) {
  logger.error("Failed to load subjects routes:", err.message);
  throw err;
}

try {
  require("./app/routes/resources.routes")(app);
  logger.debug("Resources routes loaded");
} catch (err) {
  logger.error("Failed to load resources routes:", err.message);
  throw err;
}

try {
  require("./app/routes/suggestion.routes")(app);
  logger.debug("Suggestion routes loaded");
} catch (err) {
  logger.error("Failed to load suggestion routes:", err.message);
  throw err;
}

try {
  const uploadRoutes = require("./app/routes/upload.routes");
  app.use("/api", uploadRoutes);
  logger.debug("Upload routes loaded");
} catch (err) {
  logger.error("Failed to load upload routes:", err.message);
  throw err;
}

logger.info("All routes loaded successfully");

// Global error handler
app.use((err, req, res, next) => {
  const requestId = req.requestId || 'unknown';
  logger.error(`[${requestId}] Unhandled error:`, {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: requestId,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  const requestId = req.requestId || 'unknown';
  logger.warn(`[${requestId}] 404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    requestId: requestId
  });
});

const PORT = process.env.PORT || 8080;

try {
  logger.info("🔄 Starting server...");
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Intel Classroom Assistant Backend Server started`);
    logger.info(`📍 Server running on port ${PORT}`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🔧 Log level: ${logger.level}`);
    logger.info(`📂 Upload directory: ${process.env.UPLOAD_DIR || "uploads"}`);
    logger.info(`🐍 Python server URL: ${process.env.FLASK_SERVER || "http://localhost:8000"}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    logger.info('🛑 SIGTERM received, shutting down gracefully...');
    server.close(() => {
      logger.info('✅ Process terminated');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    logger.info('🛑 SIGINT received, shutting down gracefully...');
    server.close(() => {
      logger.info('✅ Process terminated');
      process.exit(0);
    });
  });
} catch (err) {
  logger.error("❌ Failed to start server:", err.message);
  logger.error("Stack trace:", err.stack);
  process.exit(1);
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});