const db = require("../models");
const Resource = db.resource;
const Subject = db.subject;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { spawn } = require('child_process');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/resources');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 40 * 1024 * 1024 // 40MB limit
  },
  fileFilter: function (req, file, cb) {
    // Only allow PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * Create intelligent chunks for AI processing
 * This function breaks text into semantically meaningful chunks
 */
function createIntelligentChunks(text, pageCount) {
  const chunks = [];
  const maxChunkSize = 800; // words per chunk (optimal for AI context)
  const minChunkSize = 100; // minimum words to avoid tiny chunks
  
  // First, split by major section indicators
  const sectionSeparators = [
    /\n\s*(?:CHAPTER|Chapter|chapter)\s+\d+/g,
    /\n\s*(?:SECTION|Section|section)\s+\d+/g,
    /\n\s*\d+\.\s+[A-Z]/g, // Numbered sections like "1. Introduction"
    /\n\s*[A-Z][A-Z\s]{10,}\n/g, // ALL CAPS headers
    /\n\s*[A-Z][a-z\s]{5,}:\s*\n/g, // Title headers like "Introduction:"
  ];
  
  let sections = [text];
  
  // Apply section separators
  for (const separator of sectionSeparators) {
    const newSections = [];
    for (const section of sections) {
      const split = section.split(separator);
      newSections.push(...split.filter(s => s.trim().length > 0));
    }
    if (newSections.length > sections.length) {
      sections = newSections;
    }
  }
  
  // If we don't have good sections, split by paragraphs
  if (sections.length <= 3) {
    sections = text.split(/\n\s*\n\s*\n/); // Double line breaks
  }
  
  // Further chunk each section if it's too large
  sections.forEach((section, sectionIndex) => {
    const sectionWords = section.trim().split(/\s+/);
    
    if (sectionWords.length <= maxChunkSize) {
      // Section is small enough, use as-is
      if (sectionWords.length >= minChunkSize) {
        chunks.push({
          id: `chunk_${chunks.length + 1}`,
          section: sectionIndex + 1,
          content: section.trim(),
          wordCount: sectionWords.length,
          type: 'section',
          summary: generateChunkSummary(section.trim())
        });
      }
    } else {
      // Split large section into smaller chunks
      const paragraphs = section.split(/\n\s*\n/);
      let currentChunk = '';
      let currentWordCount = 0;
      
      for (const paragraph of paragraphs) {
        const paragraphWords = paragraph.trim().split(/\s+/);
        
        if (currentWordCount + paragraphWords.length > maxChunkSize && currentChunk) {
          // Save current chunk and start new one
          chunks.push({
            id: `chunk_${chunks.length + 1}`,
            section: sectionIndex + 1,
            content: currentChunk.trim(),
            wordCount: currentWordCount,
            type: 'paragraph_group',
            summary: generateChunkSummary(currentChunk.trim())
          });
          currentChunk = paragraph;
          currentWordCount = paragraphWords.length;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
          currentWordCount += paragraphWords.length;
        }
      }
      
      // Add the last chunk
      if (currentChunk.trim() && currentWordCount >= minChunkSize) {
        chunks.push({
          id: `chunk_${chunks.length + 1}`,
          section: sectionIndex + 1,
          content: currentChunk.trim(),
          wordCount: currentWordCount,
          type: 'paragraph_group',
          summary: generateChunkSummary(currentChunk.trim())
        });
      }
    }
  });
  
  // If we still have very few chunks, do a simple word-count based split
  if (chunks.length < 3) {
    return createSimpleWordChunks(text, maxChunkSize);
  }
  
  return chunks;
}

/**
 * Generate a summary for a text chunk
 */
function generateChunkSummary(text) {
  const firstSentence = text.split(/[.!?]/)[0];
  if (firstSentence.length > 100) {
    return firstSentence.substring(0, 97) + '...';
  }
  return firstSentence + '.';
}

/**
 * Simple word-based chunking as fallback
 */
function createSimpleWordChunks(text, maxChunkSize) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  for (let i = 0; i < words.length; i += maxChunkSize) {
    const chunkWords = words.slice(i, i + maxChunkSize);
    const content = chunkWords.join(' ');
    
    chunks.push({
      id: `chunk_${chunks.length + 1}`,
      section: Math.floor(i / maxChunkSize) + 1,
      content: content,
      wordCount: chunkWords.length,
      type: 'word_group',
      summary: generateChunkSummary(content)
    });
  }
  
  return chunks;
}

