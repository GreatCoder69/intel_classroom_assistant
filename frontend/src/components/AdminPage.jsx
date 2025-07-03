import React, { useEffect, useState } from "react";
import { Button, Dropdown, Modal, Form } from "react-bootstrap";
import { FaBars } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import "./adminstyle.css";
import { BsPeople, BsBookmark, BsGraphUp, BsGem } from "react-icons/bs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Row, Col, Card } from "react-bootstrap";

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
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  const getMonth = (dateStr) => {
    const monthIndex = new Date(dateStr).getMonth();
    return months[monthIndex] || "";
  };

  const [users, setUsers] = useState([]);
  const [chartData, setChartData] = useState([]);

  const allEntries = users.flatMap((user) =>
    user.chats.flatMap((chat) =>
      chat.history.map((entry) => ({
        profileimg: user.profileimg,
        name: user.name,
        subject: chat.subject,
        ...entry,
      }))
    )
  );

  const noFileChats = allEntries.filter((e) => !e.imageUrl).length;
  const imageChats = allEntries.filter(
    (e) => e.imageUrl && !e.imageUrl.endsWith(".pdf")
  ).length;
  const pdfChats = allEntries.filter(
    (e) => e.imageUrl && e.imageUrl.endsWith(".pdf")
  ).length;
  const totalUsers = users.length;

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
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((user) => user.chats?.length > 0);
        setUsers(filtered);

        const monthMap = {};
        filtered.forEach((user) => {
          user.chats.forEach((chat) => {
            chat.history.forEach((entry) => {
              const date = new Date(entry.timestamp);
              if (isNaN(date)) return;
              const month = getMonth(date);
              if (!monthMap[month])
                monthMap[month] = {
                  month,
                  noFile: 0,
                  withImage: 0,
                  withPDF: 0,
                };

              if (!entry.imageUrl) {
                monthMap[month].noFile += 1;
              } else if (entry.imageUrl.match(/\.(jpg|jpeg|png)$/i)) {
                monthMap[month].withImage += 1;
              } else if (entry.imageUrl.match(/\.pdf$/i)) {
                monthMap[month].withPDF += 1;
              } else {
                monthMap[month].noFile += 1;
              }
            });
          });
        });

        const finalData = months.map(
          (month) =>
            monthMap[month] || { month, noFile: 0, withImage: 0, withPDF: 0 }
        );
        setChartData(finalData);
      })
      .catch(console.error);
  }, [token]);

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
  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    bg,
    filter,
    onClick,
  }) => {
    const handleClick = () => {
      if (onClick) return onClick();
      if (filter) navigate(`/history?filter=${filter}`);
    };

    return (
      <Card
        className="text-white mb-4"
        style={{
          background: `linear-gradient(to right, ${bg[0]}, ${bg[1]})`,
          border: "none",
          cursor: "pointer",
        }}
        onClick={handleClick}
      >
        <Card.Body>
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className="mb-2" style={{ fontSize: "1rem" }}>
                {title}
              </div>
              <h3 style={{ fontWeight: 600 }}>{value.toLocaleString()}</h3>
              <div style={{ fontSize: "0.9rem" }}>{subtitle}</div>
            </div>
            <div style={{ fontSize: "1.8rem" }}>
              <Icon />
            </div>
          </div>
        </Card.Body>
      </Card>
    );
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
        <div className="mt-4 px-4">
          <Row>
            <Col md={3}>
              <StatCard
                title="Total Users"
                value={totalUsers}
                subtitle="Unique users with chats"
                icon={BsPeople}
                bg={["#f093fb", "#f5576c"]}
                onClick={() => navigate("/manage-user")}
              />
            </Col>
            <Col md={3}>
              <StatCard
                title="Chats without Files"
                value={noFileChats}
                subtitle="Messages with no attachments"
                icon={BsBookmark}
                bg={["#5ee7df", "#b490ca"]}
                filter="nofile"
              />
            </Col>
            <Col md={3}>
              <StatCard
                title="Chats with Images"
                value={imageChats}
                subtitle=".jpg and .png attachments"
                icon={BsGraphUp}
                bg={["#43e97b", "#38f9d7"]}
                filter="image"
              />
            </Col>
            <Col md={3}>
              <StatCard
                title="Chats with PDFs"
                value={pdfChats}
                subtitle=".pdf document messages"
                icon={BsGem}
                bg={["#30cfd0", "#330867"]}
                filter="pdf"
              />
            </Col>
          </Row>

          <h5 className="mt-5 mb-3">Monthly Chat Insights</h5>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              barSize={10}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="noFile" fill="#a64bf4" name="No File" />
              <Bar dataKey="withImage" fill="#ff7aa8" name="Image" />
              <Bar dataKey="withPDF" fill="#4caefc" name="PDF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
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
