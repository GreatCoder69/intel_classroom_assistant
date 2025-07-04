# Intel Classroom Assistant - Frontend

🎨 **Modern React-based frontend** for the Intel Classroom Assistant platform, featuring responsive design, intelligent user interfaces, and seamless AI integration.

## 🌟 Overview

The frontend is built with React 18 and Vite, providing a fast, modern, and responsive user experience. It features role-based interfaces for students, teachers, and administrators, with real-time AI chat capabilities and comprehensive resource management.

## ✨ Key Features

### 🎯 **Core Functionality**
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile devices
- **Role-Based UI** - Customized interfaces for students, teachers, and admins
- **Real-time AI Chat** - Interactive chat interface with AI assistant
- **Resource Management** - Upload, view, and organize educational materials
- **Subject Organization** - Structured learning by academic subjects

### 🛡️ **Security & Authentication**
- **JWT-based Authentication** - Secure login system
- **Role-based Access Control** - Student, teacher, and admin permissions
- **Protected Routes** - Secure navigation based on user roles
- **Session Management** - Automatic token refresh and logout

### 🎨 **User Experience**
- **Modern UI Components** - Clean, intuitive interface design
- **Bootstrap 5 Integration** - Responsive grid system and components
- **Loading States** - Smooth loading indicators and progress bars
- **Error Handling** - User-friendly error messages and recovery

## 📁 Directory Structure

```
frontend/
├── 📄 index.html                   # Main HTML entry point
├── 📄 package.json                 # Dependencies and scripts
├── ⚙️ vite.config.js               # Vite build configuration
├── 🎨 src/                         # Source code
│   ├── 📄 main.jsx                 # Application entry point
│   ├── 📄 App.jsx                  # Main App component
│   ├── 📄 App.css                  # Global styles
│   ├── 🧩 components/              # Reusable UI components
│   │   ├── 🔐 auth/                # Authentication components
│   │   │   ├── LoginForm.jsx       # Login form
│   │   │   ├── SignupForm.jsx      # Registration form
│   │   │   └── ProtectedRoute.jsx  # Route protection
│   │   ├── 💬 chat/                # Chat interface components
│   │   │   ├── ChatInterface.jsx   # Main chat component
│   │   │   ├── MessageBubble.jsx   # Individual message display
│   │   │   └── ChatHistory.jsx     # Chat history viewer
│   │   ├── 📚 subjects/            # Subject management components
│   │   │   ├── SubjectList.jsx     # Subject listing
│   │   │   ├── SubjectDetail.jsx   # Subject details
│   │   │   └── ResourceUpload.jsx  # File upload component
│   │   ├── 👥 admin/               # Admin interface components
│   │   │   ├── UserManagement.jsx  # User administration
│   │   │   ├── SystemStats.jsx     # System statistics
│   │   │   └── LogViewer.jsx       # System logs
│   │   └── 🔧 common/              # Common UI components
│   │       ├── Navbar.jsx          # Navigation bar
│   │       ├── Footer.jsx          # Page footer
│   │       ├── LoadingSpinner.jsx  # Loading indicators
│   │       └── ErrorBoundary.jsx   # Error handling
│   ├── 📄 pages/                   # Page components
│   │   ├── 🏠 Home.jsx             # Landing page
│   │   ├── 📊 Dashboard.jsx        # User dashboard
│   │   ├── 💬 Chat.jsx             # Chat page
│   │   ├── 📚 Subjects.jsx         # Subjects page
│   │   ├── 👤 Profile.jsx          # User profile
│   │   └── 🛡️ Admin.jsx            # Admin panel
│   ├── 🎨 styles/                  # CSS stylesheets
│   │   ├── globals.css             # Global styles
│   │   ├── components.css          # Component styles
│   │   └── responsive.css          # Responsive design
│   ├── 🔧 utils/                   # Utility functions
│   │   ├── api.js                  # API client configuration
│   │   ├── auth.js                 # Authentication helpers
│   │   ├── constants.js            # Application constants
│   │   └── validators.js           # Form validation
│   └── 🗂️ context/                 # React context providers
│       ├── AuthContext.jsx         # Authentication context
│       ├── ChatContext.jsx         # Chat state management
│       └── ThemeContext.jsx        # Theme management
└── 🎨 public/                      # Static assets
    ├── 🖼️ images/                  # Image assets
    ├── 🎯 favicon.ico              # Site favicon
    └── 📄 manifest.json            # PWA manifest
```

## 🚀 Quick Setup

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access the application
# Open http://localhost:5173 in your browser
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Serve production build
npm run serve
```

## 🛠️ Available Scripts

```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run lint         # Run ESLint for code analysis
npm run test         # Run test suite
npm run format       # Format code with Prettier
```

## 🌐 API Integration

### Backend Communication
The frontend communicates with the backend through RESTful APIs:

```javascript
// API client configuration (src/utils/api.js)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

// Authentication endpoints
POST /api/auth/signin    # User login
POST /api/auth/signup    # User registration
GET  /api/auth/profile   # Get user profile

