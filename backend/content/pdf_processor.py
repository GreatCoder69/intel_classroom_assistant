#!/usr/bin/env python3
"""
Enhanced PDF Processor for Intel Classroom Assistant

This module provides advanced PDF text extraction capabilities including:
- OCR for image-based PDFs
- Layout-aware text extraction
- Table and structure detection
- Multi-language support
- Metadata extraction
- Intelligent content chunking
"""

import os
import sys
import json
import re
import logging
import io
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional
import argparse
from dataclasses import dataclass, asdict
from datetime import datetime
import hashlib

try:
    import fitz  # PyMuPDF
    PYMUPDF_AVAILABLE = True
except ImportError:
    PYMUPDF_AVAILABLE = False
    print("Warning: PyMuPDF not installed. Install with: pip install PyMuPDF")

try:
    import pytesseract
    from PIL import Image
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    print("Warning: OCR libraries not installed. Install with: pip install pytesseract pillow")

try:
    import pdf2image
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@dataclass
class ExtractedChunk:
    """Represents a chunk of extracted content"""
    id: str
    page_number: int
    content_type: str  # 'text', 'table', 'header', 'paragraph', 'list'
    content: str
    word_count: int
    confidence: float  # OCR confidence for image-based content
    bbox: Tuple[float, float, float, float]  # Bounding box (x0, y0, x1, y1)
    font_info: Dict[str, Any]
    summary: str
    keywords: List[Dict[str, Any]]

@dataclass
class DocumentMetadata:
    """Document metadata"""
    title: str
    author: str
    subject: str
    creator: str
    producer: str
    creation_date: str
    modification_date: str
    page_count: int
    file_size: int
    language: str
    has_images: bool
    has_tables: bool
    has_forms: bool

