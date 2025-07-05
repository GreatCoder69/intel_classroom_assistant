import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * ProtectedRoute component - Protects routes based on user role
 * 
 * @param {Object} props
 * @param {React.Component} props.children - Component to render if authorized
 * @param {string} props.requiredRole - Required role ('teacher', 'admin', etc.)
 * @param {string} props.redirectTo - Where to redirect if unauthorized (default: '/chat')
 */
const ProtectedRoute = ({ children, requiredRole, redirectTo = '/chat' }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // Check authentication
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    // Check authorization
    try {
      const user = JSON.parse(userData);
      if (user.role !== requiredRole) {
        navigate(redirectTo);
        return;
      }
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate, requiredRole, redirectTo]);

  return children;
};

export default ProtectedRoute;
