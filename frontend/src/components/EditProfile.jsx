import React, { useEffect, useState } from "react";
import { Table, Image, Button, Modal, Form, Dropdown } from "react-bootstrap";
import {
  FaBars,
  FaHome,
  FaTable,
  FaUser,
  FaCog,
  FaSignOutAlt,
} from "react-icons/fa";
import "./adminstyle.css"; // You'll define styles here
import { useNavigate } from "react-router-dom";
import { ListGroup } from "react-bootstrap";

const AdminPanel = () => {
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const USERS_PER_PAGE = 3;

  const indexOfLastUser = currentPage * USERS_PER_PAGE;
  const indexOfFirstUser = indexOfLastUser - USERS_PER_PAGE;

  const totalPages = Math.ceil(users.length / USERS_PER_PAGE);

  const [logsModalOpen, setLogsModalOpen] = useState(false);
  const [logsData, setLogsData] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsUser, setLogsUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [nameQuery, setNameQuery] = useState("");
  const [emailQuery, setEmailQuery] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showImageInput, setShowImageInput] = useState(false);

  const [profile, setProfile] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    profileimg: null,
  });
  const isSearching = nameQuery.trim() !== "" || emailQuery.trim() !== "";
  const paginatedUsers = hasSearched
    ? filteredUsers
    : users.slice(indexOfFirstUser, indexOfLastUser);
  const [message, setMessage] = useState("");
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const handleSignOut = () => {
    // Optionally clear tokens, etc.
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((user) => user.chats?.length > 0);
        setUsers(filtered);
        setFilteredUsers(filtered);
      })
      .catch(console.error);
  }, [token]);
  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  const handleSearch = () => {
    const name = nameQuery.trim().toLowerCase();
    const email = emailQuery.trim().toLowerCase();

    const results = users.filter(
      (user) =>
        (!name || user.name?.toLowerCase().includes(name)) &&
        (!email || user.email?.toLowerCase().includes(email))
    );
    setFilteredUsers(results);
    setHasSearched(true);
    setCurrentPage(1); // optional: reset pagination
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
        headers: {
          "x-access-token": token,
          // ❌ Do NOT set Content-Type manually here
        },
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

  const toggleStatus = (email, currentStatus) => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/toggle-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": token,
      },
      body: JSON.stringify({ email, isActive: !currentStatus }),
    }).then((res) => {
      if (res.ok) {
        setUsers((prev) =>
          prev.map((user) =>
            user.email === email ? { ...user, isActive: !currentStatus } : user
          )
        );
      }
    });
  };
  const fetchUserLogs = async (email, name) => {
    setLogsLoading(true);
    setLogsModalOpen(true);
    setLogsUser(name);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/admin/user-logs?email=${email}`,
        {
          headers: { "x-access-token": token },
        }
      );
      const data = await res.json();
      if (data.success) setLogsData(data.logs || []);
      else setLogsData([]);
    } catch (err) {
      setLogsData([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const openEditModal = async (email) => {
    const res = await fetch(
      `${import.meta.env.VITE_API_URL}/api/admin/user?email=${email}`,
      {
        headers: { "x-access-token": token },
      }
    );
    const data = await res.json();
    setFormData({
      email: data.email,
      name: data.name || "",
      phone: data.phone || "",
      password: data.password || "",
      profileimg: null,
    });

    setSelectedUser(email);
    setShowModal(true);
    setMessage("");
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profileimg") {
      setFormData((prev) => ({ ...prev, profileimg: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (val) form.append(key, val);
    });

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user`, {
      method: "PUT",
      headers: { "x-access-token": token },
      body: form,
    });

    if (res.ok) {
      setMessage("✅ Profile updated!");
      setTimeout(() => setShowModal(false), 1500);
    } else {
      const result = await res.json();
      setMessage(`❌ ${result.message || "Update failed"}`);
    }
  };
  useEffect(() => {
    fetchUserProfile();
  }, []);

  return (
    <div className={`admin-panel ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h4 className="purple-logo">LOGO</h4>
        </div>
        <ul className="sidebar-nav">
          <li onClick={() => navigate("/admin")} style={{ cursor: "pointer" }}>
            Dashboard
          </li>
          <li
            onClick={() => navigate("/history")}
            style={{ cursor: "pointer" }}
          >
            Chat History
          </li>
          <li
            onClick={() => navigate("/manage-user")}
            style={{ cursor: "pointer" }}
          >
            Manage User
          </li>
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
                      : profile.profileimg ||
                        "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg"
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
        <div className="d-flex flex-column flex-md-row gap-3 align-items-start ps-3 pt-3">
          <Form.Control
            type="text"
            placeholder="Search by name"
            style={{ maxWidth: 250 }}
            value={nameQuery}
            onChange={(e) => setNameQuery(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Form.Control
            type="text"
            placeholder="Search by email"
            style={{ maxWidth: 250 }}
            value={emailQuery}
            onChange={(e) => setEmailQuery(e.target.value)}
            onKeyDown={handleKeyPress}
          />
          <Button variant="primary" onClick={handleSearch}>
            Search
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setNameQuery("");
              setEmailQuery("");
              setFilteredUsers(users);
              setHasSearched(false);
              setCurrentPage(1); // optional
            }}
          >
            Clear Filters
          </Button>
        </div>

        <div
          className="d-flex justify-content-center"
          style={{ width: "100%" }}
        >
          <div
            className="table-container"
            style={{
              padding: 0,
              width: "90%",
              marginTop: "5%",
              paddingBottom: "10px",
            }}
          >
            <Table className="user-table text-center">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Chat History</th>
                  <th>User Logs</th>
                  <th>Status</th>
                  <th>Edit</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user, idx) => (
                  <tr
                    key={user.email}
                    className={idx % 2 === 0 ? "even" : "odd"}
                  >
                    <td
                      onClick={() => openEditModal(user.email)}
                      style={{ cursor: "pointer" }}
                    >
                      <Image
                        src={user.profileimg}
                        roundedCircle
                        width={40}
                        height={40}
                      />
                    </td>
                    <td onClick={() => openEditModal(user.email)}>
                      {user.name}
                    </td>
                    <td onClick={() => openEditModal(user.email)}>
                      {user.email}
                    </td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/history?user=${encodeURIComponent(user.name)}`
                          )
                        }
                      >
                        Go to History
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => fetchUserLogs(user.email, user.name)}
                      >
                        Show Logs
                      </Button>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        style={{
                          backgroundColor: user.isActive ? "green" : "#dc3545",
                          border: "none",
                        }}
                        onClick={() => toggleStatus(user.email, user.isActive)}
                      >
                        {user.isActive ? "Active" : "Blocked"}
                      </Button>
                    </td>
                    <td>
                      <Button
                        variant="outline-dark"
                        size="sm"
                        onClick={() => navigate(`/edit-user/${user.email}`)}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {!hasSearched && totalPages > 1 && (
              <div className="d-flex justify-content-center align-items-center gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((prev) => prev - 1)}
                >
                  ‹
                </Button>
                {[...Array(totalPages)].map((_, i) => (
                  <Button
                    key={i}
                    size="sm"
                    variant={
                      currentPage === i + 1 ? "primary" : "outline-secondary"
                    }
                    onClick={() => setCurrentPage(i + 1)}
                  >
                    {i + 1}
                  </Button>
                ))}
                <Button
                  size="sm"
                  variant="outline-secondary"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((prev) => prev + 1)}
                >
                  ›
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
      {/* User Logs Modal */}
<Modal
  show={logsModalOpen}
  onHide={() => setLogsModalOpen(false)}
  centered
  size="lg"
>
  <Modal.Header closeButton className="bg-dark text-white">
    <Modal.Title>User Logs – {logsUser}</Modal.Title>
  </Modal.Header>
  <Modal.Body className="bg-light" style={{ maxHeight: "60vh", overflowY: "auto" }}>
    {logsLoading ? (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2">Fetching logs...</p>
      </div>
    ) : logsData.length === 0 ? (
      <p className="text-center text-muted">No logs available for this user.</p>
    ) : (
      <ListGroup variant="flush">
        {logsData.map((log, index) => (
          <ListGroup.Item key={index} className="py-3">
            <div className="d-flex flex-column">
              <div className="fw-semibold text-secondary mb-1">
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div className="text-dark">{log.message}</div>
            </div>
          </ListGroup.Item>
        ))}
      </ListGroup>
    )}
  </Modal.Body>
  <Modal.Footer className="bg-light">
    <Button variant="secondary" onClick={() => setLogsModalOpen(false)}>
      Close
    </Button>
  </Modal.Footer>
</Modal>

      {/* Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Profile Image Display + Edit */}
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

          {/* Basic Details Form */}
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

export default AdminPanel;
