/**
 * Middleware to save chat responses to MongoDB
 * Use this with the Express app to intercept and save responses
 */
const mongoose = require('mongoose');
const Chat = require('../app/models/chat.model');
const logEvent = require('../app/utils/logEvent');

module.exports = function() {
  return async function saveChatMiddleware(req, res, next) {
    // Store the original send function
    const originalSend = res.send;
    
    // Override the send function
    res.send = function(body) {
      // Only process chat responses
      if (req.path.includes('/api/chat') || req.path.includes('/api/query')) {
        try {
          // Parse the response if it's a string
          const responseData = typeof body === 'string' ? JSON.parse(body) : body;
          
          if (responseData.answer && req.userEmail) {
            const answer = responseData.answer;
            const imageUrl = responseData.file;
            const chatCategory = responseData.chatCategory || 'general';
            const subject = req.body.subject;
            const question = req.body.question;
            const email = req.userEmail;
            
            // Save to MongoDB asynchronously (don't wait for it)
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
                  { 
                    $push: { chat: chatEntry }, 
                    $set: { 
                      lastUpdated: new Date(), 
                      email, 
                      subjectCategory: chatCategory 
                    } 
                  },
                  { upsert: true, new: true }
                );
                
                console.log(`Chat saved to MongoDB: ${email} - ${subject}`);
                
                // Log the event
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
          console.error('Error processing response for MongoDB storage:', err);
        }
      }
      
      // Call the original send function
      return originalSend.call(this, body);
    };
    
    next();
  };
};
