import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { FaHome, FaBook, FaCalendarAlt, FaCog, FaComment } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

// Import Pages
import Dashboard from './pages/Dashboard';
import Subjects from './pages/Subjects';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Chat from './pages/Chat';

function App() {
  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <FaHome />, path: '/' },
    { id: 'subjects', name: 'Subjects', icon: <FaBook />, path: '/subjects' },
    { id: 'chat', name: 'AI Assistant', icon: <FaComment />, path: '/chat' },
    { id: 'schedule', name: 'Schedule', icon: <FaCalendarAlt />, path: '/schedule' },
    { id: 'settings', name: 'Settings', icon: <FaCog />, path: '/settings' }
  ];

  return (
    <BrowserRouter>
      <div className="d-flex vh-100 bg-dark text-light">
        {/* Sidebar */}
        <aside className="bg-secondary p-4 d-flex flex-column" style={{ width: '250px' }}>
          <h3 className="mb-4">Classroom Assistant</h3>
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
            </ul>
          </nav>
          <footer className="text-muted small">© 2025 EduAI</footer>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow-1 d-flex flex-column">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/subjects" element={<Subjects />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Chat />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