class EnhancedPDFProcessor:
    """Enhanced PDF processor with OCR and intelligent content extraction"""
    
    def __init__(self, tesseract_path: Optional[str] = None):
        """Initialize the PDF processor"""
        self.tesseract_path = tesseract_path
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        # Content type patterns
        self.header_patterns = [
            r'^[A-Z\s]{5,}$',  # ALL CAPS headers
            r'^\d+\.\s+[A-Z]',  # Numbered sections
            r'^Chapter\s+\d+',  # Chapter headers
            r'^Section\s+\d+',  # Section headers
            r'^[A-Z][a-z\s]{5,}:$',  # Title headers with colon
        ]
        
        self.list_patterns = [
            r'^\s*[\-\*\+]\s+',  # Bullet points
            r'^\s*\d+\.\s+',  # Numbered lists
            r'^\s*[a-zA-Z]\.\s+',  # Lettered lists
        ]
        
        # Common stop words for keyword extraction
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'said', 'says'
        }

    def extract_metadata(self, pdf_path: str) -> DocumentMetadata:
        """Extract comprehensive metadata from PDF"""
        try:
            doc = fitz.open(pdf_path)
            metadata = doc.metadata
            
            # Get file size
            file_size = os.path.getsize(pdf_path)
            
            # Check for special content types
            has_images = False
            has_tables = False
            has_forms = False
            
            for page_num in range(min(5, len(doc))):  # Check first 5 pages
                page = doc[page_num]
                
                # Check for images
                if page.get_images():
                    has_images = True
                
                # Check for forms
                if page.get_fields():
                    has_forms = True
                
                # Simple table detection (look for grid-like text patterns)
                text = page.get_text()
                if self._detect_tables_in_text(text):
                    has_tables = True
            
            doc.close()
            
            return DocumentMetadata(
                title=metadata.get('title', ''),
                author=metadata.get('author', ''),
                subject=metadata.get('subject', ''),
                creator=metadata.get('creator', ''),
                producer=metadata.get('producer', ''),
                creation_date=metadata.get('creationDate', ''),
                modification_date=metadata.get('modDate', ''),
                page_count=len(doc),
                file_size=file_size,
                language=self._detect_language(doc),
                has_images=has_images,
                has_tables=has_tables,
                has_forms=has_forms
            )
        except Exception as e:
            logger.error(f"Error extracting metadata: {str(e)}")
            return DocumentMetadata(
                title='', author='', subject='', creator='', producer='',
                creation_date='', modification_date='', page_count=0,
                file_size=0, language='en', has_images=False,
                has_tables=False, has_forms=False
            )

    def _detect_language(self, doc) -> str:
        """Simple language detection based on common words"""
        try:
            # Extract first few pages of text
            text_sample = ""
            for page_num in range(min(3, len(doc))):
                text_sample += doc[page_num].get_text()[:1000]
            
            # Simple heuristic: count common English words
            english_words = {'the', 'and', 'or', 'to', 'of', 'in', 'for', 'with', 'on', 'at'}
            words = set(re.findall(r'\b\w+\b', text_sample.lower()))
            english_count = len(words.intersection(english_words))
            
            return 'en' if english_count >= 3 else 'unknown'
        except:
            return 'en'

    def _detect_tables_in_text(self, text: str) -> bool:
        """Simple table detection based on text patterns"""
        lines = text.split('\n')
        aligned_lines = 0
        
        for line in lines:
            # Check for multiple columns (tabs or multiple spaces)
            if '\t' in line or re.search(r'\s{3,}', line):
                aligned_lines += 1
        
        return aligned_lines > 5  # If many lines have column-like structure

    def extract_text_with_layout(self, pdf_path: str, use_ocr: bool = True) -> List[ExtractedChunk]:
        """Extract text with layout information and OCR fallback"""
        chunks = []
        
        try:
            doc = fitz.open(pdf_path)
            logger.info(f"Processing PDF with {len(doc)} pages")
            
            for page_num in range(len(doc)):
                page = doc[page_num]
                logger.info(f"Processing page {page_num + 1}")
                
                # Try text extraction first
                page_chunks = self._extract_page_text(page, page_num)
                
                # If minimal text found and OCR is enabled, try OCR
                if use_ocr and sum(chunk.word_count for chunk in page_chunks) < 10:
                    logger.info(f"Low text count on page {page_num + 1}, attempting OCR")
                    ocr_chunks = self._extract_page_ocr(page, page_num)
                    if ocr_chunks:
                        page_chunks = ocr_chunks
                
                chunks.extend(page_chunks)
            
            doc.close()
            logger.info(f"Extracted {len(chunks)} chunks total")
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return []
        
        return chunks

    def _extract_page_text(self, page, page_num: int) -> List[ExtractedChunk]:
        """Extract text from a page with layout information"""
        chunks = []
        
        try:
            # Get text blocks with formatting
            blocks = page.get_text("dict")
            
            for block_num, block in enumerate(blocks.get("blocks", [])):
                if "lines" not in block:
                    continue
                
                content_parts = []
                font_sizes = []
                
                for line in block["lines"]:
                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if text:
                            content_parts.append(text)
                            font_sizes.append(span.get("size", 12))
                
                if not content_parts:
                    continue
                
                content = " ".join(content_parts)
                word_count = len(content.split())
                
                if word_count < 2:  # Skip very short content
                    continue
                
                # Determine content type
                content_type = self._classify_content_type(content, font_sizes)
                
                # Create chunk
                chunk = ExtractedChunk(
                    id=f"page_{page_num + 1}_block_{block_num}",
                    page_number=page_num + 1,
                    content_type=content_type,
                    content=content,
                    word_count=word_count,
                    confidence=1.0,  # Native text extraction
                    bbox=(block.get("bbox", [0, 0, 0, 0])),
                    font_info={
                        "average_size": sum(font_sizes) / len(font_sizes) if font_sizes else 12,
                        "size_range": [min(font_sizes), max(font_sizes)] if font_sizes else [12, 12]
                    },
                    summary=self._generate_summary(content),
                    keywords=self._extract_keywords(content)
                )
                
                chunks.append(chunk)
                
        except Exception as e:
            logger.error(f"Error extracting text from page {page_num + 1}: {str(e)}")
        
        return chunks

    def _extract_page_ocr(self, page, page_num: int) -> List[ExtractedChunk]:
        """Extract text using OCR for image-based pages"""
        chunks = []
        
        try:
            # Render page to image
            mat = fitz.Matrix(2.0, 2.0)  # 2x zoom for better OCR
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(img_data))
            
            # Perform OCR with detailed data
            ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            
            # Group OCR results into meaningful chunks
            current_chunk = {
                'words': [],
                'confidences': [],
                'bbox': [float('inf'), float('inf'), 0, 0]
            }
            
            for i in range(len(ocr_data['text'])):
                text = ocr_data['text'][i].strip()
                confidence = int(ocr_data['conf'][i])
                
                if text and confidence > 30:  # Minimum confidence threshold
                    current_chunk['words'].append(text)
                    current_chunk['confidences'].append(confidence)
                    
                    # Update bounding box
                    x, y, w, h = ocr_data['left'][i], ocr_data['top'][i], ocr_data['width'][i], ocr_data['height'][i]
                    current_chunk['bbox'][0] = min(current_chunk['bbox'][0], x)
                    current_chunk['bbox'][1] = min(current_chunk['bbox'][1], y)
                    current_chunk['bbox'][2] = max(current_chunk['bbox'][2], x + w)
                    current_chunk['bbox'][3] = max(current_chunk['bbox'][3], y + h)
                
                # End chunk on line break or when enough words collected
                if len(current_chunk['words']) >= 20 or (text.endswith('.') and len(current_chunk['words']) >= 5):
                    if current_chunk['words']:
                        content = ' '.join(current_chunk['words'])
                        avg_confidence = sum(current_chunk['confidences']) / len(current_chunk['confidences'])
                        
                        chunk = ExtractedChunk(
                            id=f"page_{page_num + 1}_ocr_{len(chunks)}",
                            page_number=page_num + 1,
                            content_type=self._classify_content_type(content, [12]),
                            content=content,
                            word_count=len(current_chunk['words']),
                            confidence=avg_confidence / 100.0,
                            bbox=tuple(current_chunk['bbox']),
                            font_info={"average_size": 12, "size_range": [12, 12]},
                            summary=self._generate_summary(content),
                            keywords=self._extract_keywords(content)
                        )
                        
                        chunks.append(chunk)
                    
                    # Reset for next chunk
                    current_chunk = {
                        'words': [],
                        'confidences': [],
                        'bbox': [float('inf'), float('inf'), 0, 0]
                    }
            
            # Add final chunk
            if current_chunk['words']:
                content = ' '.join(current_chunk['words'])
                avg_confidence = sum(current_chunk['confidences']) / len(current_chunk['confidences'])
                
                chunk = ExtractedChunk(
                    id=f"page_{page_num + 1}_ocr_{len(chunks)}",
                    page_number=page_num + 1,
                    content_type=self._classify_content_type(content, [12]),
                    content=content,
                    word_count=len(current_chunk['words']),
                    confidence=avg_confidence / 100.0,
                    bbox=tuple(current_chunk['bbox']),
                    font_info={"average_size": 12, "size_range": [12, 12]},
                    summary=self._generate_summary(content),
                    keywords=self._extract_keywords(content)
                )
                
                chunks.append(chunk)
                
        except Exception as e:
            logger.error(f"Error performing OCR on page {page_num + 1}: {str(e)}")
        
        return chunks

    def _classify_content_type(self, content: str, font_sizes: List[float]) -> str:
        """Classify content type based on text patterns and formatting"""
        content_clean = content.strip()
        
        # Check for headers (large font, short text, patterns)
        avg_font_size = sum(font_sizes) / len(font_sizes) if font_sizes else 12
        
        if avg_font_size > 16 and len(content_clean.split()) <= 10:
            return 'header'
        
        # Check header patterns
        for pattern in self.header_patterns:
            if re.match(pattern, content_clean):
                return 'header'
        
        # Check for lists
        for pattern in self.list_patterns:
            if re.match(pattern, content_clean):
                return 'list'
        
        # Check for tables (multiple columns)
        if '\t' in content or re.search(r'\s{3,}', content):
            return 'table'
        
        # Default to paragraph
        return 'paragraph'

    def _generate_summary(self, content: str, max_length: int = 100) -> str:
        """Generate a summary of the content"""
        # Get first sentence or first max_length characters
        sentences = re.split(r'[.!?]+', content)
        first_sentence = sentences[0].strip() if sentences else content
        
        if len(first_sentence) <= max_length:
            return first_sentence + ('.' if not first_sentence.endswith(('.', '!', '?')) else '')
        else:
            return first_sentence[:max_length - 3] + '...'

    def _extract_keywords(self, content: str, max_keywords: int = 10) -> List[Dict[str, Any]]:
        """Extract keywords from content"""
        # Clean and tokenize
        words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
        
        # Filter stop words and count frequency
        word_freq = {}
        for word in words:
            if word not in self.stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        # Get top keywords
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:max_keywords]
        
        return [{"word": word, "frequency": freq} for word, freq in top_keywords if freq >= 2]

    def merge_similar_chunks(self, chunks: List[ExtractedChunk], max_chunk_size: int = 800) -> List[ExtractedChunk]:
        """Merge similar adjacent chunks to optimize for AI processing"""
        if not chunks:
            return chunks
        
        merged_chunks = []
        current_chunk = None
        
        for chunk in chunks:
            if current_chunk is None:
                current_chunk = chunk
                continue
            
            # Check if chunks can be merged
            can_merge = (
                chunk.page_number == current_chunk.page_number and
                chunk.content_type == current_chunk.content_type and
                current_chunk.word_count + chunk.word_count <= max_chunk_size and
                chunk.content_type in ['paragraph', 'text']  # Only merge paragraphs
            )
            
            if can_merge:
                # Merge chunks
                current_chunk = ExtractedChunk(
                    id=f"{current_chunk.id}_merged",
                    page_number=current_chunk.page_number,
                    content_type=current_chunk.content_type,
                    content=f"{current_chunk.content}\n\n{chunk.content}",
                    word_count=current_chunk.word_count + chunk.word_count,
                    confidence=min(current_chunk.confidence, chunk.confidence),
                    bbox=current_chunk.bbox,  # Keep first bbox
                    font_info=current_chunk.font_info,
                    summary=current_chunk.summary,  # Keep first summary
                    keywords=self._merge_keywords(current_chunk.keywords, chunk.keywords)
                )
            else:
                merged_chunks.append(current_chunk)
                current_chunk = chunk
        
        if current_chunk:
            merged_chunks.append(current_chunk)
        
        return merged_chunks

    def _merge_keywords(self, keywords1: List[Dict], keywords2: List[Dict]) -> List[Dict]:
        """Merge keyword lists"""
        combined = {}
        
        for kw in keywords1 + keywords2:
            word = kw['word']
            if word in combined:
                combined[word]['frequency'] += kw['frequency']
            else:
                combined[word] = kw.copy()
        
        return sorted(combined.values(), key=lambda x: x['frequency'], reverse=True)[:10]

    def process_pdf(self, pdf_path: str, output_path: str = None, use_ocr: bool = True) -> Dict[str, Any]:
        """Main method to process a PDF and generate enhanced JSON output"""
        try:
            logger.info(f"Starting PDF processing: {pdf_path}")
            
            # Extract metadata
            metadata = self.extract_metadata(pdf_path)
            logger.info(f"Extracted metadata: {metadata.page_count} pages, {metadata.file_size} bytes")
            
            # Extract content chunks
            chunks = self.extract_text_with_layout(pdf_path, use_ocr)
            logger.info(f"Extracted {len(chunks)} initial chunks")
            
            # Merge similar chunks for better AI processing
            chunks = self.merge_similar_chunks(chunks)
            logger.info(f"Merged to {len(chunks)} final chunks")
            
            # Calculate statistics
            total_words = sum(chunk.word_count for chunk in chunks)
            avg_confidence = sum(chunk.confidence for chunk in chunks) / len(chunks) if chunks else 0
            
            # Create enhanced JSON structure
            result = {
                "resource": {
                    "fileName": os.path.basename(pdf_path),
                    "extractionDate": datetime.now().isoformat(),
                    "totalPages": metadata.page_count,
                    "totalWords": total_words,
                    "totalChunks": len(chunks),
                    "averageConfidence": round(avg_confidence, 3),
                    "processingMethod": "enhanced_extraction_with_ocr" if use_ocr else "text_only_extraction"
                },
                "metadata": asdict(metadata),
                "summary": {
                    "chunkTypes": self._count_chunk_types(chunks),
                    "averageWordsPerChunk": round(total_words / len(chunks)) if chunks else 0,
                    "contentOverview": self._generate_content_overview(chunks),
                    "extractionQuality": self._assess_extraction_quality(chunks, metadata)
                },
                "chunks": [asdict(chunk) for chunk in chunks],
                "processingNotes": {
                    "timestamp": datetime.now().isoformat(),
                    "ocrUsed": use_ocr,
                    "languageDetected": metadata.language,
                    "specialContent": {
                        "hasImages": metadata.has_images,
                        "hasTables": metadata.has_tables,
                        "hasForms": metadata.has_forms
                    }
                }
            }
            
            # Save to file if output path provided
            if output_path:
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump(result, f, indent=2, ensure_ascii=False)
                logger.info(f"Results saved to: {output_path}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error processing PDF: {str(e)}")
            return {
                "error": str(e),
                "resource": {
                    "fileName": os.path.basename(pdf_path) if pdf_path else "unknown",
                    "extractionDate": datetime.now().isoformat(),
                    "totalPages": 0,
                    "totalWords": 0,
                    "totalChunks": 0
                }
            }

    def _count_chunk_types(self, chunks: List[ExtractedChunk]) -> Dict[str, int]:
        """Count different chunk types"""
        type_counts = {}
        for chunk in chunks:
            type_counts[chunk.content_type] = type_counts.get(chunk.content_type, 0) + 1
        return type_counts

    def _generate_content_overview(self, chunks: List[ExtractedChunk]) -> str:
        """Generate a content overview from the first few chunks"""
        overview_parts = []
        for chunk in chunks[:3]:
            if chunk.summary and len(chunk.summary) > 10:
                overview_parts.append(chunk.summary)
        
        return " | ".join(overview_parts) if overview_parts else "No content overview available"

    def _assess_extraction_quality(self, chunks: List[ExtractedChunk], metadata: DocumentMetadata) -> Dict[str, Any]:
        """Assess the quality of text extraction"""
        if not chunks:
            return {"score": 0, "level": "poor", "notes": "No content extracted"}
        
        avg_confidence = sum(chunk.confidence for chunk in chunks) / len(chunks)
        words_per_page = sum(chunk.word_count for chunk in chunks) / metadata.page_count if metadata.page_count > 0 else 0
        
        # Scoring logic
        score = 0
        notes = []
        
        if avg_confidence >= 0.9:
            score += 40
        elif avg_confidence >= 0.7:
            score += 30
            notes.append("Some OCR uncertainty")
        else:
            score += 10
            notes.append("Low OCR confidence")
        
        if words_per_page >= 200:
            score += 30
        elif words_per_page >= 100:
            score += 20
            notes.append("Moderate text density")
        else:
            score += 5
            notes.append("Low text density")
        
        if len(chunks) >= metadata.page_count:
            score += 20
        else:
            score += 10
            notes.append("Few content chunks")
        
        # Quality levels
        if score >= 80:
            level = "excellent"
        elif score >= 60:
            level = "good"
        elif score >= 40:
            level = "fair"
        else:
            level = "poor"
        
        return {
            "score": score,
            "level": level,
            "confidence": round(avg_confidence, 3),
            "wordsPerPage": round(words_per_page, 1),
            "notes": notes
        }


