require("dotenv").config(); // Load .env
const fs = require("fs");
const path = require("path");
const Chat = require("../models/chat.model");
const ChatMessage = require("../models/chatMessage.model"); // New chat message model
const User = require("../models/user.model");
const pdfParse = require("pdf-parse");
const LogEvent = require("../utils/logEvent");
const LogLLMError = require("../utils/logError");

const axios = require("axios");
const FLASK_SERVER = process.env.FLASK_SERVER || "http://localhost:8000";

// Enhanced logging for chat operations
const createChatLogger = () => {
  const winston = require("winston");
  const path = require("path");

  return winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(__dirname, "../../logs/chat.log"),
        maxsize: 10485760, // 10MB
        maxFiles: 3,
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });
};

let chatLogger;
try {
  chatLogger = createChatLogger();
} catch (error) {
  console.warn("Could not initialize Winston logger, falling back to console");
  chatLogger = console;
}

exports.getAllUsersWithChats = async (req, res) => {
  try {
    const chats = await Chat.find({}).sort({ lastUpdated: -1 });
    const userIds = chats.map((c) => c.email);
    const uniqueEmails = [...new Set(userIds)];

    const usersWithChats = await User.find({ email: { $in: uniqueEmails } });

    const result = await Promise.all(
      usersWithChats.map(async (user) => {
        const userChats = chats.filter((chat) => chat.email === user.email);
        return {
          name: user.name,
          email: user.email,
          profileimg: user.profileimg,
          isActive: user.isActive,
          chats: userChats.map((c) => ({
            subject: c._id,
            history: c.chat,
          })),
        };
      })
    );

    res.status(200).json(result);
  } catch (err) {
    console.error("Admin chat fetch error:", err);
    res.status(500).json({ message: "Error fetching user chats" });
  }
};

const MESSAGES_PER_PAGE = 5;

