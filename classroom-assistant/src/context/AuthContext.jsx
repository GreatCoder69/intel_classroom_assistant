import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  /**
   * Custom hook to access authentication context.
   * 
   * Returns:
   *   AuthContext: Authentication context values
   */
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // 'student' or 'teacher'

  useEffect(() => {
    // Check if user is stored in localStorage
    const storedUser = localStorage.getItem('currentUser');
    const storedRole = localStorage.getItem('userRole');
    
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setUserRole(storedRole);
    }
    
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    /**
     * Authenticate user with provided credentials.
     * 
     * Args:
     *   username (string): User's username
     *   password (string): User's password
     * 
     * Returns:
     *   Object: Login result with success status and user info
     */
    try {
      // Send login request to backend
      const response = await fetch('http://localhost:8000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      
      // Set user info in state and localStorage
      const user = { username: data.username };
      setCurrentUser(user);
      setUserRole(data.role);
      
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('userRole', data.role);
      
      return { success: true, role: data.role };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    /**
     * Log out current user and clear authentication and stored data.
     */
    setCurrentUser(null);
    setUserRole(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userRole');
  };

  const value = {
    currentUser,
    userRole,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};