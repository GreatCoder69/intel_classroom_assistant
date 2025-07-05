// DashboardPage.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaComment, FaSignOutAlt, FaBook } from "react-icons/fa";
import SubjectWiseChart from "../components/ChatStatsChart";

const SidebarLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [userRole, setUserRole] = useState(null);

  const isActive = (path) => location.pathname === path;

  useEffect(() => {
    // Fetch user role from token or API
    const fetchUserRole = async () => {
      try {
        const token = localStorage.getItem("token");
        
        // First try to get role from localStorage user data
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          if (parsedUser.role) {
            setUserRole(parsedUser.role);
            return;
          }
        }
        
        // Fallback to API call
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
          },
        });
        const data = await res.json();
        setUserRole(data.role || 'student');
      } catch (err) {
        console.error("Error fetching user role:", err);
        setUserRole('student'); // Default to student
      }
    };
    
    fetchUserRole();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* ───── Sidebar ───── */}
      <aside
        className="text-light d-flex flex-column p-3"
        style={{ 
          width: 250, 
          minHeight: "100vh",
          background: "linear-gradient(180deg, #1a1a1a 0%, #2c2c2c 100%)",
          borderRight: "1px solid #404040"
        }}
      >
        <h5 className="mb-4 text-white" style={{ fontSize: "1.3rem", fontWeight: "600" }}>
          🎓 Classroom Assistant
        </h5>

        <nav className="flex-grow-1">
          <ul className="list-unstyled">
            <li className="mb-3">
              <Link
                to="/dashboard"
                className={`d-flex align-items-center text-decoration-none p-2 rounded ${
                  isActive("/dashboard") ? "bg-primary text-white fw-bold" : "text-light"
                }`}
                style={{ 
                  fontSize: "1.05rem",
                  transition: "all 0.2s ease",
                  backgroundColor: !isActive("/dashboard") ? "transparent" : undefined
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/dashboard")) {
                    e.target.style.backgroundColor = "#404040";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/dashboard")) {
                    e.target.style.backgroundColor = "transparent";
                  }
                }}
              >
                <FaHome className="me-3" />
                Dashboard
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/subjects"
                className={`d-flex align-items-center text-decoration-none p-2 rounded ${
                  isActive("/subjects") ? "bg-primary text-white fw-bold" : "text-light"
                }`}
                style={{ 
                  fontSize: "1.05rem",
                  transition: "all 0.2s ease",
                  backgroundColor: !isActive("/subjects") ? "transparent" : undefined
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/subjects")) {
                    e.target.style.backgroundColor = "#404040";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/subjects")) {
                    e.target.style.backgroundColor = "transparent";
                  }
                }}
              >
                <FaBook className="me-3" />
                Subjects
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/teacher-chat"
                className={`d-flex align-items-center text-decoration-none p-2 rounded ${
                  isActive("/chat") ? "bg-primary text-white fw-bold" : "text-light"
                }`}
                style={{ 
                  fontSize: "1.05rem",
                  transition: "all 0.2s ease",
                  backgroundColor: !isActive("/chat") ? "transparent" : undefined
                }}
                onMouseEnter={(e) => {
                  if (!isActive("/chat")) {
                    e.target.style.backgroundColor = "#404040";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive("/chat")) {
                    e.target.style.backgroundColor = "transparent";
                  }
                }}
              >
                <FaComment className="me-3" />
                Chat Assistant
              </Link>
            </li>

            <li className="mt-4">
              <button
                onClick={handleLogout}
                className="btn btn-link p-2 text-danger d-flex align-items-center w-100 text-start"
                style={{ 
                  fontSize: "1.05rem",
                  textDecoration: "none",
                  transition: "all 0.2s ease"
                }}
              >
                <FaSignOutAlt className="me-3" />
                Logout
              </button>
            </li>
          </ul>
        </nav>

        <footer className="small text-secondary mt-3" style={{ opacity: "0.7" }}>
          © 2025 EduAI
        </footer>
      </aside>

      {/* ───── Main content ───── */}
      <main 
        className="flex-grow-1 p-4" 
        style={{ 
          background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)", 
          color: "#fff", 
          minHeight: "100vh" 
        }}
      >
        <div className="mb-4">
          <h2 className="text-white mb-3" style={{ fontSize: "2.2rem", fontWeight: "600" }}>
            📊 Dashboard
          </h2>
          {userRole === 'teacher' ? (
            <p className="text-light mb-4" style={{ fontSize: "1.1rem", opacity: "0.9", lineHeight: "1.6" }}>
              View aggregated statistics of all student questions by subject. This shows the overall learning trends across your classroom. Teacher conversations are excluded from these statistics.
            </p>
          ) : (
            <p className="text-light mb-4" style={{ fontSize: "1.1rem", opacity: "0.9", lineHeight: "1.6" }}>
              Track your questions and doubts by subject. The "General" category includes questions asked without a specific subject context.
            </p>
          )}
        </div>
        
        <SubjectWiseChart userRole={userRole} />
      </main>
    </div>
  );
};

export default SidebarLayout;