exports.addChat = async (req, res) => {
  const { subject, question, chatSubject, useResources, resourceContents } = req.body;
  const email = req.userEmail;
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  chatLogger.info(`[${requestId}] Chat request started`, {
    userEmail: email?.substring(0, 3) + "***",
    subject: subject?.substring(0, 30),
    hasQuestion: !!question,
    hasFile: !!req.file,
    chatSubject,
    useResources,
    questionLength: question?.length || 0,
  });

  if (!subject || (!question && !req.file) || !email) {
    chatLogger.warn(`[${requestId}] Missing required fields`, {
      hasSubject: !!subject,
      hasQuestion: !!question,
      hasFile: !!req.file,
      hasEmail: !!email,
    });
    return res.status(400).json({ message: "Missing subject, question/image/pdf, or email" });
  }

  try {
    const role = req.userRole || "student";
    const flaskPayload = { subject, question, role };

    if (chatSubject) {
      flaskPayload.chatSubject = chatSubject;
      flaskPayload.question = question
        ? `[Context: This question is about ${chatSubject}] ${question}`
        : `Please provide information about ${chatSubject}`;
    }

    if (useResources === "true" || useResources === true) {
      flaskPayload.useResources = true;
    }

    if (resourceContents) {
      flaskPayload.resourceContents = resourceContents;
      chatLogger.info(`📄 [${requestId}] Forwarding resource contents`, {
        contentLength: resourceContents.length,
        isString: typeof resourceContents === "string",
      });
    }

    let imageUrl = null;
    let mimeType = null;
    let base64Body = null;

    if (req.file) {
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowed.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      imageUrl = `/uploads/${req.file.filename}`;
      mimeType = req.file.mimetype;

      if (mimeType === "application/pdf") {
        const pdfText = (await pdfParse(fs.readFileSync(req.file.path))).text;
        console.log("📄 Extracted PDF content preview:", pdfText.slice(0, 300));
        flaskPayload.question = question
          ? `${question}\n\nThe user also uploaded the following document. Please analyze it:\n\n${pdfText}`
          : `The user uploaded a document. Analyze the content:\n\n${pdfText}`;
      } else {
        base64Body = fs.readFileSync(req.file.path).toString("base64");
        flaskPayload.mimeType = mimeType;
        flaskPayload.base64Image = base64Body;
      }
    }

    chatLogger.info(`🐍 [${requestId}] Calling Python Flask server`, {
      flaskServer: FLASK_SERVER,
      hasImage: !!base64Body,
      questionLength: flaskPayload.question?.length || 0,
      payloadSize: JSON.stringify(flaskPayload).length,
    });

    console.log("🔍 Final prompt sent to LLM:\n", flaskPayload.question);

    const t0 = Date.now();
    const flaskRes = await axios.post(
      `${FLASK_SERVER}/api/chat`,
      flaskPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": req.headers["x-access-token"] || req.token || "",
        },
        timeout: 45000,
        httpAgent: new (require("http").Agent)({
          keepAlive: true,
          maxSockets: 5,
        }),
      }
    );
    const responseTime = Date.now() - t0;

    chatLogger.info(`[${requestId}] AI response generated`, {
      responseTime: responseTime + "ms",
      statusCode: flaskRes.status,
      answerLength: flaskRes.data.answer?.length || 0,
      answerPreview: flaskRes.data.answer?.substring(0, 100) + "...",
    });

    const answer = flaskRes.data.answer || "No answer";
    const chatCategory = flaskRes.data.chatCategory || "general";

    const existing = await Chat.findOne({ _id: subject, email });
    const count = existing ? existing.chat.length : 0;

    const chatEntry = {
      question: question || null,
      imageUrl: imageUrl || null,
      answer,
      timestamp: new Date(),
      pageNumber: Math.floor(count / MESSAGES_PER_PAGE) + 1,
      entryNumber: (count % MESSAGES_PER_PAGE) + 1,
      responseTime,
      chatCategory,
      chatSubject: chatSubject || null,
      userRole: role,
    };

    await Chat.findOneAndUpdate(
      { _id: subject, email },
      { $push: { chat: chatEntry }, $set: { lastUpdated: new Date(), email } },
      { upsert: true, new: true }
    );

    try {
      const user = await User.findOne({ email });
      const newChatMessage = new ChatMessage({
        userId: user ? user._id.toString() : email,
        userEmail: email,
        userRole: role,
        message: question || "Image/File uploaded",
        response: answer,
        chatSubject: chatSubject || "General",
        subject: subject,
        imageUrl: imageUrl,
        mimeType: mimeType,
        responseTime: responseTime,
        modelUsed: "OpenVINO-DeepSeek-R1",
      });

      await newChatMessage.save();
    } catch (saveError) {
      console.error("Error saving chat message for statistics:", saveError);
    }

    res.set({
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.status(200).json({ answer, file: imageUrl, chatCategory });

    // Log events after response is sent to prevent any potential issues
    try {
      await LogEvent({
        email,
        action: "create_chat",
        message: `Message added to '${subject}'`,
        meta: { chatCategory },
      });
    } catch (logError) {
      console.error("Error logging event:", logError);
    }

    chatLogger.info(`[${requestId}] Chat request completed successfully`, {
      responseTime: responseTime + "ms",
      answerLength: answer?.length || 0,
      chatCategory,
    });

    return; // ✅ prevents further execution
  } catch (err) {
    if (!res.headersSent) {
      res.status(500).json({
        message: "LLM failure",
        detail: err.message,
        requestId: requestId,
      });
    }

    chatLogger.error(`[${requestId}] Chat request failed`, {
      error: err.message,
      stack: err.stack?.split("\n").slice(0, 3).join("\n"),
    });

    try {
      await LogLLMError({ email, subject, prompt: question, error: err });
    } catch (logError) {
      console.error("Error logging LLM error:", logError);
    }
  }
};


exports.getChatBySubject = async (req, res) => {
  const email = req.userEmail;
  const subject = req.params.subject;

  if (!subject || !email) {
    return res.status(400).send({ message: "Missing subject or email" });
  }

  try {
    const chat = await Chat.findOne({ _id: subject, email });
    if (!chat)
      return res
        .status(404)
        .send({ message: "No chat found for this subject" });
    res.status(200).send(chat);
  } catch (err) {
    console.error("Error in getChatBySubject:", err);
    res.status(500).send({ message: "Server error while fetching chat" });
  }
};

// Get all chats for a specific user
exports.getAllChats = async (req, res) => {
  const email = req.userEmail;

  try {
    const chats = await Chat.find({ email }).sort({ lastUpdated: -1 });
    res.status(200).json(chats);
  } catch (err) {
    console.error("Error in getAllChats:", err);
    res.status(500).json({ message: "Server error while fetching chats" });
  }
};

