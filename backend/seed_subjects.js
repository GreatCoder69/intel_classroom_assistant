/**
 * Seed script to populate initial subjects in the database
 * Run this once to set up default subjects for the application
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models
const db = require('./app/models');
const Subject = db.subject;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const defaultSubjects = [
  {
    name: 'Mathematics',
    description: 'Algebra, geometry, calculus, and mathematical problem solving',
    color: 'primary',
    createdBy: null, // Will be set to a teacher's ID if available
    studentProgress: new Map(),
    assignments: [],
    enrolledStudents: [],
    resources: []
  },
  {
    name: 'Science', 
    description: 'Physics, chemistry, biology, and earth sciences',
    color: 'success',
    createdBy: null,
    studentProgress: new Map(),
    assignments: [],
    enrolledStudents: [],
    resources: []
  },
  {
    name: 'History',
    description: 'World history, historical events, and social studies',
    color: 'info',
    createdBy: null,
    studentProgress: new Map(),
    assignments: [],
    enrolledStudents: [],
    resources: []
  },
  {
    name: 'Literature',
    description: 'Reading comprehension, writing skills, and literary analysis',
    color: 'warning',
    createdBy: null,
    studentProgress: new Map(),
    assignments: [],
    enrolledStudents: [],
    resources: []
  },
  {
    name: 'Computer Science',
    description: 'Programming, algorithms, and computational thinking',
    color: 'danger',
    createdBy: null,
    studentProgress: new Map(),
    assignments: [],
    enrolledStudents: [],
    resources: []
  }
];

async function seedSubjects() {
  try {
    console.log('Starting subject seeding...');
    
    // Find a teacher user to assign as creator (optional)
    const User = db.user;
    const teacher = await User.findOne({ role: 'teacher' });
    const teacherId = teacher ? teacher._id : new mongoose.Types.ObjectId();
    
    console.log(`Using teacher ID: ${teacherId}`);
    
    // Check if subjects already exist
    const existingSubjects = await Subject.find({});
    if (existingSubjects.length > 0) {
      console.log(`Found ${existingSubjects.length} existing subjects. Skipping seed.`);
      console.log('Existing subjects:', existingSubjects.map(s => s.name));
      process.exit(0);
    }
    
    // Create subjects with teacher ID
    const subjectsWithTeacher = defaultSubjects.map(subject => ({
      ...subject,
      createdBy: teacherId
    }));
    
    const createdSubjects = await Subject.insertMany(subjectsWithTeacher);
    
    console.log(`Successfully created ${createdSubjects.length} subjects:`);
    createdSubjects.forEach(subject => {
      console.log(`  - ${subject.name} (${subject.color})`);
    });
    
    console.log('\nSubjects seeding completed!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error seeding subjects:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  mongoose.connection.close(() => {
    console.log('\nMongoDB connection closed.');
    process.exit(0);
  });
});

// Run the seed function
seedSubjects();