def main():
    """Command-line interface for the PDF processor"""
    parser = argparse.ArgumentParser(description="Enhanced PDF text extraction with OCR and fallback")
    parser.add_argument("pdf_path", nargs='?', help="Path to the PDF file")
    parser.add_argument("-t", "--text", help="Process text content directly (for testing)")
    parser.add_argument("-o", "--output", help="Output JSON file path")
    parser.add_argument("--no-ocr", action="store_true", help="Disable OCR processing")
    parser.add_argument("--tesseract-path", help="Path to Tesseract executable")
    parser.add_argument("--install-deps", action="store_true", help="Show installation instructions")
    
    args = parser.parse_args()
    
    # Show installation instructions
    if args.install_deps:
        print("📦 Installation Instructions:")
        print("1. Install Python dependencies:")
        print("   pip install -r requirements.txt")
        print("\n2. Install Tesseract OCR:")
        print("   Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")
        print("   Ubuntu: sudo apt install tesseract-ocr")
        print("   macOS: brew install tesseract")
        print("\n3. For best results, also install:")
        print("   pip install opencv-python numpy nltk spacy")
        return
    
    # Check what processing mode to use
    if not args.pdf_path and not args.text:
        print("❌ Please provide either a PDF file path or text content")
        print("Use --help for usage information or --install-deps for setup instructions")
        sys.exit(1)
    
    if args.pdf_path and not os.path.exists(args.pdf_path):
        logger.error(f"File not found: {args.pdf_path}")
        sys.exit(1)
    
    # Determine output path
    output_path = args.output
    if not output_path and args.pdf_path:
        output_path = args.pdf_path.replace('.pdf', '_enhanced_content.json')
    elif not output_path:
        output_path = 'processed_content.json'
    
    # Process content
    if args.text:
        # Process text directly
        result = process_pdf_with_fallback(text_content=args.text, output_path=output_path)
    else:
        # Process PDF file
        result = process_pdf_with_fallback(pdf_path=args.pdf_path, output_path=output_path)
    
    # Print summary
    if "error" in result:
        logger.error(f"Processing failed: {result['error']}")
        print("\n💡 Try installing enhanced dependencies with: python pdf_processor.py --install-deps")
        sys.exit(1)
    else:
        print(f"✅ Processing completed successfully!")
        print(f"📄 Pages: {result['resource']['totalPages']}")
        print(f"📝 Words: {result['resource']['totalWords']}")
        print(f"🔤 Chunks: {result['resource']['totalChunks']}")
        print(f"⭐ Quality: {result['summary']['extractionQuality']['level']}")
        print(f"🔧 Method: {result['resource']['processingMethod']}")
        print(f"💾 Output: {output_path}")
        
        if result.get('processingNotes', {}).get('fallbackMode'):
            print("\n💡 Note: Used fallback processing. For better results, install enhanced dependencies:")
            print("   pip install -r requirements.txt")