// Delete a chat by subject
exports.deleteChatBySubject = async (req, res) => {
  const email = req.userEmail;
  const subject = req.body.subject;

  if (!subject || !email) {
    return res.status(400).send({ message: "Missing subject or email" });
  }

  try {
    const result = await Chat.deleteOne({ _id: subject, email });

    if (result.deletedCount === 0) {
      return res
        .status(404)
        .send({ message: "Chat not found or already deleted" });
    }

    await LogEvent({
      email,
      action: "chat",
      message: `Chat '${subject}' deleted by user`,
      meta: { subject },
    });

    res
      .status(200)
      .send({ message: `Chat '${subject}' deleted successfully.` });
  } catch (err) {
    console.error("Error in deleteChatBySubject:", err);
    res.status(500).send({ message: "Server error while deleting chat" });
  }
};

exports.getGeneralChats = async (req, res) => {
  try {
    // Get all chats that include at least one text-only message
    const chats = await Chat.find({ "chat.imageUrl": null }).sort({
      lastUpdated: -1,
    });

    const userEmails = [...new Set(chats.map((c) => c.email))];

    const users = await User.find({ email: { $in: userEmails } });

    const result = await Promise.all(
      users.map(async (user) => {
        const userChats = chats.filter((c) => c.email === user.email);

        return {
          name: user.name,
          email: user.email,
          profileimg: user.profileimg,
          isActive: user.isActive,
          chats: userChats.map((c) => ({
            subject: c._id,
            history: c.chat
              .filter((entry) => entry.imageUrl == null) // Only text-only chats
              .map((entry) => ({
                question: entry.question,
                answer: entry.answer,
                timestamp: entry.timestamp,
                pageNumber: entry.pageNumber || null,
                entryNumber: entry.entryNumber || null,
              })),
          })),
        };
      })
    );

    res.status(200).json(result);
  } catch (err) {
    console.error("Error in getGeneralChats:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching general chats" });
  }
};

exports.searchGeneralChats = async (req, res) => {
  const { phrase } = req.query;

  if (!phrase || phrase.trim() === "") {
    return res.status(400).json({ message: "Search phrase is required" });
  }

  try {
    // Step 1: Get all chats with at least one text-only message
    const chats = await Chat.find({ "chat.imageUrl": null });

    const userEmails = [...new Set(chats.map((c) => c.email))];
    const users = await User.find({ email: { $in: userEmails } });

    const lowerPhrase = phrase.toLowerCase();

    const result = [];

    for (const user of users) {
      const userChats = chats.filter((c) => c.email === user.email);

      const matchingChats = [];

      for (const chat of userChats) {
        const matchedHistory = chat.chat
          .filter(
            (entry) =>
              entry.imageUrl == null &&
              ((entry.question &&
                entry.question.toLowerCase().includes(lowerPhrase)) ||
                (entry.answer &&
                  entry.answer.toLowerCase().includes(lowerPhrase)))
          )
          .map((entry) => ({
            question: entry.question,
            answer: entry.answer,
            timestamp: entry.timestamp,
            pageNumber: entry.pageNumber || null,
            entryNumber: entry.entryNumber || null,
            subject: chat._id,
          }));

        if (matchedHistory.length > 0) {
          matchingChats.push({
            subject: chat._id,
            history: matchedHistory,
          });
        }
      }

      if (matchingChats.length > 0) {
        result.push({
          name: user.name,
          email: user.email,
          profileimg: user.profileimg,
          isActive: user.isActive,
          chats: matchingChats,
        });
      }
    }

    res.status(200).json(result);
  } catch (err) {
    console.error("Error in searchGeneralChats:", err);
    res.status(500).json({ message: "Server error during search" });
  }
};

// Get subject-based statistics for dashboard
exports.getSubjectStatistics = async (req, res) => {
  try {
    const email = req.userEmail;
    const user = await User.findOne({ email });
    const userRole = user ? user.role : "student";

    let matchFilter = {};

    if (userRole === "teacher") {
      // For teachers, show aggregated statistics from all students only
      matchFilter = { userRole: "student" };
    } else {
      // For students, show only their own statistics
      matchFilter = { userEmail: email };
    }

    // Use the new ChatMessage model for statistics
    const messageCount = await ChatMessage.countDocuments(matchFilter);

    if (messageCount === 0) {
      return res.status(200).json([]);
    }

    // Aggregate by chatSubject
    const pipeline = [
      { $match: matchFilter },
      {
        $group: {
          _id: "$chatSubject",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          subject: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { count: -1 } },
    ];

    const statsArray = await ChatMessage.aggregate(pipeline);

    res.status(200).json(statsArray);
  } catch (err) {
    console.error("Error getting subject statistics:", err);
    res.status(500).json({ message: "Error fetching subject statistics" });
  }
};
