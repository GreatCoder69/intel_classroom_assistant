import React, { useEffect, useState } from "react";
import { Form, Button, Alert, Image, Dropdown } from "react-bootstrap";
import { FaBars } from "react-icons/fa";
import { useParams, useNavigate } from "react-router-dom";
import "./adminstyle.css";

const EditUser = () => {
  const { email } = useParams();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    profileimg: null,
    profileimgURL: "",
  });
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/user?email=${email}`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => {
        setFormData({
          email: data.email,
          name: data.name || "",
          phone: data.phone || "",
          password: data.password || "",
          profileimg: null,
          profileimgURL: data.profileimg || "/default-profile.png",
        });
      });
  }, [email, token]);

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "profileimg") {
      setFormData((prev) => ({
        ...prev,
        profileimg: files[0],
        profileimgURL: URL.createObjectURL(files[0]),
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = new FormData();
    Object.entries(formData).forEach(([key, val]) => {
      if (key !== "profileimgURL" && val) form.append(key, val);
    });

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/admin/user`, {
      method: "PUT",
      headers: { "x-access-token": token },
      body: form,
    });

    if (res.ok) {
      navigate("/admin"); // Go back to admin panel
    } else {
      const result = await res.json();
      setMessage(result.message || "Update failed.");
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div className={`admin-panel ${sidebarOpen ? "sidebar-open" : ""}`}>
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h4 className="purple-logo">💜 Purple</h4>
        </div>
        <ul className="sidebar-nav">
          <li onClick={() => navigate("/admin")}>Dashboard</li>
          <li onClick={() => navigate("/history")}>Chat History</li>
          <li onClick={() => navigate("/manage-user")}>Manage User</li>
          <li onClick={() => navigate("/error-logs")}>Error Logs</li>
        </ul>
      </aside>

      {/* Main content */}
      <main className="main-content" style={{ fontSize: "0.9rem" }}>
        <header className="topbar">
          <Button
            variant="light"
            className="burger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <FaBars />
          </Button>
          <Dropdown className="admin-dropdown ms-auto">
            <Dropdown.Toggle variant="light" className="admin-toggle">
              <Image
                src="https://www.shutterstock.com/editorial/image-editorial/M2T3Qc10N2zaIawbNzA0Nzg=/cole-palmer-chelsea-celebrates-scoring-his-fourth-440nw-14434919bx.jpg"
                roundedCircle
                width={40}
                height={40}
              />
              <span className="ms-2">admin</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={handleSignOut}>Sign Out</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </header>

        {/* Edit Form Card */}
        <div style={{ padding: "40px" }}>
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "15px",
              padding: "30px 40px",
              maxWidth: "900px",
              maxHeight: "800px",
              margin: "0 auto",
              boxShadow: "0 0 12px rgba(0,0,0,0.1)",
            }}
          >
            <div className="text-center mb-4">
              <Image
                src={formData.profileimgURL || "/default-profile.png"}
                roundedCircle
                width="120"
                height="120"
                style={{ objectFit: "cover", border: "4px solid #9b59b6" }}
              />
              <h4 className="mt-3">Edit Profile</h4>
              <p className="text-muted" style={{ fontSize: "1rem" }}>
                Make changes and hit update
              </p>
            </div>

            <Form onSubmit={handleSubmit}>
              <Form.Group className="mb-3">
                <Form.Label>Name</Form.Label>
                <Form.Control
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </Form.Group>
              <Form.Group className="mb-4">
                <Form.Label>Profile Image</Form.Label>
                <Form.Control
                  type="file"
                  name="profileimg"
                  onChange={handleInputChange}
                />
              </Form.Group>

              {message && <Alert variant="info">{message}</Alert>}

              <div className="d-flex gap-3">
                <Button
                  type="submit"
                  style={{
                    backgroundColor: "#9b59b6",
                    border: "none",
                    minWidth: "130px",
                  }}
                >
                  Update
                </Button>
                <Button
                  variant="outline-secondary"
                  onClick={() => navigate("/manage-user")}
                  style={{ minWidth: "130px" }}
                >
                  Cancel
                </Button>
              </div>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EditUser;
