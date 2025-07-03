import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaComment, FaBook, FaCalendarAlt, FaCog, FaSignOutAlt } from "react-icons/fa";

const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: <FaHome />, path: '/dashboard' },
    { id: 'chat', name: 'AI Assistant', icon: <FaComment />, path: '/chat' },
    { id: 'general-chat', name: 'General Chat', icon: <FaBook />, path: '/general-chat' },
    { id: 'history', name: 'Chat History', icon: <FaCalendarAlt />, path: '/history' },
    { id: 'settings', name: 'Settings', icon: <FaCog />, path: '/settings' }
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="d-flex vh-100">
      {/* Sidebar */}
      <aside 
        className="bg-dark text-light p-4 d-flex flex-column" 
        style={{ width: '250px', height: '100vh', position: 'fixed' }}
      >
        <h3 className="mb-4">Classroom Assistant</h3>
        <div className="mb-3">
          <small>Logged in as: {user.name || 'User'}</small>
        </div>
        <nav className="flex-grow-1">
          <ul className="list-unstyled">
            {navItems.map(item => (
              <li key={item.id} className="mb-3">
                <Link 
                  to={item.path} 
                  className={`d-flex align-items-center text-decoration-none ${
                    isActive(item.path) ? 'text-white fw-bold' : 'text-light'
                  }`}
                >
                  <span className="me-2">{item.icon}</span>
                  {item.name}
                </Link>
              </li>
            ))}
            <li className="mt-4">
              <a 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                className="d-flex align-items-center text-decoration-none text-danger"
              >
                <span className="me-2"><FaSignOutAlt /></span>
                Logout
              </a>
            </li>
          </ul>
        </nav>
        <footer className="small text-light-emphasis">
          © 2025 Intel Classroom Assistant | Powered by OpenVINO™
        </footer>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: '250px', width: 'calc(100% - 250px)' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
