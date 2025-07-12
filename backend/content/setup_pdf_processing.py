#!/usr/bin/env python3
"""
Setup script for enhanced PDF processing capabilities
"""

import subprocess
import sys
import os
from pathlib import Path

def install_package(package):
    """Install a package using pip"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        return True
    except subprocess.CalledProcessError:
        return False

def check_package(package_name):
    """Check if a package is installed"""
    try:
        __import__(package_name)
        return True
    except ImportError:
        return False

def main():
    print("🔧 Setting up Enhanced PDF Processing")
    print("=" * 50)
    
    # List of required packages
    packages = [
        ("PyMuPDF", "fitz"),
        ("pdf2image", "pdf2image"),
        ("pytesseract", "pytesseract"),
        ("Pillow", "PIL"),
    ]
    
    optional_packages = [
        ("opencv-python", "cv2"),
        ("numpy", "numpy"),
        ("nltk", "nltk"),
        ("spacy", "spacy"),
    ]
    
    print("📦 Checking required packages...")
    
    # Check and install required packages
    for package, import_name in packages:
        if check_package(import_name):
            print(f"✅ {package} is already installed")
        else:
            print(f"⏳ Installing {package}...")
            if install_package(package):
                print(f"✅ {package} installed successfully")
            else:
                print(f"❌ Failed to install {package}")
    
    print("\n📦 Checking optional packages...")
    
    # Check optional packages
    for package, import_name in optional_packages:
        if check_package(import_name):
            print(f"✅ {package} is already installed")
        else:
            print(f"⚠️  {package} not installed (optional, but recommended)")
    
    print("\n🔧 Additional Setup Required:")
    print("1. Install Tesseract OCR:")
    print("   • Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki")
    print("   • Ubuntu: sudo apt install tesseract-ocr")
    print("   • macOS: brew install tesseract")
    
    print("\n2. Test the installation:")
    print("   python pdf_processor.py --install-deps")
    
    print("\n✅ Setup completed!")
    print("You can now use the enhanced PDF processing features.")

if __name__ == "__main__":
    main()