if __name__ == "__main__":
    main()

class FallbackPDFProcessor:
    """Fallback PDF processor using basic text extraction"""
    
    def __init__(self):
        """Initialize fallback processor"""
        self.stop_words = {
            'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
            'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
            'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
            'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'said', 'says'
        }
    
    def extract_keywords(self, content: str, max_keywords: int = 10) -> List[Dict[str, Any]]:
        """Extract keywords from content"""
        words = re.findall(r'\b[a-zA-Z]{3,}\b', content.lower())
        
        word_freq = {}
        for word in words:
            if word not in self.stop_words:
                word_freq[word] = word_freq.get(word, 0) + 1
        
        top_keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:max_keywords]
        return [{"word": word, "frequency": freq} for word, freq in top_keywords if freq >= 2]
    
    def generate_summary(self, content: str, max_length: int = 100) -> str:
        """Generate a summary of the content"""
        sentences = re.split(r'[.!?]+', content)
        first_sentence = sentences[0].strip() if sentences else content
        
        if len(first_sentence) <= max_length:
            return first_sentence + ('.' if not first_sentence.endswith(('.', '!', '?')) else '')
        else:
            return first_sentence[:max_length - 3] + '...'
    
    def classify_content_type(self, content: str) -> str:
        """Classify content type based on text patterns"""
        content_clean = content.strip()
        
        # Header patterns
        header_patterns = [
            r'^[A-Z\s]{5,}$',
            r'^\d+\.\s+[A-Z]',
            r'^Chapter\s+\d+',
            r'^Section\s+\d+',
            r'^[A-Z][a-z\s]{5,}:$',
        ]
        
        for pattern in header_patterns:
            if re.match(pattern, content_clean):
                return 'header'
        
        # List patterns
        list_patterns = [
            r'^\s*[\-\*\+]\s+',
            r'^\s*\d+\.\s+',
            r'^\s*[a-zA-Z]\.\s+',
        ]
        
        for pattern in list_patterns:
            if re.match(pattern, content_clean):
                return 'list'
        
        # Table detection
        if '\t' in content or re.search(r'\s{3,}', content):
            return 'table'
        
        return 'paragraph'
    
    def create_intelligent_chunks(self, text: str, max_chunk_size: int = 800) -> List[Dict[str, Any]]:
        """Create intelligent chunks from text"""
        chunks = []
        
        if not text or not text.strip():
            return chunks
        
        # Split by major section indicators
        section_separators = [
            r'\n\s*(?:CHAPTER|Chapter|chapter)\s+\d+',
            r'\n\s*(?:SECTION|Section|section)\s+\d+',
            r'\n\s*\d+\.\s+[A-Z]',
            r'\n\s*[A-Z][A-Z\s]{10,}\n',
            r'\n\s*[A-Z][a-z\s]{5,}:\s*\n',
        ]
        
        sections = [text]
        
        for separator in section_separators:
            new_sections = []
            for section in sections:
                split = re.split(separator, section)
                new_sections.extend([s for s in split if s.strip()])
            if len(new_sections) > len(sections):
                sections = new_sections
        
        # If no good sections, split by paragraphs
        if len(sections) <= 3:
            sections = re.split(r'\n\s*\n\s*\n', text)
        
        # Process each section
        for section_index, section in enumerate(sections):
            section_words = section.strip().split()
            
            if len(section_words) <= max_chunk_size and len(section_words) >= 10:
                # Section is good size
                chunk = {
                    'id': f'chunk_{len(chunks) + 1}',
                    'section': section_index + 1,
                    'content_type': self.classify_content_type(section),
                    'content': section.strip(),
                    'word_count': len(section_words),
                    'summary': self.generate_summary(section.strip()),
                    'keywords': self.extract_keywords(section.strip()),
                    'confidence': 1.0
                }
                chunks.append(chunk)
            elif len(section_words) > max_chunk_size:
                # Split large section
                paragraphs = re.split(r'\n\s*\n', section)
                current_chunk = ''
                current_word_count = 0
                
                for paragraph in paragraphs:
                    paragraph_words = paragraph.strip().split()
                    
                    if current_word_count + len(paragraph_words) > max_chunk_size and current_chunk:
                        # Save current chunk
                        chunk = {
                            'id': f'chunk_{len(chunks) + 1}',
                            'section': section_index + 1,
                            'content_type': self.classify_content_type(current_chunk),
                            'content': current_chunk.strip(),
                            'word_count': current_word_count,
                            'summary': self.generate_summary(current_chunk.strip()),
                            'keywords': self.extract_keywords(current_chunk.strip()),
                            'confidence': 1.0
                        }
                        chunks.append(chunk)
                        current_chunk = paragraph
                        current_word_count = len(paragraph_words)
                    else:
                        current_chunk += ('\n\n' if current_chunk else '') + paragraph
                        current_word_count += len(paragraph_words)
                
                # Add final chunk
                if current_chunk.strip() and current_word_count >= 10:
                    chunk = {
                        'id': f'chunk_{len(chunks) + 1}',
                        'section': section_index + 1,
                        'content_type': self.classify_content_type(current_chunk),
                        'content': current_chunk.strip(),
                        'word_count': current_word_count,
                        'summary': self.generate_summary(current_chunk.strip()),
                        'keywords': self.extract_keywords(current_chunk.strip()),
                        'confidence': 1.0
                    }
                    chunks.append(chunk)
        
        return chunks
    
    def process_pdf_text(self, text: str, filename: str = "document.pdf") -> Dict[str, Any]:
        """Process extracted PDF text and return enhanced JSON"""
        try:
            # Create intelligent chunks
            chunks = self.create_intelligent_chunks(text)
            
            # Calculate statistics
            total_words = sum(chunk['word_count'] for chunk in chunks)
            
            # Count chunk types
            chunk_types = {}
            for chunk in chunks:
                chunk_type = chunk['content_type']
                chunk_types[chunk_type] = chunk_types.get(chunk_type, 0) + 1
            
            # Generate content overview
            overview_parts = []
            for chunk in chunks[:3]:
                if chunk['summary'] and len(chunk['summary']) > 10:
                    overview_parts.append(chunk['summary'])
            
            content_overview = " | ".join(overview_parts) if overview_parts else "Document content extracted"
            
            # Assess quality
            words_per_chunk = total_words / len(chunks) if chunks else 0
            quality_score = min(100, (len(chunks) * 10) + (words_per_chunk / 10))
            
            if quality_score >= 80:
                quality_level = "excellent"
            elif quality_score >= 60:
                quality_level = "good"
            elif quality_score >= 40:
                quality_level = "fair"
            else:
                quality_level = "poor"
            
            result = {
                "resource": {
                    "fileName": filename,
                    "extractionDate": datetime.now().isoformat(),
                    "totalPages": max(1, len(chunks) // 3),  # Estimate pages
                    "totalWords": total_words,
                    "totalChunks": len(chunks),
                    "averageConfidence": 1.0,
                    "processingMethod": "fallback_text_extraction"
                },
                "metadata": {
                    "title": "",
                    "author": "",
                    "subject": "",
                    "creator": "",
                    "producer": "",
                    "creation_date": "",
                    "modification_date": "",
                    "page_count": max(1, len(chunks) // 3),
                    "file_size": len(text),
                    "language": "en",
                    "has_images": False,
                    "has_tables": any(chunk['content_type'] == 'table' for chunk in chunks),
                    "has_forms": False
                },
                "summary": {
                    "chunkTypes": chunk_types,
                    "averageWordsPerChunk": round(words_per_chunk) if chunks else 0,
                    "contentOverview": content_overview,
                    "extractionQuality": {
                        "score": round(quality_score),
                        "level": quality_level,
                        "confidence": 1.0,
                        "wordsPerPage": round(total_words / max(1, len(chunks) // 3)),
                        "notes": ["Fallback text extraction used"]
                    }
                },
                "chunks": chunks,
                "processingNotes": {
                    "timestamp": datetime.now().isoformat(),
                    "ocrUsed": False,
                    "languageDetected": "en",
                    "specialContent": {
                        "hasImages": False,
                        "hasTables": any(chunk['content_type'] == 'table' for chunk in chunks),
                        "hasForms": False
                    },
                    "fallbackMode": True,
                    "message": "Enhanced PDF processing libraries not available. Using fallback text extraction."
                }
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Error in fallback processing: {str(e)}")
            return {
                "error": str(e),
                "resource": {
                    "fileName": filename,
                    "extractionDate": datetime.now().isoformat(),
                    "totalPages": 0,
                    "totalWords": 0,
                    "totalChunks": 0,
                    "processingMethod": "fallback_text_extraction_failed"
                }
            }


def process_pdf_with_fallback(pdf_path: str = None, text_content: str = None, output_path: str = None) -> Dict[str, Any]:
    """
    Process PDF with enhanced extraction or fallback to basic text processing
    
    Args:
        pdf_path: Path to PDF file (for enhanced processing)
        text_content: Already extracted text content (for fallback)
        output_path: Where to save the JSON output
    
    Returns:
        Dict containing the processed content
    """
    
    if PYMUPDF_AVAILABLE and pdf_path:
        # Use enhanced processing
        logger.info("Using enhanced PDF processing with OCR capabilities")
        processor = EnhancedPDFProcessor()
        result = processor.process_pdf(pdf_path, output_path, use_ocr=OCR_AVAILABLE)
    elif text_content:
        # Use fallback processing
        logger.info("Using fallback text processing")
        processor = FallbackPDFProcessor()
        filename = os.path.basename(pdf_path) if pdf_path else "document.pdf"
        result = processor.process_pdf_text(text_content, filename)
        
        # Save to file if output path provided
        if output_path:
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            logger.info(f"Results saved to: {output_path}")
    else:
        # No processing possible
        error_msg = "No PDF processing method available. Install PyMuPDF or provide text content."
        logger.error(error_msg)
        return {
            "error": error_msg,
            "resource": {
                "fileName": os.path.basename(pdf_path) if pdf_path else "unknown",
                "extractionDate": datetime.now().isoformat(),
                "totalPages": 0,
                "totalWords": 0,
                "totalChunks": 0
            }
        }
    
    return result
