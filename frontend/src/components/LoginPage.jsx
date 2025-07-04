import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Button, Container, Row, Col, Card, Alert } from "react-bootstrap";
import { Formik } from "formik";
import { FaUser, FaLock, FaGraduationCap, FaInfoCircle, FaUserGraduate, FaChalkboardTeacher } from "react-icons/fa";
import "../styles/Login.css";

const Login = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");
  const [loginError, setLoginError] = useState("");

const handleLogin = async (values) => {
  try {
    // Include selected role in the request payload
    const payload = { ...values, role: selectedRole };

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    // ✳️ Validate role: prevent student logging in as teacher, and vice versa
    if (data.user && data.user.role !== selectedRole) {
      setLoginError(
        `You selected “${selectedRole}” but this account is a “${data.user.role}”.`
      );
      return;
    }

    if (data.accessToken && data.user) {
      localStorage.setItem("token", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (data.user.role == "teacher") {
        navigate("/dashboard");
      } else {
        navigate("/chat");
      }
    } else {
      setLoginError(data.message || "Login failed. Please check your credentials.");
    }
  } catch (err) {
    console.error("Login error:", err);
    setLoginError("A network error occurred. Please try again.");
  }
};


  return (
    <div className="login-container d-flex align-items-center auth px-0">
      {/* Animated background elements */}
      <div className="floating-circle circle-1"></div>
      <div className="floating-circle circle-2"></div>
      <div className="floating-circle circle-3"></div>
      
      <Container fluid className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <Row className="w-100 justify-content-center mb-4">
          <Col md={8} className="text-center login-brand">
            <h1 className="display-4 mb-2">EduAI</h1>
            <p className="lead">
              An AI-powered educational platform for enhancing learning experiences
            </p>
          </Col>
        </Row>
        
        <Row className="w-100 justify-content-center">
          <Col md={6} lg={4}>
            <Card className="login-card">
              <div className="login-card-header text-center py-4">
                <h2 className="mb-1">Welcome Back</h2>
                <p className="mb-0">
                  <FaGraduationCap className="me-2 form-icon" />
                  Sign in to your account
                </p>
              </div>
              
              <Card.Body className="login-card-body">              
                {loginError && <Alert variant="danger">{loginError}</Alert>}
                
                <Formik
                  initialValues={{ email: "", password: "" }}
                  onSubmit={handleLogin}
                >
                  {({ handleSubmit, handleChange, values }) => (
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center">
                          <FaUser className="me-2 form-icon" />
                          <span>Email</span>
                        </Form.Label>
                        <Form.Control
                          type="email"
                          name="email"
                          className="login-input"
                          placeholder="Enter your email"
                          size="lg"
                          value={values.email}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label className="d-flex align-items-center">
                          <FaLock className="me-2 form-icon" />
                          <span>Password</span>
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          className="login-input"
                          placeholder="Enter your password"
                          size="lg"
                          value={values.password}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label className="d-flex align-items-center">
                          <FaGraduationCap className="me-2 form-icon" />
                          <span>Login As</span>
                        </Form.Label>
                        <div className="d-flex role-selector">
                          <Button 
                            variant={selectedRole === "student" ? "primary" : "outline-primary"}
                            className={`flex-grow-1 d-flex align-items-center justify-content-center py-2 ${selectedRole === "student" ? "active-role" : ""}`}
                            onClick={() => setSelectedRole("student")}
                            type="button"
                          >
                            <FaUserGraduate className="me-2" />
                            Student
                          </Button>
                          <Button 
                            variant={selectedRole === "teacher" ? "primary" : "outline-primary"}
                            className={`flex-grow-1 d-flex align-items-center justify-content-center py-2 ms-2 ${selectedRole === "teacher" ? "active-role" : ""}`}
                            onClick={() => setSelectedRole("teacher")}
                            type="button"
                          >
                            <FaChalkboardTeacher className="me-2" />
                            Teacher
                          </Button>
                        </div>
                      </Form.Group>
                      
                      <div className="my-3 d-flex justify-content-between align-items-center">
                        <div className="form-check">
                          <label className="form-check-label text-muted">
                            <input type="checkbox" className="form-check-input" />
                            <i className="input-helper"></i>
                            Keep me signed in
                          </label>
                        </div>
                        <a
                          href="!#"
                          onClick={(e) => e.preventDefault()}
                          className="auth-link text-black"
                          style={{ fontSize: "14px" }}
                        >
                          Forgot password?
                        </a>
                      </div>
                      
                      <div className="mt-4">
                        <button
                          type="submit"
                          className="btn btn-block btn-lg font-weight-medium auth-form-btn login-btn w-100"
                        >
                          SIGN IN
                        </button>
                      </div>
                      
                      
                    </Form>
                  )}
                </Formik>
                
                <div className="text-center mt-4 font-weight-light">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary">
                    Create
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row className="mt-4 w-100">
          <Col className="text-center">
            <p className="login-footer intel-powered">
              © 2025 EduAI
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;