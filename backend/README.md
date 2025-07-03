# Backend (Flask API)

This directory contains the Python backend for Intel Classroom Assistant.

## Main Files

- `server.py` - Main Flask server (API, LLM, optional speech)
- `server_optimized.py` - Optimized server with model caching, batching, and memory improvements
- `optimized_model_manager.py` - Utilities for model loading, caching, and management
- `performance_monitor.py` - Real-time performance and health monitoring

## Structure

- `app/` - All backend code (controllers, models, routes, utils)
- `servers/` - Main and optimized server entrypoints
- `uploads/` - Uploaded files (if enabled)

## Setup

1. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
2. Install dependencies:
   ```bash
   pip install -r ../requirements_optimization.txt
   ```
3. Run the server:
   ```bash
   python servers/server.py
   # or for optimized version
   python servers/server_optimized.py
   ```

## Notes
- All function docstrings use the format:
  """
  Description
  Args:
      ...
  Returns:
      ...
  """
- See `../optimization_guide.md` for performance tips.
