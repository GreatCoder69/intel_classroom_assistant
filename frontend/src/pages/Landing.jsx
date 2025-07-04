import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { FaGraduationCap } from 'react-icons/fa';

function Landing() {
  /**
   * Landing page component with application introduction and login access.
   * 
   * Returns:
   *   JSX.Element: Welcome page with branding and login button
   */
  return (
    <Container fluid className="d-flex flex-column justify-content-center align-items-center vh-100 bg-dark text-light">
      <Row className="w-100 justify-content-center">
        <Col md={8} className="text-center mb-5">
          <h1 className="display-4 mb-4">Intel Classroom Assistant</h1>
          <p className="lead">
            An AI-powered educational platform for enhancing learning experiences
          </p>
          <hr className="my-4 bg-light" />
          <p>
            Welcome to our intelligent classroom tools
          </p>
        </Col>
      </Row>
      
      <Row className="w-100 justify-content-center">
        <Col md={6} className="text-center mb-4">
          <FaGraduationCap size={60} className="mb-4 text-primary" />
          <h2 className="mb-4">AI-Powered Learning Experience</h2>
          <p className="lead mb-5">
            Get started with our classroom assistant featuring AI tutoring and interactive learning
          </p>
          <Link to="/login">
            <Button variant="primary" size="lg" className="px-5 py-3">
              Login to Get Started
            </Button>
          </Link>
        </Col>
      </Row>
      
      <footer className="text-center mt-5">
        <p className="text-muted">© 2025 Intel Classroom Assistant | Powered by OpenVINO™</p>
      </footer>
    </Container>
  );
}

export default Landing;
