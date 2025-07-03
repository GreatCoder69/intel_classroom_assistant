const mongoose = require('mongoose');
mongoose.Promise = global.Promise;

const express = require('express');
const app = express();
app.use(express.json());

const db = {};

db.mongoose = mongoose;
db.user = require("./user.model");
db.userLog = require("./log.model"); // ✅ Register the log model

module.exports = db;
