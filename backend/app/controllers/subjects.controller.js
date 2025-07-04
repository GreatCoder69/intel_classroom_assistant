const db = require("../models");
const Subject = db.subject;

/**
 * Get all subjects available in the system
 */
exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find({}).select('name description color');
    res.status(200).send(subjects);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get subjects with user-specific data (progress for students, assignments for teachers)
 */
exports.getUserSubjects = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    
    // Get all subjects
    const subjects = await Subject.find({});
    
    if (userRole === 'student') {
      // For students, include their progress
      const subjectsWithProgress = subjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        progress: subject.studentProgress?.get(userId) || 0
      }));
      
      res.status(200).send(subjectsWithProgress);
    } else if (userRole === 'teacher') {
      // For teachers, include assignment counts and student statistics
      const subjectsWithStats = subjects.map(subject => ({
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color,
        assignmentCount: subject.assignments?.length || 0,
        studentCount: subject.enrolledStudents?.length || 0,
        averageProgress: calculateAverageProgress(subject.studentProgress)
      }));
      
      res.status(200).send(subjectsWithStats);
    } else {
      res.status(403).send({ message: "Invalid user role" });
    }
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Create a new subject (Teacher only)
 */
exports.createSubject = async (req, res) => {
  try {
    const { name, description, color } = req.body;
    
    // Check if subject already exists
    const existingSubject = await Subject.findOne({ name: name });
    if (existingSubject) {
      return res.status(400).send({ message: "Subject already exists!" });
    }
    
    const subject = new Subject({
      name,
      description,
      color: color || 'primary',
      createdBy: req.userId,
      studentProgress: new Map(),
      assignments: [],
      enrolledStudents: []
    });
    
    await subject.save();
    res.status(201).send({ 
      message: "Subject created successfully!",
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color
      }
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Update an existing subject (Teacher only)
 */
exports.updateSubject = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const { name, description, color } = req.body;
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ message: "Subject not found!" });
    }
    
    // Update fields
    if (name) subject.name = name;
    if (description) subject.description = description;
    if (color) subject.color = color;
    subject.updatedAt = new Date();
    
    await subject.save();
    res.status(200).send({ 
      message: "Subject updated successfully!",
      subject: {
        id: subject._id,
        name: subject.name,
        description: subject.description,
        color: subject.color
      }
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Delete a subject (Teacher only)
 */
exports.deleteSubject = async (req, res) => {
  try {
    const subjectId = req.params.id;
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ message: "Subject not found!" });
    }
    
    // Check if subject has resources
    const Resource = require("../models").resource;
    const resourceCount = await Resource.countDocuments({ 
      subjectId: subjectId,
      isActive: true 
    });
    
    if (resourceCount > 0) {
      return res.status(400).send({ 
        message: `Cannot delete subject. It has ${resourceCount} associated resources. Please delete all resources first.`,
        resourceCount: resourceCount
      });
    }
    
    await Subject.findByIdAndDelete(subjectId);
    res.status(200).send({ message: "Subject deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Update student progress for a subject
 */
exports.updateProgress = async (req, res) => {
  try {
    const subjectId = req.params.id;
    const { progress } = req.body;
    const userId = req.userId;
    
    if (progress < 0 || progress > 100) {
      return res.status(400).send({ message: "Progress must be between 0 and 100" });
    }
    
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ message: "Subject not found!" });
    }
    
    // Update student progress
    subject.studentProgress.set(userId, progress);
    
    // Add student to enrolled list if not already there
    if (!subject.enrolledStudents.includes(userId)) {
      subject.enrolledStudents.push(userId);
    }
    
    await subject.save();
    res.status(200).send({ 
      message: "Progress updated successfully!",
      progress: progress
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Helper function to calculate average progress
 */
function calculateAverageProgress(progressMap) {
  if (!progressMap || progressMap.size === 0) return 0;
  
  const progressValues = Array.from(progressMap.values());
  const sum = progressValues.reduce((acc, val) => acc + val, 0);
  return Math.round(sum / progressValues.length);
}
