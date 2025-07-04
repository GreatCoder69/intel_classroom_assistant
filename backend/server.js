require('dotenv').config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(cors());

// Increase payload size limits for file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const uploadDir = process.env.UPLOAD_DIR || "uploads";
app.use("/uploads", express.static(path.join(__dirname, uploadDir)));

app.get("/", (req, res) => {
  res.json({ message: "Welcome to the backend server." });
});

const db = require("./app/models");
db.mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

require('./app/routes/auth.routes')(app);
require('./app/routes/user.routes')(app);
require("./app/routes/chat.routes")(app);
require("./app/routes/admin.routes")(app);
require("./app/routes/log.routes")(app);
require("./app/routes/subjects.routes")(app);
require("./app/routes/resources.routes")(app);

const uploadRoutes = require("./app/routes/upload.routes");
app.use("/api", uploadRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});