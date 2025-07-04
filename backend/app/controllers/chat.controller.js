require('dotenv').config(); // Load .env
const fs = require("fs");
const path = require("path");
const Chat = require("../models/chat.model");
const User = require("../models/user.model");
const pdfParse = require("pdf-parse");
const logEvent = require("../utils/logEvent");
const logLLMError = require("../utils/logError");
const askGemini = require("./askGemini");

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


// ✅ Main chat handler
exports.addChat = async (req, res) => {
  const { subject, question } = req.body;
  const email = req.userEmail;

  if (!subject || (!question && !req.file) || !email) {
    return res.status(400).json({ message: "Missing subject, question/image/pdf, or email" });
  }

  try {
    let answer = null;
    let imageUrl = null;
    let responseTime = 0;

    const callGemini = async (prompt, mime = null, b64 = null) => {
      const start = Date.now();
      const output = await askGemini("gemini", prompt, mime, b64);
      responseTime = Date.now() - start;
      return output;
    };

    // 1️⃣ STRICT EDUCATIONAL FILTER
    const eduPrompt = `
You are a strict classifier for a college assistant.

Classify the following question as either:
- "educational" (if it's clearly academic: math, science, coding, etc.)
- "non-educational" (if it's leisure, entertainment, movies, sports, etc.)

Only return one word: "educational" or "non-educational".

Question: "${question}"
`;

    const isEducational = (await callGemini(eduPrompt)).trim().toLowerCase();

    if (isEducational !== "educational") {
      return res.status(200).json({
        answer: "I'm an educational assistant focused only on college subjects. Please ask a relevant academic question.",
        file: null,
        chatCategory: null
      });
    }

    // 2️⃣ GET RESPONSE
    if (req.file) {
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type" });
      }

      imageUrl = `/uploads/${req.file.filename}`;

      if (req.file.mimetype === "application/pdf") {
        const pdfText = (await pdfParse(fs.readFileSync(req.file.path))).text;
        const prompt = question
          ? `${question}\n\nAlso consider this PDF content:\n${pdfText}`
          : `Please analyze this PDF content:\n${pdfText}`;
        answer = await callGemini(prompt);
      } else {
        const base64 = fs.readFileSync(req.file.path).toString("base64");
        answer = await callGemini(question, req.file.mimetype, base64);
      }
    } else {
      answer = await callGemini(question);
    }

    // 3️⃣ BROAD CATEGORY CLASSIFICATION
    let chatCategory = "unknown";
    try {
      const catPrompt = `
You are a syllabus topic classifier for college-level subjects.

Given:
- SUBJECT: "${subject}"
- QUESTION: "${question}"

Return only a **broad topic name** (2–3 words max), e.g.:
  "linear algebra", "binary trees", "network protocols", "machine learning"

Avoid repeating words directly from the question. Return only the category label.
`;
      chatCategory = (await callGemini(catPrompt)).trim().toLowerCase();
      if (!chatCategory) chatCategory = "unknown";
    } catch {}

    // 4️⃣ SAVE TO DB
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
      chatCategory
    };

    await Chat.findOneAndUpdate(
      { _id: subject, email },
      { $push: { chat: chatEntry }, $set: { lastUpdated: new Date(), email } },
      { upsert: true, new: true }
    );

    await logEvent({
      email,
      action: "create_chat",
      message: `Message added to '${subject}'`,
      meta: { chatCategory }
    });

    res.status(200).json({ answer, file: imageUrl, chatCategory });

  } catch (err) {
    console.error("Gemini error:", err.message);
    await logLLMError({ email, subject, prompt: question, error: err });
    res.status(500).json({ message: "LLM failure" });
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
