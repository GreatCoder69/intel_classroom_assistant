#!/usr/bin/env python3
"""
Test script for the enhanced PDF processor
"""

import sys
import os
import json
from pdf_processor import process_pdf_with_fallback, FallbackPDFProcessor

def test_fallback_processing():
    """Test the fallback text processing"""
    print("🧪 Testing Fallback Processing")
    print("=" * 40)
    
    # Sample text content for testing
    sample_text = """
CHAPTER 1: INTRODUCTION TO DATABASE SYSTEMS

Database management systems (DBMS) are software systems that enable users to create, maintain, and manipulate databases efficiently.

1.1 What is a Database?

A database is a collection of related data that is organized and stored in a systematic way. Modern databases are designed to:

• Minimize data redundancy
• Ensure data integrity
• Provide concurrent access
• Support data security

1.2 Database Management System Features

The key features of a DBMS include:

1. Data Definition: Ability to define data structures
2. Data Manipulation: Insert, update, delete operations
3. Data Control: Security and access control
4. Data Recovery: Backup and restore capabilities

Tables and Relationships

In relational databases, data is stored in tables with rows and columns. Each table represents an entity, and relationships between entities are established through foreign keys.

Example Table Structure:
StudentID    Name         Age    Major
001         John Smith    20     Computer Science
002         Jane Doe      19     Mathematics
003         Bob Wilson    21     Physics

This structured approach allows for efficient querying and data retrieval using SQL (Structured Query Language).
    """
    
    processor = FallbackPDFProcessor()
    result = processor.process_pdf_text(sample_text, "test_document.pdf")
    
    print(f"📄 Pages: {result['resource']['totalPages']}")
    print(f"📝 Words: {result['resource']['totalWords']}")
    print(f"🔤 Chunks: {result['resource']['totalChunks']}")
    print(f"⭐ Quality: {result['summary']['extractionQuality']['level']}")
    
    print(f"\n📊 Chunk Types:")
    for chunk_type, count in result['summary']['chunkTypes'].items():
        print(f"   {chunk_type}: {count}")
    
    print(f"\n🔍 Sample Chunks:")
    for i, chunk in enumerate(result['chunks'][:3]):
        print(f"   Chunk {i+1} ({chunk['content_type']}): {chunk['summary']}")
    
    # Save test result
    with open('test_fallback_result.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Test result saved to: test_fallback_result.json")
    
    return result

def test_pdf_file(pdf_path):
    """Test with an actual PDF file"""
    if not os.path.exists(pdf_path):
        print(f"❌ PDF file not found: {pdf_path}")
        return None
    
    print(f"🧪 Testing PDF File: {pdf_path}")
    print("=" * 50)
    
    output_path = pdf_path.replace('.pdf', '_test_result.json')
    result = process_pdf_with_fallback(pdf_path=pdf_path, output_path=output_path)
    
    if "error" in result:
        print(f"❌ Processing failed: {result['error']}")
        return None
    
    print(f"✅ Processing completed!")
    print(f"📄 Pages: {result['resource']['totalPages']}")
    print(f"📝 Words: {result['resource']['totalWords']}")
    print(f"🔤 Chunks: {result['resource']['totalChunks']}")
    print(f"⭐ Quality: {result['summary']['extractionQuality']['level']}")
    print(f"🔧 Method: {result['resource']['processingMethod']}")
    print(f"💾 Output: {output_path}")
    
    return result

def compare_with_basic_extraction(pdf_path):
    """Compare enhanced extraction with basic text extraction"""
    try:
        import fitz
        
        print(f"🔍 Comparing Extraction Methods")
        print("=" * 40)
        
        # Basic extraction
        doc = fitz.open(pdf_path)
        basic_text = ""
        for page in doc:
            basic_text += page.get_text()
        doc.close()
        
        basic_word_count = len(basic_text.split())
        print(f"📝 Basic extraction: {basic_word_count} words")
        
        # Enhanced extraction
        result = process_pdf_with_fallback(pdf_path=pdf_path)
        enhanced_word_count = result['resource']['totalWords']
        print(f"📝 Enhanced extraction: {enhanced_word_count} words")
        
        improvement = ((enhanced_word_count - basic_word_count) / basic_word_count * 100) if basic_word_count > 0 else 0
        print(f"📈 Improvement: {improvement:.1f}%")
        
        return {
            'basic_words': basic_word_count,
            'enhanced_words': enhanced_word_count,
            'improvement_percent': improvement
        }
        
    except ImportError:
        print("⚠️  PyMuPDF not available for comparison")
        return None

def main():
    """Main test function"""
    print("🧪 Enhanced PDF Processor Test Suite")
    print("=" * 50)
    
    # Test 1: Fallback processing
    print("\n" + "="*50)
    test_fallback_processing()
    
    # Test 2: PDF file processing (if provided)
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
        print("\n" + "="*50)
        test_pdf_file(pdf_path)
        
        # Test 3: Comparison (if PyMuPDF available)
        print("\n" + "="*50)
        compare_with_basic_extraction(pdf_path)
    else:
        print("\n💡 To test with a PDF file, run:")
        print("   python test_pdf_processor.py <path_to_pdf>")
    
    print("\n✅ All tests completed!")

if __name__ == "__main__":
    main()
