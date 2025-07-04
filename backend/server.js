require('dotenv').config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const path = require("path");
const { createProxyMiddleware } = require('http-proxy-middleware'); // Add this import

const app = express();

// Enable CORS
app.use(cors());

// Parse requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Serve static files from /uploads
const uploadDir = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, uploadDir)));

// Default route
app.get("/", (req, res) => {
  res.json({ message: "Welcome to the backend server." });
});

// MongoDB connection
const db = require("./app/models");

db.mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  })

// Suppress deprecation warnings
process.noDeprecation = true;

// Configure proxy for chat-related endpoints
const FLASK_SERVER = process.env.FLASK_SERVER || 'http://localhost:8000';
const chatProxy = createProxyMiddleware({
  target: FLASK_SERVER,
  changeOrigin: true,
  pathRewrite: {
    '^/api/chat': '/api/chat'
  },
  onProxyReq: (proxyReq, req, res) => {
    // Add user info from JWT to proxy request if available
    if (req.userEmail) {
      proxyReq.setHeader('X-User-Email', req.userEmail);
    }
    if (req.userId) {
      proxyReq.setHeader('X-User-ID', req.userId);
    }
    if (req.userRole) {
      proxyReq.setHeader('X-User-Role', req.userRole);
    }
    
    // Handle JSON body properly
    if (req.body && Object.keys(req.body).length > 0) {
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Type', 'application/json');
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  }
});

// Apply the proxy middleware to chat endpoints
app.use('/api/chat', chatProxy);
app.use('/api/query', chatProxy);
app.use('/api/listen', createProxyMiddleware({ target: FLASK_SERVER, changeOrigin: true }));

// Import routes for non-chat functionality
require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);
// require("./app/routes/chat.routes")(app); // Comment out the original chat routes
require("./app/routes/admin.routes")(app);
require("./app/routes/log.routes")(app);

// ✅ Upload route
const uploadRoutes = require("./app/routes/upload.routes");
app.use("/api", uploadRoutes);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  console.log(`Chat requests proxied to Flask server at ${FLASK_SERVER}`);
});
