import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { FaHome, FaBook, FaCalendarAlt, FaCog, FaComment, FaSignOutAlt, FaCamera } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';
import { setOverscrollColors } from './fixScrolling';

// Import Auth Provider
import { AuthProvider, useAuth } from './context/AuthContext';

// Import Components
import ProtectedRoute from './components/ProtectedRoute';

// Import Pages
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import Login from './pages/Login';
import Camera from './pages/Camera';
const AppSidebar = () => {
  /**
   * Application sidebar component with navigation menu.
   * 
   * Returns:
   *   JSX.Element: Sidebar with navigation links and user info
   */
  const { logout, userRole } = useAuth();
  
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <FaHome />, path: '/' },
    { id: 'subjects', name: 'Subjects', icon: <FaBook />, path: '/subjects' },
    { id: 'chat', name: 'AI Assistant', icon: <FaComment />, path: '/chat' },
    { id: 'schedule', name: 'Schedule', icon: <FaCalendarAlt />, path: '/schedule' },
    { id: 'settings', name: 'Settings', icon: <FaCog />, path: '/settings' },
    { id: 'camera', name: 'Camera', icon: <FaCamera />, path: '/camera' }
  ];  return (
    <aside className="bg-secondary p-4 d-flex flex-column app-sidebar" style={{ width: '250px' }}>
      <h3 className="mb-4">Classroom Assistant</h3>
      <div className="mb-3 text-light">
        <small>Logged in as: {userRole === 'teacher' ? 'Teacher' : 'Student'}</small>
      </div>
      <nav className="flex-grow-1">
        <ul className="list-unstyled">
          {navItems.map(item => (
            <li key={item.id} className="mb-3">
              <NavLink 
                to={item.path} 
                className={({isActive}) => 
                  `d-flex align-items-center text-decoration-none ${isActive ? 'text-white fw-bold' : 'text-light'}`
                }
              >
                <span className="me-2">{item.icon}</span>
                {item.name}
              </NavLink>
            </li>
          ))}
          <li className="mt-4">
            <NavLink 
              to="#" 
              onClick={(e) => {
                e.preventDefault();
                logout();
              }}
              className="d-flex align-items-center text-decoration-none text-danger"
            >
              <span className="me-2"><FaSignOutAlt /></span>
              Logout
            </NavLink>
          </li>
        </ul>
      </nav>
      <footer className="text-muted small">© 2025 EduAI</footer>
    </aside>
  );
};

const AppLayout = () => {
  /**
   * Main application layout component with sidebar and content area.
   * 
   * Returns:
   *   JSX.Element: Layout with sidebar navigation and main content routes
   */
  return (
    <div className="app-container bg-dark text-light">
      <AppSidebar />
      <main className="main-content d-flex flex-column">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/camera" element={<Camera />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  /**
   * Main application component with routing and authentication setup.
   * 
   * Returns:
   *   JSX.Element: Application router with protected and public routes
   */
  // Apply scroll fix when component mounts
  useEffect(() => {
    setOverscrollColors();
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes with Layout */}
          <Route element={<ProtectedRoute />}>
            <Route path="/*" element={<AppLayout />} />
          </Route>
          
          {/* Default redirect to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
