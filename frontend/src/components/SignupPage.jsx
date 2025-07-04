import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Button, Container, Row, Col, Card, Alert } from "react-bootstrap";
import { Formik } from "formik";
import {
  FaUser, FaLock, FaEnvelope, FaPhone, FaGraduationCap,
  FaUserGraduate, FaChalkboardTeacher, FaCheckCircle
} from "react-icons/fa";
import "../styles/Login.css";

const Signup = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState("student");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState(false);

  /* ───────────────────── SIGNUP HANDLER ───────────────────── */
  const handleSignup = async (values, { setSubmitting }) => {
    try {
      if (values.password !== values.confirmPassword) {
        setSignupError("Passwords do not match");
        return;
      }

      // payload now includes phone + role
      const payload = {
        name    : values.name,
        email   : values.email,
        phone   : values.phone,
        password: values.password,
        role    : selectedRole
      };

      const res  = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/signup`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        setSignupSuccess(true);
        setSignupError("");
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
  /* ─────────────────────────────────────────────────────────── */

  return (
    <div className="login-container d-flex align-items-center auth px-0">
      {/* floating circles … */ }

      <Container fluid className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        {/* brand header … */}

        <Row className="w-100 justify-content-center">
          <Col md={6} lg={4}>
            <Card className="login-card">
              <div className="login-card-header text-center py-4">
                <h2 className="mb-1">Create Account</h2>
                <p className="mb-0"><FaGraduationCap className="me-2 form-icon" />Sign up</p>
              </div>

              <Card.Body className="login-card-body">
                {signupError   && <Alert variant="danger">{signupError}</Alert>}
                {signupSuccess && (
                  <Alert variant="success">
                    <FaCheckCircle className="me-2" /> Registration successful! Redirecting…
                  </Alert>
                )}

                <Formik
                  initialValues={{ name: "", email: "", phone: "", password: "", confirmPassword: "" }}
                  onSubmit={handleSignup}
                >
                  {({ handleSubmit, handleChange, values, isSubmitting }) => (
                    <Form onSubmit={handleSubmit}>
                      {/* Full Name */}
                      <Form.Group className="mb-3">
                        <Form.Label><FaUser className="me-2 form-icon" />Full Name</Form.Label>
                        <Form.Control
                          name="name" value={values.name} onChange={handleChange}
                          placeholder="Enter your full name" size="lg" required
                        />
                      </Form.Group>

                      {/* Email */}
                      <Form.Group className="mb-3">
                        <Form.Label><FaEnvelope className="me-2 form-icon" />Email</Form.Label>
                        <Form.Control
                          type="email" name="email" value={values.email} onChange={handleChange}
                          placeholder="Enter your email" size="lg" required
                        />
                      </Form.Group>

                      {/* Phone */}
                      <Form.Group className="mb-3">
                        <Form.Label><FaPhone className="me-2 form-icon" />Phone</Form.Label>
                        <Form.Control
                          name="phone" value={values.phone} onChange={handleChange}
                          placeholder="Enter your phone" size="lg" required
                        />
                      </Form.Group>

                      {/* Password */}
                      <Form.Group className="mb-3">
                        <Form.Label><FaLock className="me-2 form-icon" />Password</Form.Label>
                        <Form.Control
                          type="password" name="password" value={values.password} onChange={handleChange}
                          placeholder="Create a password" size="lg" minLength="6" required
                        />
                      </Form.Group>

                      {/* Confirm Password */}
                      <Form.Group className="mb-4">
                        <Form.Label><FaLock className="me-2 form-icon" />Confirm Password</Form.Label>
                        <Form.Control
                          type="password" name="confirmPassword" value={values.confirmPassword}
                          onChange={handleChange} placeholder="Confirm password" size="lg" required
                        />
                      </Form.Group>

                      {/* Role selector */}
                      <Form.Group className="mb-4">
                        <Form.Label><FaGraduationCap className="me-2 form-icon" />Register As</Form.Label>
                        <div className="d-flex role-selector">
                          <Button
                            variant={selectedRole === "student" ? "primary" : "outline-primary"}
                            className={`flex-grow-1 d-flex align-items-center justify-content-center py-2 ${selectedRole === "student" ? "active-role" : ""}`}
                            onClick={() => setSelectedRole("student")} type="button"
                          >
                            <FaUserGraduate className="me-2" />Student
                          </Button>
                          <Button
                            variant={selectedRole === "teacher" ? "primary" : "outline-primary"}
                            className={`flex-grow-1 d-flex align-items-center justify-content-center py-2 ms-2 ${selectedRole === "teacher" ? "active-role" : ""}`}
                            onClick={() => setSelectedRole("teacher")} type="button"
                          >
                            <FaChalkboardTeacher className="me-2" />Teacher
                          </Button>
                        </div>
                      </Form.Group>

                      <button
                        type="submit"
                        className="btn btn-block btn-lg auth-form-btn login-btn w-100"
                        disabled={isSubmitting || signupSuccess}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />Creating…
                          </>
                        ) : "CREATE ACCOUNT"}
                      </button>
                    </Form>
                  )}
                </Formik>

                <div className="text-center mt-4">
                  Already have an account? <Link to="/login" className="text-primary">Sign in</Link>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Signup;