// Chat endpoints
POST /api/chat          # Send message to AI
GET  /api/chat/history  # Get chat history

// Subject endpoints
GET  /api/subjects      # List subjects
POST /api/subjects      # Create subject
POST /api/subjects/:id/upload  # Upload resources
```

### Environment Variables
Create a `.env` file in the frontend directory:

```env
# API Configuration
VITE_API_URL=http://localhost:8080
VITE_AI_API_URL=http://localhost:8000

# Application Settings
VITE_APP_TITLE=Intel Classroom Assistant
VITE_MAX_FILE_SIZE=41943040  # 40MB
VITE_SUPPORTED_FORMATS=pdf,doc,docx,txt

# Features
VITE_ENABLE_DARK_MODE=true
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_ANALYTICS=false
```

## 🎨 Styling & Theming

### CSS Architecture
- **Bootstrap 5** - Responsive grid system and components
- **Custom CSS** - Brand-specific styling and customizations
- **CSS Modules** - Component-scoped styling
- **Responsive Design** - Mobile-first approach

### Theme System
```javascript
// Theme context provides light/dark mode switching
const { theme, toggleTheme } = useTheme();

// CSS variables for consistent theming
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --success-color: #28a745;
  --warning-color: #ffc107;
  --danger-color: #dc3545;
}
```

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile First Approach */
/* Mobile: 320px - 768px */
/* Tablet: 768px - 1024px */
/* Desktop: 1024px+ */

@media (max-width: 768px) {
  /* Mobile styles */
}

@media (min-width: 768px) and (max-width: 1024px) {
  /* Tablet styles */
}

@media (min-width: 1024px) {
  /* Desktop styles */
}
```

## 🔐 Authentication Flow

### User Authentication
1. **Login/Signup** - User enters credentials
2. **JWT Token** - Server returns authentication token
3. **Token Storage** - Secure token storage in localStorage
4. **Protected Routes** - Role-based route protection
5. **Auto Refresh** - Automatic token refresh on expiration

### Role-Based Access
```javascript
// Protected route example
<ProtectedRoute requiredRole="teacher">
  <SubjectManagement />
</ProtectedRoute>

// Role-based UI rendering
{user?.role === 'admin' && (
  <AdminPanel />
)}
```

## 🧪 Testing

### Testing Setup
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Testing Structure
```
src/
├── __tests__/              # Test files
│   ├── components/         # Component tests
│   ├── pages/             # Page tests
│   ├── utils/             # Utility tests
│   └── integration/       # Integration tests
└── setupTests.js          # Test configuration
```

## 📦 Build & Deployment

### Production Build
```bash
# Build optimized production bundle
npm run build

# Output in dist/ directory
dist/
├── index.html
├── assets/
│   ├── index-[hash].js
│   ├── index-[hash].css
│   └── [other-assets]
└── [static-files]
```

### Deployment Options
```bash
# Deploy to Netlify
npm run deploy:netlify

# Deploy to Vercel
npm run deploy:vercel

# Deploy to GitHub Pages
npm run deploy:gh-pages

# Deploy to custom server
npm run build && scp -r dist/* user@server:/path/to/webroot/
```

## 🔧 Performance Optimization

### Code Splitting
```javascript
// Lazy loading for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));

// Suspense wrapper for loading states
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/chat" element={<Chat />} />
  </Routes>
</Suspense>
```

### Bundle Optimization
- **Tree Shaking** - Remove unused code
- **Code Splitting** - Load code on demand
- **Image Optimization** - Compress and optimize images
- **CSS Purging** - Remove unused CSS

## 🐛 Troubleshooting

### Common Issues

**Development Server Won't Start**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Check port availability
lsof -i :5173
```

**Build Errors**
```bash
# Check TypeScript errors
npm run type-check

# Clean build cache
rm -rf dist .vite
npm run build
```

**API Connection Issues**
```bash
# Verify backend server is running
curl http://localhost:8080/api/health

# Check environment variables
echo $VITE_API_URL
```

## 📚 Additional Resources

### Documentation
- **[React Documentation](https://reactjs.org/docs)** - React framework guide
- **[Vite Documentation](https://vitejs.dev/guide/)** - Build tool documentation
- **[Bootstrap Documentation](https://getbootstrap.com/docs/)** - CSS framework guide

### Development Tools
- **React Developer Tools** - Browser extension for debugging
- **Vite DevTools** - Development server insights
- **ESLint** - Code quality and style checking
- **Prettier** - Code formatting

## 🤝 Contributing

### Development Workflow
1. **Fork & Clone** - Fork the repository and clone locally
2. **Feature Branch** - Create a feature branch from main
3. **Development** - Make changes and test locally
4. **Testing** - Run tests and ensure they pass
5. **Pull Request** - Submit PR with clear description

### Code Style
- Follow ESLint configuration
- Use Prettier for formatting
- Write meaningful component and function names
- Add JSDoc comments for complex functions
- Maintain consistent file structure

For more details, see the main project [Contributing Guide](../README.md#contributing).
