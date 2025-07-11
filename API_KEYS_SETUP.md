# API Keys Setup Guide

## Required for Advanced Suggestions Feature

To enable the advanced suggestions feature (real YouTube videos and web search results), you need to set up Google APIs:

### 1. Google Custom Search Engine ID (GOOGLE_CSE_ID)

1. Go to [Google Custom Search Engine](https://cse.google.com/)
2. Click "Add" to create a new search engine
3. In "Sites to search", enter `*` (asterisk) to search the entire web
4. Give it a name like "Classroom Assistant Search"
5. Click "Create"
6. Go to "Control Panel" → "Setup" → "Basics"
7. Copy the **Search engine ID** (starts with something like `017576662512468239146:omuauf_lfve`)
8. Replace `your_custom_search_engine_id_here` in your `.env` file with this ID

### 2. Google API Key (GEMINI_API_KEY)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - YouTube Data API v3
   - Custom Search API
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the API key
6. Replace the existing key in your `.env` file

### Current Status

Check your `.env` file:
- ✅ **GEMINI_API_KEY**: Currently configured
- ❌ **GOOGLE_CSE_ID**: Still using placeholder value

### Fallback Behavior

When API keys are not configured properly:
- ✅ The suggestions feature still works
- ✅ Users get basic search links to YouTube, Google, and Wikipedia
- ✅ All functionality remains available
- ⚠️ No direct embedded results from APIs

## Environment Variables

```bash
# For advanced suggestions (replace with real values)
GEMINI_API_KEY=your_google_api_key_here
GOOGLE_CSE_ID=your_custom_search_engine_id_here

# Other required variables
MONGO_URI=mongodb://0.0.0.0:27017/bezkoder_db
PORT=8080
FLASK_SERVER=http://localhost:8000
```

## Testing

After configuring the API keys:
1. Restart the backend server
2. Try creating a new suggestion in the frontend
3. Check the browser developer console for any API errors
4. Check the backend logs for detailed error messages
