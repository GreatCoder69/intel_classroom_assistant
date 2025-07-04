// Simple test to verify PDF extraction works
const pdfParse = require('pdf-parse');
const fs = require('fs');

console.log('Testing PDF extraction...');

// Test with a simple text buffer (simulating a PDF)
const testBuffer = Buffer.from('This is a test PDF content for extraction verification.');

pdfParse(testBuffer).then((result) => {
  console.log('PDF Parse successful!');
  console.log('Text:', result.text);
  console.log('Pages:', result.numpages);
}).catch((error) => {
  console.error('PDF Parse failed:', error);
});
