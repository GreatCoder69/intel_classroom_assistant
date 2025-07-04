import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaHome, FaComment, FaSignOutAlt, FaBook, FaHistory, FaCog } from "react-icons/fa";

const StudentNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="d-flex">
      {/* ───── Sidebar ───── */}
      <aside
        className="bg-dark text-light d-flex flex-column p-3"
        style={{ width: 220, minHeight: "100vh" }}
      >
        <h5 className="mb-4">Classroom Assistant</h5>

        <nav className="flex-grow-1">
          <ul className="list-unstyled">

            <li className="mb-3">
              <Link
                to="/dashboard"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/dashboard") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaHome className="me-2" />
                Dashboard
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/subjects"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/subjects") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaBook className="me-2" />
                Subjects
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/chat"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/chat") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaComment className="me-2" />
                AI Assistant
              </Link>
            </li>

            <li className="mb-3">
              <Link
                to="/history"
                className={`d-flex align-items-center text-decoration-none ${
                  isActive("/history") ? "text-white fw-bold" : "text-light"
                }`}
              >
                <FaHistory className="me-2" />
                Chat History
              </Link>
            </li>

            <li className="mt-4">
              <button
                onClick={handleLogout}
                className="btn btn-link p-0 text-danger d-flex align-items-center"
              >
                <FaSignOutAlt className="me-2" />
                Logout
              </button>
            </li>

          </ul>
        </nav>

        <footer className="small text-secondary">
          Welcome, {user.name || user.email}
          <br />
          © 2025 OpenVINO™ Assistant
        </footer>
      </aside>

      {/* ───── Main content area ───── */}
      <main className="flex-grow-1">
        {/* This will be filled by the routed component */}
      </main>
    </div>
  );
};

export default StudentNavigation;
