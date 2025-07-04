const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const express = require('express');
const app = express();
app.use(express.json());

const db = {};

db.mongoose = mongoose;
db.user = require("./user.model");
db.userLog = require("./log.model"); // ✅ Register the log model
db.subject = require("./subject.model"); // ✅ Register the subject model
db.chat = require("./chat.model"); // ✅ Register the chat model (legacy)
db.chatMessage = require("./chatMessage.model"); // ✅ Register the new chat message model

module.exports = db;
