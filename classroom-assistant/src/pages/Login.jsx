// filepath: c:\Users\gitaa\OneDrive\Desktop\Coding\intel_classroom_assistant\classroom-assistant\src\pages\Login.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Card, Alert } from 'react-bootstrap';
import { FaUser, FaLock, FaGraduationCap } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

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
    <Container fluid className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-dark text-light">
      <Row className="w-100 justify-content-center mb-5">
        <Col md={8} className="text-center">
          <h1 className="display-4 mb-3">Intel Classroom Assistant</h1>
          <p className="lead mb-0">
            An AI-powered educational platform for enhancing learning experiences
          </p>
        </Col>
      </Row>
      <Row className="w-100 justify-content-center">
        <Col md={6} lg={4}>
          <Card className="bg-secondary bg-opacity-25 p-4 shadow">
            <Card.Body>              
              <div className="text-center mb-4">
                <h2>Login</h2>
                <p className="text-muted">
                  <FaGraduationCap className="me-2" />
                  Access Your Account
                </p>
              </div>
              
              {error && <Alert variant="danger">{error}</Alert>}
              
              <Form onSubmit={handleSubmit}>
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    <FaUser className="me-2" />
                    Username
                  </Form.Label>
                  <Form.Control
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    required
                  />
                </Form.Group>
                
                <Form.Group className="mb-4">
                  <Form.Label>
                    <FaLock className="me-2" />
                    Password
                  </Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                </Form.Group>
                
                <div className="d-grid">
                  <Button
                    variant="primary"
                    type="submit"
                    className="py-2"
                    disabled={loading}
                  >
                    {loading ? 'Logging in...' : 'Login'}
                  </Button>
                </div>              </Form>
              <div className="text-center mt-3">
                <p className="text-muted small">Use "student" or "teacher" as both username and password</p>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
      <Row className="mt-5">
        <Col className="text-center">
          <p className="text-muted small">© 2025 Intel Classroom Assistant | Powered by OpenVINO™</p>
        </Col>
      </Row>
    </Container>
  );
}

export default Login;