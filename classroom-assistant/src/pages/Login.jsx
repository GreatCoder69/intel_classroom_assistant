import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { FaUser, FaLock, FaGraduationCap, FaInfoCircle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, currentUser } = useAuth();
  
  // Redirect if already logged in
  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);
    const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      return setError('Please enter both username and password');
    }
    
    try {
      setLoading(true);
      // The role will be determined by the server based on username
      const result = await login(username, password);
      
      if (result.success) {
        navigate('/');
      } else {
        setError(result.error || 'Failed to log in');
      }
    } catch (error) {
      setError('An error occurred during login');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };  return (
    <div className="login-container">
      {/* Animated background elements */}
      <div className="floating-circle circle-1"></div>
      <div className="floating-circle circle-2"></div>
      <div className="floating-circle circle-3"></div>
      
      <Container fluid className="d-flex flex-column justify-content-center align-items-center min-vh-100">
        <Row className="w-100 justify-content-center mb-4">
          <Col md={8} className="text-center login-brand">
            <h1 className="display-4 mb-2">Intel Classroom Assistant</h1>
            <p className="lead">
              An AI-powered educational platform for enhancing learning experiences
            </p>
          </Col>
        </Row>
        
        <Row className="w-100 justify-content-center">
          <Col md={6} lg={4}>
            <Card className="login-card">
              <div className="login-card-header text-center">
                <h2 className="mb-1">Welcome Back</h2>
                <p className="mb-0">
                  <FaGraduationCap className="me-2 form-icon" />
                  Sign in to your account
                </p>
              </div>
              
              <Card.Body className="login-card-body">              
                {error && <Alert variant="danger">{error}</Alert>}
                
                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label className="d-flex align-items-center">
                      <FaUser className="me-2 form-icon" />
                      <span>Username</span>
                    </Form.Label>
                    <Form.Control
                      className="login-input"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      required
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Label className="d-flex align-items-center">
                      <FaLock className="me-2 form-icon" />
                      <span>Password</span>
                    </Form.Label>
                    <Form.Control
                      className="login-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                    />
                  </Form.Group>
                  
                  <div className="d-grid mt-4">
                    <Button
                      variant="primary"
                      type="submit"
                      className="login-btn"
                      disabled={loading}
                    >
                      {loading ? 'Logging in...' : 'Sign In'}
                    </Button>
                  </div>
                </Form>
                
                <div className="credentials-hint mt-4">
                  <div className="d-flex align-items-center mb-1">
                    <FaInfoCircle className="me-2 text-primary" />
                    <strong>Demo Credentials</strong>
                  </div>
                  <p className="mb-0 small">
                    Use "student" or "teacher" as both username and password
                  </p>
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
}

export default Login;