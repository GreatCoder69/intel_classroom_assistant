const mongoose = require('mongoose');
const db = require('./app/models');

async function checkData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/intel_classroom_assistant');
    console.log('Connected to MongoDB');
    
    // Check old chat model
    const chatCount = await db.chat.countDocuments();
    console.log('Total legacy chat entries:', chatCount);
    
    if (chatCount > 0) {
      const chats = await db.chat.find().limit(5);
      console.log('\n=== Legacy Chat Entries ===');
      chats.forEach((chat, index) => {
        console.log(`Chat ${index + 1}:`, {
          userId: chat.userId,
          subject: chat._id,
          email: chat.email,
          chatEntriesCount: chat.chat?.length || 0,
          firstEntry: chat.chat?.[0] ? {
            question: chat.chat[0].question?.substring(0, 50) + '...',
            chatSubject: chat.chat[0].chatSubject,
            userRole: chat.chat[0].userRole,
            timestamp: chat.chat[0].timestamp
          } : 'No entries'
        });
      });
    }
    
    // Check new ChatMessage model
    const messageCount = await db.chatMessage.countDocuments();
    console.log('\n=== New ChatMessage Model ===');
    console.log('Total chat messages:', messageCount);
    
    if (messageCount > 0) {
      const messages = await db.chatMessage.find().limit(10);
      console.log('\nSample chat messages:');
      messages.forEach((msg, index) => {
        console.log(`Message ${index + 1}:`, {
          userId: msg.userId,
          userEmail: msg.userEmail,
          userRole: msg.userRole,
          chatSubject: msg.chatSubject,
          subject: msg.subject,
          message: msg.message?.substring(0, 50) + '...',
          createdAt: msg.createdAt
        });
      });
      
      const subjectStats = await db.chatMessage.aggregate([
        { $group: { _id: '$chatSubject', count: { $sum: 1 } } }
      ]);
      console.log('\nSubject statistics from new model:', subjectStats);
      
      const roleStats = await db.chatMessage.aggregate([
        { $group: { _id: '$userRole', count: { $sum: 1 } } }
      ]);
      console.log('Role statistics from new model:', roleStats);
    }
    
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkData();
