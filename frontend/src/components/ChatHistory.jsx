import React, { useEffect, useState } from "react";
import {
  Button,
  Dropdown,
  Modal,
  Form,
  Image,
  Card,
  Alert,
  Pagination,
} from "react-bootstrap";
import { FaBars } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import "./adminstyle.css";

const AdminLayoutWithChatHistory = () => {
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

  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    username: "",
    subject: "",
    startDate: "",
    endDate: "",
    fileType: "",
  });
  const [showDateError, setShowDateError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const messagesPerPage = 5;

  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  const location = useLocation();

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
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => setUsers(data.filter((user) => user.chats?.length > 0)))
      .catch(console.error);
  }, [token]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get("filter");
    const userParam = params.get("user");

    if (userParam) setFilters((prev) => ({ ...prev, username: userParam }));
    if (["pdf", "image", "none", "nofile"].includes(filter))
      setFilters((prev) => ({
        ...prev,
        fileType: filter === "nofile" ? "none" : filter,
      }));
    else if (filter) setFilters((prev) => ({ ...prev, subject: filter }));
  }, [location.search]);

  useEffect(() => {
    if (filters.startDate && filters.endDate) {
      const start = new Date(filters.startDate);
      const end = new Date(filters.endDate);
      setShowDateError(end < start);
    } else setShowDateError(false);
  }, [filters.startDate, filters.endDate]);

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

  const applyFilters = (entry, user, chat) => {
    const timestamp = new Date(entry.timestamp);
    const start = filters.startDate ? new Date(filters.startDate) : null;
    const end = filters.endDate
      ? new Date(new Date(filters.endDate).setHours(23, 59, 59, 999))
      : null;

    if (
      filters.username &&
      !user.name.toLowerCase().includes(filters.username.toLowerCase())
    )
      return false;
    if (
      filters.subject &&
      !chat.subject.toLowerCase().includes(filters.subject.toLowerCase())
    )
      return false;
    if (start && timestamp < start) return false;
    if (end && timestamp > end) return false;
    if (
      filters.fileType === "image" &&
      (!entry.imageUrl || entry.imageUrl.endsWith(".pdf"))
    )
      return false;
    if (
      filters.fileType === "pdf" &&
      (!entry.imageUrl || !entry.imageUrl.endsWith(".pdf"))
    )
      return false;
    if (filters.fileType === "none" && entry.imageUrl) return false;

    return true;
  };

  const allEntries = users.flatMap((user) =>
    user.chats.flatMap((chat) =>
      chat.history
        .filter((entry) => applyFilters(entry, user, chat))
        .map((entry) => ({
          profileimg: user.profileimg,
          name: user.name,
          subject: chat.subject,
          ...entry,
          downloadCount: entry.downloadCount || 0,
        }))
    )
  );

  const paginatedEntries = allEntries
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice((currentPage - 1) * messagesPerPage, currentPage * messagesPerPage);
  const totalPages = Math.ceil(allEntries.length / messagesPerPage);

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

        {/* Filters */}
        <div className="px-4 mt-4 d-flex gap-3 flex-nowrap align-items-center overflow-auto">
          <Form.Select
            value={filters.username}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, username: e.target.value }))
            }
            style={{ maxWidth: 200 }}
          >
            <option value="">All Users</option>
            {[...new Set(users.map((user) => user.name))].map((name, idx) => (
              <option key={idx} value={name}>
                {name}
              </option>
            ))}
          </Form.Select>
          <Form.Control
            placeholder="Search by subject"
            value={filters.subject}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, subject: e.target.value }))
            }
            style={{ maxWidth: 200 }}
          />
          <Form.Control
            type="date"
            value={filters.startDate}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, startDate: e.target.value }))
            }
          />
          <Form.Control
            type="date"
            value={filters.endDate}
            min={filters.startDate || ""}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, endDate: e.target.value }))
            }
          />
          <Form.Select
            value={filters.fileType}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, fileType: e.target.value }))
            }
            style={{ maxWidth: 150 }}
          >
            <option value="">File Type</option>
            <option value="image">Image</option>
            <option value="pdf">PDF</option>
            <option value="none">No File</option>
          </Form.Select>
        </div>

        {showDateError && (
          <Alert variant="danger" className="mt-3 mx-4">
            ❌ End date cannot be earlier than start date.
          </Alert>
        )}

        {/* Chat History Entries */}
        <div className="mt-4 px-4">
          {paginatedEntries.map((entry, idx) => (
            <Card className="mb-4 w-100 shadow-sm" key={idx}>
              <Card.Body>
                <div className="d-flex align-items-center mb-2">
                  <Image
                    src={entry.profileimg}
                    roundedCircle
                    width={45}
                    height={45}
                    className="me-3"
                  />
                  <div>
                    <strong>{entry.name}</strong>
                    <br />
                    <small className="text-muted">
                      {new Date(entry.timestamp).toLocaleString()}
                    </small>
                  </div>
                </div>
                <h6>
                  <strong>Subject:</strong> {entry.subject}
                </h6>
                {entry.question && (
                  <p>
                    <strong>Q:</strong> {entry.question}
                  </p>
                )}
                <p>
                  <strong>A:</strong> {entry.answer}
                </p>
                {entry.imageUrl && (
                  <>
                    {entry.imageUrl.endsWith(".pdf") ? (
                      <>
                        <div className="d-flex align-items-center gap-2">
                          <span style={{ fontSize: 20 }}>📄</span>
                          <a
                            href={`https://storage.cognito.karmickinfosystem.com${entry.imageUrl.replace("/uploads", "")}`}

                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {entry.imageUrl.split("/").pop()}
                          </a>
                        </div>
                        <div className="mt-2 d-flex flex-column gap-1">
                          
                          {entry.downloadCount > 0 && (
                            <small className="text-muted">
                              Downloaded {entry.downloadCount} time
                              {entry.downloadCount > 1 ? "s" : ""}
                            </small>
                          )}
                        </div>
                      </>
                    ) : (
                      <img
                        src={`https://storage.cognito.karmickinfosystem.com${entry.imageUrl.replace("/uploads", "")}`}
                        alt="chat"
                        style={{
                          height: "200px",
                          objectFit: "cover",
                          borderRadius: 8,
                        }}
                      />
                    )}
                  </>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>

        {/* Pagination */}
        <Pagination className="justify-content-center mt-4">
          <Pagination.First
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
          />
          <Pagination.Prev
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          />
          {[...Array(totalPages)].map((_, i) => (
            <Pagination.Item
              key={i}
              active={i + 1 === currentPage}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </Pagination.Item>
          ))}
          <Pagination.Next
            onClick={() =>
              setCurrentPage((prev) => Math.min(prev + 1, totalPages))
            }
            disabled={currentPage === totalPages}
          />
          <Pagination.Last
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
          />
        </Pagination>
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
                value={profile.password}
                placeholder="Leave blank to keep old password"
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

export default AdminLayoutWithChatHistory;
