require('dotenv').config(); // Load .env
const fs = require("fs");
const path = require("path");
const Chat = require("../models/chat.model");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const User = require("../models/user.model");
const pdfParse = require("pdf-parse");
const logEvent = require("../utils/logEvent");
const logLLMError = require("../utils/logError");

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

// ✅ Model selector
const getLLMResponse = async (modelName, prompt, mimeType = null, base64Image = null) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;


  // Alias fallback
  if (modelName === 'together') {
    modelName = 'together-deepseek'; // Default together model
  }

  if (modelName.includes('gemini')) {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const geminiModelName = modelName === 'gemini'
    ? 'models/gemini-2.5-flash-preview-05-20'
    : modelName;

    const model = genAI.getGenerativeModel({ model: geminiModelName });

    const parts = [];
    if (base64Image && mimeType) {
      parts.push({ inlineData: { data: base64Image, mimeType } });
    }
    if (prompt) {
      parts.push({ text: prompt });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }]
    });

    return result.response.text();

  } else if (modelName.startsWith('together')) {
    let togetherModel;

    switch (modelName) {
      case 'together-deepseek':
        togetherModel = 'deepseek-ai/DeepSeek-V3';
        break;
      case 'together-mixtral':
        togetherModel = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
        break;
      default:
        throw new Error(`Unsupported Together model: ${modelName}`);
    }

    const res = await fetch('https://api.together.xyz/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOGETHER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: togetherModel,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        top_p: 0.9,
        max_tokens: 1024
      })
    });

    const data = await res.json();

    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content;
    } else {
      throw new Error('Together API did not return a valid response.');
    }
  } else {
    throw new Error(`Unsupported model selected: ${modelName}`);
  }
};


// ✅ Main chat handler
exports.addChat = async (req, res) => {
  const { subject, question, model: modelChoice } = req.body;
  const email = req.userEmail;

  if (!subject || (!question && !req.file) || !email) {
    return res.status(400).send({ message: "Missing subject, question/image/pdf, or email" });
  }

  try {
    let answer = null;
    let imageUrl = null;
    let resolvedModel = modelChoice || 'gemini';
    let modelUsed = '';

    if (resolvedModel === 'together' || resolvedModel === 'together-deepseek') {
      modelUsed = 'deepseek-ai/DeepSeek-V3';
      resolvedModel = 'together-deepseek';
    } else if (resolvedModel === 'together-mixtral') {
      modelUsed = 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    } else if (resolvedModel === 'gemini') {
      modelUsed = 'models/gemini-2.5-flash-preview-05-20';
      resolvedModel = modelUsed;
    } else {
      modelUsed = resolvedModel;
    }

    let responseTime = 0;

    const generateAnswer = async (prompt, mimeType = null, base64Image = null) => {
      const start = Date.now();
      const response = await getLLMResponse(resolvedModel, prompt, mimeType, base64Image);
      responseTime = Date.now() - start;
      return response;
    };

    // ✅ File handling
    if (req.file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      const mimeType = req.file.mimetype;
      if (!allowedTypes.includes(mimeType)) {
        const error = new Error(`Unsupported file type: ${mimeType}`);
        error.stack = '';
        await logLLMError({ email, subject, prompt: question || '[File Input]', error });
        return res.status(400).send({ message: "Unsupported file type" });
      }

      const filePath = req.file.path;
      imageUrl = `/uploads/${req.file.filename}`;

      if (mimeType === 'application/pdf') {
        const pdfBuffer = fs.readFileSync(filePath);
        const parsed = await pdfParse(pdfBuffer);
        const pdfText = parsed.text;

        const prompt = question
          ? `${question}\n\nAlso, consider this PDF content:\n${pdfText}`
          : `Please analyze this PDF content:\n${pdfText}`;

        answer = await generateAnswer(prompt);
      } else {
        const imageBuffer = fs.readFileSync(filePath);
        const base64Image = imageBuffer.toString("base64");

        answer = await generateAnswer(question || '', mimeType, base64Image);
      }
    } else {
      answer = await generateAnswer(question);
    }

    // ✅ Chat state and category check
    let existingChat = await Chat.findOne({ _id: subject, email });
    const isFirstMessage = !existingChat;

    // 🔍 Ask LLM for categories
    let subjectCategory = null;
    let chatCategory = null;

    try {
      const categoryPrompt = `What is the category of the following user question? Just reply with one word like 'technology', 'sports', 'health', 'career', etc.\n\n"${question}"`;
      const detectedCategory = await generateAnswer(categoryPrompt);
      chatCategory = detectedCategory.trim().toLowerCase();

      if (isFirstMessage) {
        subjectCategory = chatCategory;
      }
    } catch (catErr) {
      console.warn("Category detection failed:", catErr.message);
      chatCategory = 'unknown';
      if (isFirstMessage) subjectCategory = 'unknown';
    }

    const currentCount = existingChat ? existingChat.chat.length : 0;
    const pageNumber = Math.floor(currentCount / MESSAGES_PER_PAGE) + 1;
    const entryNumber = (currentCount % MESSAGES_PER_PAGE) + 1;

    const chatEntry = {
      question: question || null,
      imageUrl: imageUrl || null,
      answer,
      timestamp: new Date(),
      downloadCount: 0,
      pageNumber,
      entryNumber,
      responseTime,
      modelUsed,
      chatCategory
    };

    const updateFields = {
      $push: { chat: chatEntry },
      $set: { lastUpdated: new Date(), email }
    };

    if (isFirstMessage) {
    updateFields.$set.subjectCategory = subjectCategory;
    updateFields.$set.isPublic = true; // default public
  } else {
    // Only compute if total messages <= 5
    const chatDoc = await Chat.findOne({ _id: subject, email });
    if (chatDoc && chatDoc.chat.length <= 5) {
      const categoryCount = {};
      chatDoc.chat.forEach((entry) => {
        if (entry.chatCategory) {
          const cat = entry.chatCategory.toLowerCase();
          categoryCount[cat] = (categoryCount[cat] || 0) + 1;
        }
      });

      // Add current one too
      if (chatCategory) {
        const cat = chatCategory.toLowerCase();
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }

      const sorted = Object.entries(categoryCount).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        updateFields.$set.subjectCategory = sorted[0][0]; // highest freq category
      }
    }
  }


    await Chat.findOneAndUpdate(
      { _id: subject, email },
      updateFields,
      { upsert: true, new: true }
    );

    await logEvent({
      email,
      action: "create_chat",
      message: `Chat message added to subject '${subject}'`,
      meta: {
        subject,
        question: question || null,
        file: imageUrl || null
      }
    });

    res.status(200).json({ answer, file: imageUrl });

  } catch (err) {
    console.error("LLM error:", err);
    await logLLMError({
      email,
      subject,
      prompt: question || "[Image/PDF input]",
      error: err,
    });
    res.status(500).send({ message: "Failed to generate response from LLM" });
  }
};



// Get chat by subject (for a specific user)
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
