# Frontend (React)

This directory contains the React frontend for Intel Classroom Assistant.

## Structure

- `src/` - Main source code
  - `components/` - Reusable React components
  - `pages/` - Application pages (Dashboard, Chat, etc.)
  - `context/` - Authentication and state management
- `public/` - Static assets (images, icons)
- `index.html` - Main HTML entrypoint

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Access the app at `http://localhost:5173`

## Notes
- API endpoints are served by the backend (see `../backend/README.md`).
- All function docstrings use the format:
  """
  Description
  Args:
      ...
  Returns:
      ...
  """