/**
 * Extract keywords from text content for better searchability
 */
function extractKeywords(text) {
  // Common stop words to filter out
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'
  ]);
  
  // Extract words (3+ characters, alphanumeric)
  const words = text.toLowerCase()
    .match(/\b[a-z]{3,}\b/g) || [];
  
  // Count word frequency
  const wordFreq = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });
  
  // Get top keywords (minimum frequency of 2, max 10 keywords)
  return Object.entries(wordFreq)
    .filter(([word, freq]) => freq >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, freq]) => ({ word, frequency: freq }));
}

/**
 * Enhanced PDF text extraction using Python processor
 */
async function extractPDFTextEnhanced(filePath) {
  return new Promise((resolve) => {
    try {
      console.log('Starting enhanced PDF extraction for:', filePath);
      
      // Path to Python processor
      const pythonScript = path.join(__dirname, '../../content/pdf_processor.py');
      const outputPath = filePath.replace('.pdf', '_enhanced_content.json');
      
      // Try enhanced processing first
      const pythonProcess = spawn('python', [pythonScript, filePath, '-o', outputPath]);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', async (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          try {
            // Read the enhanced JSON output
            const enhancedData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
            console.log('Enhanced PDF extraction completed successfully');
            
            // Convert to format expected by existing code
            const chunks = enhancedData.chunks.map(chunk => ({
              id: chunk.id,
              section: chunk.section || 1,
              content: chunk.content,
              wordCount: chunk.word_count || chunk.wordCount,
              type: chunk.content_type || chunk.type || 'paragraph',
              summary: chunk.summary,
              keywords: chunk.keywords || []
            }));
            
            resolve({
              extractedText: chunks.map(c => c.content).join('\n\n'),
              textChunks: chunks,
              pageCount: enhancedData.resource.totalPages,
              wordCount: enhancedData.resource.totalWords,
              status: 'completed',
              enhancedData: enhancedData,
              processingMethod: 'enhanced'
            });
            
          } catch (parseError) {
            console.error('Error parsing enhanced extraction results:', parseError);
            // Fall back to basic extraction
            resolve(await extractPDFTextBasic(filePath));
          }
        } else {
          console.log('⚠️  Enhanced extraction failed, falling back to basic extraction');
          console.log('Python output:', stdout);
          console.log('Python errors:', stderr);
          // Fall back to basic extraction
          resolve(await extractPDFTextBasic(filePath));
        }
      });
      
      pythonProcess.on('error', (error) => {
        console.log('⚠️  Python process error, falling back to basic extraction:', error.message);
        // Fall back to basic extraction
        resolve(extractPDFTextBasic(filePath));
      });
      
    } catch (error) {
      console.error('Error in enhanced PDF extraction:', error);
      // Fall back to basic extraction
      resolve(extractPDFTextBasic(filePath));
    }
  });
}

/**
 * Basic PDF text extraction using pdf-parse (fallback)
 */
async function extractPDFTextBasic(filePath) {
  try {
    console.log('Starting basic PDF extraction for:', filePath);
    
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    
    const fullText = data.text;
    const pageCount = data.numpages;
    
    // Use existing chunking logic
    const textChunks = createIntelligentChunks(fullText, pageCount);
    const wordCount = fullText.split(/\s+/).length;
    
    console.log(`Basic PDF extraction completed: ${pageCount} pages, ${wordCount} words`);
    
    return {
      extractedText: fullText,
      textChunks: textChunks,
      pageCount: pageCount,
      wordCount: wordCount,
      status: 'completed',
      processingMethod: 'basic'
    };
  } catch (error) {
    console.error('Error in basic PDF extraction:', error);
    return {
      extractedText: '',
      textChunks: [],
      pageCount: 0,
      wordCount: 0,
      status: 'failed',
      error: error.message,
      processingMethod: 'failed'
    };
  }
}

/**
 * Extract text content from PDF file (Enhanced version with fallback)
 */
