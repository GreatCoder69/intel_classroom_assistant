require('dotenv').config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const path = require("path");
const { createProxyMiddleware } = require('http-proxy-middleware'); // Add this import for proxy functionality

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

// Modified proxy middleware with improved error handling
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
  },
  onProxyRes: async (proxyRes, req, res) => {
    // Only process POST requests to /api/chat or /api/query
    if (req.method === 'POST' && (req.path === '/api/chat' || req.path === '/api/query')) {
      // Store original end function
      const originalEnd = res.end;
      
      // Buffer to store the response body
      let responseBody = '';
      
      // Override the end function to intercept the response
      res.end = function(chunk) {
        if (chunk) {
          responseBody += chunk;
        }
        
        // Try to parse the response JSON
        try {
          // Check if response is empty or incomplete
          if (!responseBody || responseBody.trim() === '') {
            console.error('Empty response received from Flask server');
            // Set a fallback response to prevent JSON parse error
            responseBody = JSON.stringify({
              answer: "Sorry, I couldn't process your request due to a server communication error.",
              error: "Empty response from AI server",
              status: "error"
            });
          }
          
          // Add additional validation
          if (!responseBody.startsWith('{') || !responseBody.endsWith('}')) {
            console.error('Malformed JSON response:', responseBody);
            // Set a fallback response to prevent JSON parse error
            responseBody = JSON.stringify({
              answer: "Sorry, I couldn't process your request properly.",
              error: "Malformed response from AI server",
              status: "error"
            });
          }
          
          const responseData = JSON.parse(responseBody);
          const answer = responseData.answer || responseData.message;
          const imageUrl = responseData.file;
          const chatCategory = responseData.chatCategory || 'general';
          
          // Only save if we have an answer and the user is authenticated
          if (answer && req.userEmail) {
            const subject = req.body.subject;
            const question = req.body.question;
            const email = req.userEmail;
            
            // Get the Chat model
            const Chat = require('./app/models/chat.model');
            
            // Persist to MongoDB asynchronously (don't wait for completion)
            (async () => {
              try {
                const existing = await Chat.findOne({ _id: subject, email });
                const count = existing ? existing.chat.length : 0;
                
                const chatEntry = {
                  question: question || null,
                  imageUrl: imageUrl || null,
                  answer,
                  timestamp: new Date(),
                  pageNumber: Math.floor(count / 5) + 1,
                  entryNumber: (count % 5) + 1,
                  responseTime: responseData.latency || 0,
                  chatCategory
                };
                
                await Chat.findOneAndUpdate(
                  { _id: subject, email },
                  { $push: { chat: chatEntry }, $set: { lastUpdated: new Date(), email } },
                  { upsert: true, new: true }
                );
                
                console.log(`Chat saved to MongoDB: ${email} - ${subject} - ${question?.substring(0, 30)}...`);
                
                // Log the event
                const logEvent = require('./app/utils/logEvent');
                await logEvent({
                  email,
                  action: "create_chat",
                  message: `Message added to '${subject}'`,
                  meta: { chatCategory }
                });
              } catch (err) {
                console.error('Error saving chat to MongoDB:', err);
              }
            })();
          }
        } catch (err) {
          console.error('Error parsing proxy response:', err);
          console.error('Response body:', responseBody);
          
          // Send a fallback response to the client
          try {
            // Only modify the response if headers haven't been sent yet
            if (!res.headersSent) {
              // Set proper content type
              res.setHeader('Content-Type', 'application/json');
              
              // Create a fallback response
              const fallbackResponse = JSON.stringify({
                answer: "Sorry, I couldn't process your request. Please try again later.",
                error: "Internal server error",
                status: "error"
              });
              
              // Call original end with fallback response
              return originalEnd.call(res, fallbackResponse);
            }
          } catch (fallbackErr) {
            console.error('Error sending fallback response:', fallbackErr);
          }
        }
        
        // Call the original end function
        originalEnd.apply(res, arguments);
      };
    }
  },
  // Add error handler for the proxy itself
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    
    // Send error response if headers haven't been sent
    if (!res.headersSent) {
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        answer: "Sorry, there was an error connecting to the AI service.",
        error: "Proxy connection error",
        status: "error"
      }));
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
require("./app/routes/chat.routes")(app);
require("./app/routes/admin.routes")(app);
require("./app/routes/log.routes")(app);

// ✅ Upload route
const uploadRoutes = require("./app/routes/upload.routes");
app.use("/api", uploadRoutes);

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});