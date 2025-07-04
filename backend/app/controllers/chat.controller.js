require('dotenv').config(); // Load .env
const fs = require("fs");
const path = require("path");
const Chat = require("../models/chat.model");
const ChatMessage = require("../models/chatMessage.model"); // New chat message model
const User = require("../models/user.model");
const pdfParse = require("pdf-parse");
const logEvent = require("../utils/logEvent");
const logLLMError = require("../utils/logError");

const axios   = require("axios");
const FLASK_SERVER = process.env.FLASK_SERVER || "http://localhost:8000";

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
  const { subject, question, chatSubject } = req.body;
  const email = req.userEmail;

  if (!subject || (!question && !req.file) || !email) {
    return res
      .status(400)
      .json({ message: "Missing subject, question/image/pdf, or email" });
  }

  try {
    /* ------------------------------------------------------------------ */
    /* 1️⃣  Prepare payload for the Flask LLM                             */
    /* ------------------------------------------------------------------ */
    const role = req.userRole || "student";       // default role
    const flaskPayload = { subject, question, role };
    
    // Add chatSubject context if provided
    if (chatSubject) {
      flaskPayload.chatSubject = chatSubject;
      // Enhance the question with subject context
      flaskPayload.question = question ? 
        `[Context: This question is about ${chatSubject}] ${question}` : 
        `Please provide information about ${chatSubject}`;
    }
    
    let imageUrl   = null;                        // for DB
    let mimeType   = null;
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
        // read PDF text and append to question, same logic as before
        const pdfText = (await pdfParse(fs.readFileSync(req.file.path))).text;
        flaskPayload.question = question
          ? `${question}\n\nAlso consider this PDF content:\n${pdfText}`
          : `Please analyse this PDF content:\n${pdfText}`;
      } else {
        // image → base64
        base64Body = fs.readFileSync(req.file.path).toString("base64");
        flaskPayload.mimeType   = mimeType;
        flaskPayload.base64Image = base64Body;
      }
    }

    /* ------------------------------------------------------------------ */
    /* 2️⃣  Call the Flask backend                                        */
    /* ------------------------------------------------------------------ */
    const t0 = Date.now();
    const flaskRes = await axios.post(
      `${FLASK_SERVER}/api/chat`,
      flaskPayload,
      { headers: { "Content-Type": "application/json" } }
    );
    const responseTime = Date.now() - t0;

    const answer       = flaskRes.data.answer || "No answer";
    const chatCategory = flaskRes.data.chatCategory || "general";

    /* ------------------------------------------------------------------ */
    /* 3️⃣  Persist in MongoDB exactly like before                        */
    /* ------------------------------------------------------------------ */
    const existing = await Chat.findOne({ _id: subject, email });
    const count    = existing ? existing.chat.length : 0;

    const chatEntry = {
      question   : question || null,
      imageUrl   : imageUrl  || null,
      answer,
      timestamp  : new Date(),
      pageNumber : Math.floor(count / MESSAGES_PER_PAGE) + 1,
      entryNumber: (count % MESSAGES_PER_PAGE) + 1,
      responseTime,
      chatCategory,
      chatSubject: chatSubject || null, // Store the selected subject
      userRole: role, // Store the user role
    };

    await Chat.findOneAndUpdate(
      { _id: subject, email },
      { $push: { chat: chatEntry }, $set: { lastUpdated: new Date(), email } },
      { upsert: true, new: true }
    );

    /* ------------------------------------------------------------------ */
    /* 3.5️⃣  Also save to new ChatMessage model for statistics            */
    /* ------------------------------------------------------------------ */
    try {
      const user = await User.findOne({ email });
      const newChatMessage = new ChatMessage({
        userId: user ? user._id.toString() : email,
        userEmail: email,
        userRole: role,
        message: question || "Image/File uploaded",
        response: answer,
        chatSubject: chatSubject || 'General',
        subject: subject,
        imageUrl: imageUrl,
        mimeType: mimeType,
        responseTime: responseTime,
        modelUsed: "OpenVINO-DeepSeek-R1"
      });
      
      await newChatMessage.save();
      console.log('💾 Chat message saved for statistics:', {
        userRole: role,
        chatSubject: chatSubject || 'General',
        subject: subject
      });
    } catch (saveError) {
      console.error('Error saving chat message for statistics:', saveError);
      // Don't fail the main request if statistics save fails
    }

    /* ------------------------------------------------------------------ */
    /* 4️⃣  Log event + return to client                                  */
    /* ------------------------------------------------------------------ */
    await logEvent({
      email,
      action : "create_chat",
      message: `Message added to '${subject}'`,
      meta   : { chatCategory },
    });

    res.status(200).json({ answer, file: imageUrl, chatCategory });
  } catch (err) {
    console.error("LLM / Flask error:", err.message);
    await logLLMError({ email, subject, prompt: question, error: err });
    res.status(500).json({ message: "LLM failure", detail: err.message });
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

    // ✅ Log the chat deletion
    await logEvent({
      email,
      action: "chat_delete",
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
    const userRole = user ? user.role : 'student';
    
    console.log("=== Subject Statistics Debug (New Model) ===");
    console.log("User email:", email);
    console.log("User role:", userRole);
    
    let matchFilter = {};
    
    if (userRole === 'teacher') {
      // For teachers, show aggregated statistics from all students only
      matchFilter = { userRole: 'student' };
      console.log("Teacher view: filtering for student messages only");
    } else {
      // For students, show only their own statistics
      matchFilter = { userEmail: email };
      console.log("Student view: filtering for own messages only");
    }
    
    console.log("Match filter:", matchFilter);
    
    // Use the new ChatMessage model for statistics
    const messageCount = await ChatMessage.countDocuments(matchFilter);
    console.log("Total messages found:", messageCount);
    
    if (messageCount === 0) {
      console.log("No messages found, returning empty array");
      return res.status(200).json([]);
    }
    
    // Aggregate by chatSubject
    const pipeline = [
      { $match: matchFilter },
      { 
        $group: { 
          _id: '$chatSubject', 
          count: { $sum: 1 } 
        } 
      },
      { 
        $project: {
          subject: '$_id',
          count: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ];
    
    console.log("Aggregation pipeline:", JSON.stringify(pipeline, null, 2));
    
    const statsArray = await ChatMessage.aggregate(pipeline);
    console.log("Aggregation result:", statsArray);

    res.status(200).json(statsArray);
  } catch (err) {
    console.error("Error getting subject statistics:", err);
    res.status(500).json({ message: "Error fetching subject statistics" });
  }
};

// Debug endpoint to check chat data
exports.debugChatData = async (req, res) => {
  try {
    const email = req.userEmail;
    const chats = await Chat.find({ email });
    
    const debugInfo = {
      email,
      chatCount: chats.length,
      chats: chats.map(chat => ({
        subject: chat._id,
        entryCount: chat.chat.length,
        entries: chat.chat.map(entry => ({
          hasQuestion: !!entry.question,
          question: entry.question?.substring(0, 100),
          chatSubject: entry.chatSubject,
          userRole: entry.userRole,
          timestamp: entry.timestamp
        }))
      }))
    };
    
    res.status(200).json(debugInfo);
  } catch (err) {
    console.error("Error in debug endpoint:", err);
    res.status(500).json({ message: "Error fetching debug data" });
  }
};
