import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Button, Container, Row, Col, Card, Alert } from "react-bootstrap";
import { Formik } from "formik";
import { 
  FaUser, 
  FaLock, 
  FaEnvelope, 
  FaGraduationCap, 
  FaInfoCircle, 
  FaUserGraduate, 
  FaChalkboardTeacher,
  FaCheckCircle
} from "react-icons/fa";
import "../styles/Login.css";

const Signup = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSignup = async (values, { setSubmitting }) => {
    try {
      if (values.password !== values.confirmPassword) {
        setSignupError("Passwords do not match");
        return;
      }

      // Include the selected role in the request
      const payload = { 
        name: values.name,
        email: values.email,
        password: values.password,
        role: selectedRole 
      };
      
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (res.ok) {
        setSignupSuccess(true);
        setSignupError("");
        // Redirect to login after 2 seconds
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setSignupError(data.message || "Registration failed. Please try again.");
      }
    } catch (err) {
      console.error("Signup error:", err);
      setSignupError("A network error occurred. Please try again.");
    } finally {
      setSubmitting(false);
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
            <h1 className="display-4 mb-2">Intel Classroom Assistant</h1>
            <p className="lead">
              Join our AI-powered educational platform today
            </p>
          </Col>
        </Row>
        
        <Row className="w-100 justify-content-center">
          <Col md={6} lg={4}>
            <Card className="login-card">
              <div className="login-card-header text-center py-4">
                <h2 className="mb-1">Create Account</h2>
                <p className="mb-0">
                  <FaGraduationCap className="me-2 form-icon" />
                  Sign up for a new account
                </p>
              </div>
              
              <Card.Body className="login-card-body">              
                {signupError && <Alert variant="danger">{signupError}</Alert>}
                {signupSuccess && (
                  <Alert variant="success">
                    <FaCheckCircle className="me-2" /> Registration successful! Redirecting to login...
                  </Alert>
                )}
                
                <Formik
                  initialValues={{ name: "", email: "", password: "", confirmPassword: "" }}
                  onSubmit={handleSignup}
                >
                  {({ handleSubmit, handleChange, values, isSubmitting }) => (
                    <Form onSubmit={handleSubmit}>
                      <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center">
                          <FaUser className="me-2 form-icon" />
                          <span>Full Name</span>
                        </Form.Label>
                        <Form.Control
                          type="text"
                          name="name"
                          className="login-input"
                          placeholder="Enter your full name"
                          size="lg"
                          value={values.name}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center">
                          <FaEnvelope className="me-2 form-icon" />
                          <span>Email Address</span>
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
                      
                      <Form.Group className="mb-3">
                        <Form.Label className="d-flex align-items-center">
                          <FaLock className="me-2 form-icon" />
                          <span>Password</span>
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="password"
                          className="login-input"
                          placeholder="Create a password"
                          size="lg"
                          value={values.password}
                          onChange={handleChange}
                          minLength="6"
                          required
                        />
                        <small className="text-muted d-block mt-1">
                          Must be at least 6 characters long
                        </small>
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label className="d-flex align-items-center">
                          <FaLock className="me-2 form-icon" />
                          <span>Confirm Password</span>
                        </Form.Label>
                        <Form.Control
                          type="password"
                          name="confirmPassword"
                          className="login-input"
                          placeholder="Confirm your password"
                          size="lg"
                          value={values.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-4">
                        <Form.Label className="d-flex align-items-center">
                          <FaGraduationCap className="me-2 form-icon" />
                          <span>Register As</span>
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
                      
                      <div className="mt-4">
                        <button
                          type="submit"
                          className="btn btn-block btn-lg font-weight-medium auth-form-btn login-btn w-100"
                          disabled={isSubmitting || signupSuccess}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Creating Account...
                            </>
                          ) : "CREATE ACCOUNT"}
                        </button>
                      </div>
                    </Form>
                  )}
                </Formik>
                
                <div className="text-center mt-4 font-weight-light">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary">
                    Sign in
                  </Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <Row className="mt-4 w-100">
          <Col className="text-center">
            <p className="login-footer intel-powered">
              © 2025 Intel Classroom Assistant | Powered by OpenVINO™
            </p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Signup;