async function extractPDFText(filePath) {
  try {
    console.log('Starting PDF text extraction for:', filePath);
    
    // Try enhanced extraction first, fall back to basic if needed
    const result = await extractPDFTextEnhanced(filePath);
    
    console.log(`PDF extraction completed using ${result.processingMethod} method: ${result.pageCount} pages, ${result.wordCount} words`);
    
    return result;
  } catch (error) {
    console.error('Error in PDF text extraction:', error);
    return {
      extractedText: '',
      textChunks: [],
      pageCount: 0,
      wordCount: 0,
      status: 'failed',
      error: error.message,
      processingMethod: 'failed'
    };
  }
}

/**
 * Upload a new resource for a subject (Teacher only)
 */
exports.uploadResource = async (req, res) => {
  try {
    console.log('Upload request received:', {
      body: req.body,
      file: req.file ? { 
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype 
      } : null
    });

    const { subjectId, name, description } = req.body;
    const uploadedBy = req.userId;
    
    // Validate required fields
    if (!subjectId) {
      return res.status(400).send({ message: "Subject ID is required!" });
    }
    
    if (!name || !name.trim()) {
      return res.status(400).send({ message: "Resource name is required!" });
    }
    
    // Check if subject exists
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return res.status(404).send({ message: "Subject not found!" });
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).send({ message: "No file uploaded. Please select a PDF file." });
    }
    
    // Additional file validation
    if (req.file.size === 0) {
      return res.status(400).send({ message: "Empty file is not allowed!" });
    }
    
    if (req.file.size > 40 * 1024 * 1024) {
      return res.status(400).send({ message: "File size too large. Maximum size is 40MB." });
    }
    
    // Create resource with initial extraction status
    const resource = new Resource({
      name: name.trim(),
      description: description ? description.trim() : '',
      fileName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      subjectId: subjectId,
      uploadedBy: uploadedBy,
      extractionStatus: 'processing'
    });
    
    await resource.save();
    console.log('Resource saved with ID:', resource._id);
    
    // Extract PDF text in background (don't block response)
    setImmediate(async () => {
      try {
        console.log('Starting background PDF extraction for resource:', resource._id);
        console.log('📁 File path:', req.file.path);
        console.log('File size:', req.file.size, 'bytes');
        
        const extractionResult = await extractPDFText(req.file.path);
        console.log('PDF extraction result:', {
          pageCount: extractionResult.pageCount,
          wordCount: extractionResult.wordCount,
          status: extractionResult.status
        });
        
        // Update resource with extracted content
        const updateResult = await Resource.findByIdAndUpdate(resource._id, {
          extractedText: extractionResult.extractedText,
          textChunks: extractionResult.textChunks,
          pageCount: extractionResult.pageCount,
          wordCount: extractionResult.wordCount,
          extractionStatus: extractionResult.status,
          extractionDate: new Date()
        });
        
        console.log('PDF extraction database update completed for resource:', resource._id);
        console.log('Update result:', updateResult ? 'Success' : 'Failed');
        
        // Save extracted content as JSON file for easy access
        const jsonFilePath = req.file.path.replace('.pdf', '_content.json');
        console.log('Creating JSON file at:', jsonFilePath);
        
        let contentData;
        
        // Check if we have enhanced extraction data
        if (extractionResult.enhancedData) {
          // Use the enhanced data structure
          contentData = extractionResult.enhancedData;
          // Update with our resource info
          contentData.resource.id = resource._id;
          contentData.resource.name = resource.name;
          contentData.resource.subject = subject.name;
          contentData.resource.subjectId = resource.subjectId;
        } else {
          // Create standard structure for basic extraction
          contentData = {
            resource: {
              id: resource._id,
              name: resource.name,
              fileName: resource.fileName,
              subject: subject.name,
              subjectId: resource.subjectId,
              extractionDate: new Date(),
              totalPages: extractionResult.pageCount,
              totalWords: extractionResult.wordCount,
              totalChunks: extractionResult.textChunks.length,
              processingMethod: extractionResult.processingMethod || 'basic'
            },
            summary: {
              chunkTypes: extractionResult.textChunks.reduce((acc, chunk) => {
                acc[chunk.type] = (acc[chunk.type] || 0) + 1;
                return acc;
              }, {}),
              averageWordsPerChunk: Math.round(extractionResult.wordCount / extractionResult.textChunks.length),
              contentOverview: extractionResult.textChunks.slice(0, 3).map(c => c.summary).join(' | '),
              extractionQuality: {
                score: extractionResult.wordCount > 100 ? 80 : 40,
                level: extractionResult.wordCount > 100 ? "good" : "fair",
                method: extractionResult.processingMethod
              }
            },
            chunks: extractionResult.textChunks.map(chunk => ({
              id: chunk.id,
              section: chunk.section,
              type: chunk.type,
              summary: chunk.summary,
              content: chunk.content,
              wordCount: chunk.wordCount,
              keywords: chunk.keywords || extractKeywords(chunk.content)
            })),
            metadata: {
              fileSize: resource.fileSize,
              uploadDate: resource.uploadDate,
              uploadedBy: resource.uploadedBy,
              processingNote: `Content processed using ${extractionResult.processingMethod} extraction method. Each chunk represents a semantic section of the document.`
            }
          };
        }
        
        fs.writeFileSync(jsonFilePath, JSON.stringify(contentData, null, 2));
        console.log('JSON content file saved:', jsonFilePath);
        
        // Update resource with JSON file status
        const jsonUpdateResult = await Resource.findByIdAndUpdate(resource._id, {
          jsonFileStatus: 'created',
          jsonFilePath: jsonFilePath
        });
        
        console.log('📄 JSON file status update completed for resource:', resource._id);
        console.log('JSON update result:', jsonUpdateResult ? 'Success' : 'Failed');
        
      } catch (extractionError) {
        console.error('Error during PDF extraction:', extractionError);
        console.error('Error details:', {
          message: extractionError.message,
          stack: extractionError.stack
        });
        
        const errorUpdateResult = await Resource.findByIdAndUpdate(resource._id, {
          extractionStatus: 'failed',
          extractionDate: new Date(),
          jsonFileStatus: 'failed'
        });
        
        console.log('💥 Error status update completed for resource:', resource._id);
        console.log('Error update result:', errorUpdateResult ? 'Success' : 'Failed');
      }
    });
    
    res.status(201).send({
      message: "Resource uploaded successfully! PDF content extraction is in progress.",
      resource: {
        id: resource._id,
        name: resource.name,
        description: resource.description,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        uploadDate: resource.uploadDate,
        subjectId: resource.subjectId,
        extractionStatus: resource.extractionStatus
      }
    });
  } catch (err) {
    console.error('Error in uploadResource:', err);
    // If there was an error, delete the uploaded file
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('Deleted file after error:', req.file.path);
      } catch (deleteErr) {
        console.error('Error deleting file:', deleteErr);
      }
    }
    res.status(500).send({ message: err.message || "Server error during upload" });
  }
};

