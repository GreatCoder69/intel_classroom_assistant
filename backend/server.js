require('dotenv').config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const path = require("path");

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

// Import routes
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