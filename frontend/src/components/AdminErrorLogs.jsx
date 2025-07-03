import React, { useEffect, useState } from "react";
import { Button, Dropdown, Modal, Form } from "react-bootstrap";
import { FaBars } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./adminstyle.css";
import ErrorLogs from "./ErrorLogs";

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [profile, setProfile] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    profileimg: "",
    profileimgFile: null,
  });

  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleSignOut = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });
      const data = await res.json();
      setProfile({
        email: data.email,
        name: data.name,
        phone: data.phone,
        profileimg:
          data.profileimg ||
          "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg",
        password: "",
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const handleProfileUpdate = async () => {
    const formData = new FormData();
    formData.append("email", profile.email);
    formData.append("name", profile.name);
    formData.append("phone", profile.phone);
    if (profile.password) formData.append("password", profile.password);
    if (profile.profileimgFile)
      formData.append("profileimg", profile.profileimgFile);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/update`, {
        method: "PUT",
        headers: { "x-access-token": token },
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Profile updated successfully!");
        setProfile((prev) => ({
          ...prev,
          profileimg: data.profileimg || prev.profileimg,
        }));
        setTimeout(() => {
          setSuccessMessage("");
          setShowModal(false);
        }, 2000);
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };

  return (
    <div className={`admin-panel ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h4 className="purple-logo">LOGO</h4>
        </div>
        <ul className="sidebar-nav">
          <li onClick={() => navigate("/admin")}>Dashboard</li>
          <li onClick={() => navigate("/history")}>Chat History</li>
          <li onClick={() => navigate("/manage-user")}>Manage User</li>
          <li onClick={() => navigate("/error-logs")}>Error Logs</li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <Button
            variant="light"
            className="burger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FaBars />
          </Button>

          <div className="ms-auto me-4 d-flex align-items-center">
            <Dropdown align="end">
              <Dropdown.Toggle
                variant="outline-secondary"
                className="p-0 border-0 bg-transparent"
                style={{ boxShadow: "none" }}
              >
                <img
                  src={
                    profile.profileimgFile
                      ? URL.createObjectURL(profile.profileimgFile)
                      : profile.profileimg
                  }
                  alt="Profile"
                  className="rounded-circle"
                  style={{ width: "36px", height: "36px", objectFit: "cover" }}
                />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setShowModal(true)}>
                  Edit Profile
                </Dropdown.Item>
                <Dropdown.Item onClick={handleSignOut}>Logout</Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </div>
        </header>

        {/* Content Placeholder */}
        <ErrorLogs />
      </main>

      {/* Profile Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <img
              src={
                profile.profileimgFile
                  ? URL.createObjectURL(profile.profileimgFile)
                  : profile.profileimg
              }
              alt="Profile"
              className="rounded-circle"
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                cursor: "pointer",
                border: "3px solid #ccc",
              }}
              onClick={() => setShowImageInput(!showImageInput)}
            />

            {showImageInput && (
              <Form.Group className="mt-3">
                <Form.Label>Upload New Profile Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      profileimgFile: e.target.files[0],
                    })
                  }
                />
              </Form.Group>
            )}
          </div>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email (readonly)</Form.Label>
              <Form.Control type="email" value={profile.email} readOnly />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Leave blank to keep old password"
                value={profile.password}
                onChange={(e) =>
                  setProfile({ ...profile, password: e.target.value })
                }
              />
            </Form.Group>
          </Form>

          {successMessage && (
            <p className="text-success text-center">{successMessage}</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleProfileUpdate}>
            Update
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default AdminLayout;