/**
 * Get all resources for a subject
 */
exports.getResourcesBySubject = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    
    const resources = await Resource.find({ 
      subjectId: subjectId,
      isActive: true 
    }).populate('uploadedBy', 'name email').sort({ uploadDate: -1 });
    
    // Add extraction status information to response
    const resourcesWithStatus = resources.map(resource => ({
      _id: resource._id,
      name: resource.name,
      description: resource.description,
      fileName: resource.fileName,
      fileSize: resource.fileSize,
      mimeType: resource.mimeType,
      uploadDate: resource.uploadDate,
      uploadedBy: resource.uploadedBy,
      subjectId: resource.subjectId,
      extractionStatus: resource.extractionStatus,
      extractionDate: resource.extractionDate,
      pageCount: resource.pageCount,
      wordCount: resource.wordCount,
      jsonFileStatus: resource.jsonFileStatus,  // Add JSON file status
      jsonFilePath: resource.jsonFilePath,      // Add JSON file path
      hasExtractedContent: resource.extractionStatus === 'completed' && resource.extractedText
    }));
    
    res.status(200).send(resourcesWithStatus);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get a specific resource by ID
 */
exports.getResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId).populate('subjectId uploadedBy');
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    res.status(200).send(resource);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Download a resource file
 */
exports.downloadResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Check if file exists
    if (!fs.existsSync(resource.filePath)) {
      return res.status(404).send({ message: "File not found on server!" });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', resource.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${resource.fileName}"`);
    
    // Stream the file
    const fileStream = fs.createReadStream(resource.filePath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Download extracted content as JSON file (Teacher only)
 */
exports.downloadJson = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Check if JSON extraction was successful
    if (resource.jsonFileStatus !== 'created' || !resource.jsonFilePath) {
      return res.status(404).send({ message: "JSON file not available. Text extraction may have failed or is still pending." });
    }
    
    // Check if JSON file exists
    if (!fs.existsSync(resource.jsonFilePath)) {
      return res.status(404).send({ message: "JSON file not found on server!" });
    }
    
    // Set headers for JSON download
    const jsonFileName = `${resource.name.replace(/[^a-zA-Z0-9]/g, '_')}_content.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${jsonFileName}"`);
    
    // Stream the JSON file
    const fileStream = fs.createReadStream(resource.jsonFilePath);
    fileStream.pipe(res);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Update a resource (Teacher only)
 */
exports.updateResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    const { name, description } = req.body;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Update fields
    if (name) resource.name = name;
    if (description) resource.description = description;
    
    await resource.save();
    
    res.status(200).send({
      message: "Resource updated successfully!",
      resource: {
        id: resource._id,
        name: resource.name,
        description: resource.description,
        fileName: resource.fileName,
        fileSize: resource.fileSize,
        uploadDate: resource.uploadDate
      }
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Delete a resource (Teacher only)
 */
exports.deleteResource = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId);
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    // Delete the PDF file from filesystem
    if (fs.existsSync(resource.filePath)) {
      fs.unlinkSync(resource.filePath);
      console.log('Deleted PDF file:', resource.filePath);
    }
    
    // Delete the associated JSON content file
    const jsonFilePath = resource.filePath.replace('.pdf', '_content.json');
    if (fs.existsSync(jsonFilePath)) {
      fs.unlinkSync(jsonFilePath);
      console.log('Deleted JSON content file:', jsonFilePath);
    }
    
    // Delete the resource from database
    await Resource.findByIdAndDelete(resourceId);
    
    res.status(200).send({ message: "Resource and associated content deleted successfully!" });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get extracted content for a resource
 */
exports.getResourceContent = async (req, res) => {
  try {
    const resourceId = req.params.id;
    
    const resource = await Resource.findById(resourceId).populate('subjectId');
    if (!resource) {
      return res.status(404).send({ message: "Resource not found!" });
    }
    
    res.status(200).send({
      id: resource._id,
      name: resource.name,
      description: resource.description,
      fileName: resource.fileName,
      subjectName: resource.subjectId.name,
      extractionStatus: resource.extractionStatus,
      extractionDate: resource.extractionDate,
      pageCount: resource.pageCount,
      wordCount: resource.wordCount,
      extractedText: resource.extractedText,
      textChunks: resource.textChunks
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Get all extracted content for a subject (for AI context)
 */
exports.getSubjectContent = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    
    const resources = await Resource.find({ 
      subjectId: subjectId,
      isActive: true,
      extractionStatus: 'completed'
    }).populate('subjectId uploadedBy', 'name email');
    
    const subjectContent = {
      subjectId: subjectId,
      subjectName: resources.length > 0 ? resources[0].subjectId.name : '',
      totalResources: resources.length,
      totalPages: resources.reduce((sum, r) => sum + (r.pageCount || 0), 0),
      totalWords: resources.reduce((sum, r) => sum + (r.wordCount || 0), 0),
      lastUpdated: resources.length > 0 ? Math.max(...resources.map(r => r.extractionDate)) : null,
      resources: resources.map(resource => ({
        id: resource._id,
        name: resource.name,
        description: resource.description,
        fileName: resource.fileName,
        pageCount: resource.pageCount,
        wordCount: resource.wordCount,
        uploadDate: resource.uploadDate,
        extractionDate: resource.extractionDate,
        extractedText: resource.extractedText,
        textChunks: resource.textChunks,
        uploadedBy: resource.uploadedBy.name
      }))
    };
    
    res.status(200).send(subjectContent);
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

/**
 * Check if a subject has resources (used before subject deletion)
 */
exports.checkSubjectResources = async (req, res) => {
  try {
    const subjectId = req.params.subjectId;
    
    const resourceCount = await Resource.countDocuments({ 
      subjectId: subjectId,
      isActive: true 
    });
    
    res.status(200).send({ 
      hasResources: resourceCount > 0,
      resourceCount: resourceCount 
    });
  } catch (err) {
    res.status(500).send({ message: err.message });
  }
};

// Export the multer upload middleware
exports.upload = upload;
