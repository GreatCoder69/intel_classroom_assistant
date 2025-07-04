import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import './Subjects.css';

function Subjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: '',
    color: 'primary'
  });

  const colorOptions = [
    { value: 'primary', label: 'Blue' },
    { value: 'success', label: 'Green' },
    { value: 'danger', label: 'Red' },
    { value: 'warning', label: 'Yellow' },
    { value: 'info', label: 'Cyan' },
    { value: 'secondary', label: 'Gray' }
  ];

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchSubjects(token, parsedUser.role);
  }, [navigate]);

  const fetchSubjects = async (token, userRole) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/user`, {
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubjects(data);
      } else {
        setError('Failed to fetch subjects');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects`, {
        method: 'POST',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSubject)
      });

      if (response.ok) {
        const data = await response.json();
        // Refresh subjects list
        fetchSubjects(token, user.role);
        setShowAddModal(false);
        setNewSubject({ name: '', description: '', color: 'primary' });
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to add subject');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error adding subject:', err);
    }
  };

  const handleUpdateProgress = async (subjectId, newProgress) => {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/${subjectId}/progress`, {
        method: 'PUT',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ progress: newProgress })
      });

      if (response.ok) {
        // Update local state
        setSubjects(prev => prev.map(subject => 
          subject.id === subjectId 
            ? { ...subject, progress: newProgress }
            : subject
        ));
      } else {
        setError('Failed to update progress');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating progress:', err);
    }
  };

  if (loading) {
    return (
      <div className="subjects-container">
        <div className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="subjects-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="subjects-title">
          {user?.role === 'teacher' ? 'Manage Subjects' : 'My Subjects'}
        </h2>
        {user?.role === 'teacher' && (
          <Button 
            variant="primary" 
            onClick={() => setShowAddModal(true)}
          >
            Add Subject
          </Button>
        )}
      </div>

      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      <div className="subjects-list">
        {subjects.length === 0 ? (
          <div className="text-center">
            <p>No subjects available.</p>
            {user?.role === 'teacher' && (
              <p>Click "Add Subject" to create your first subject.</p>
            )}
          </div>
        ) : (
          subjects.map((subject) => (
            <div key={subject.id} className="subject-card">
              <div className="subject-name">{subject.name}</div>
              {subject.description && (
                <div className="subject-description">{subject.description}</div>
              )}
              
              {user?.role === 'student' && (
                <>
                  <div className="progress mb-3" style={{ height: '1.1rem', background: '#181a1b', borderRadius: '8px' }}>
                    <div
                      className={`progress-bar bg-${subject.color}`}
                      role="progressbar"
                      style={{ 
                        width: `${subject.progress || 0}%`, 
                        fontWeight: 600, 
                        fontSize: '0.95rem', 
                        borderRadius: '8px' 
                      }}
                      aria-valuenow={subject.progress || 0}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    >
                      {subject.progress || 0}%
                    </div>
                  </div>
                  <div className="d-flex justify-content-center gap-2">
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => handleUpdateProgress(subject.id, Math.min((subject.progress || 0) + 10, 100))}
                    >
                      +10% Progress
                    </button>
                    <button className="btn btn-sm btn-outline-info">
                      Resources
                    </button>
                  </div>
                </>
              )}

              {user?.role === 'teacher' && (
                <>
                  <div className="teacher-stats">
                    <small className="text-muted">
                      Students: {subject.studentCount || 0} | 
                      Assignments: {subject.assignmentCount || 0} | 
                      Avg Progress: {subject.averageProgress || 0}%
                    </small>
                  </div>
                  <div className="d-flex justify-content-center gap-2 mt-2">
                    <button className="btn btn-sm btn-outline-primary">
                      Manage
                    </button>
                    <button className="btn btn-sm btn-outline-info">
                      Resources
                    </button>
                    <button className="btn btn-sm btn-outline-success">
                      Assignments
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Subject Modal (Teacher only) */}
      <Modal show={showAddModal} onHide={() => setShowAddModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Subject</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleAddSubject}>
            <Form.Group className="mb-3">
              <Form.Label>Subject Name</Form.Label>
              <Form.Control
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject(prev => ({...prev, name: e.target.value}))}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={newSubject.description}
                onChange={(e) => setNewSubject(prev => ({...prev, description: e.target.value}))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Color Theme</Form.Label>
              <Form.Select
                value={newSubject.color}
                onChange={(e) => setNewSubject(prev => ({...prev, color: e.target.value}))}
              >
                {colorOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddSubject}>
            Add Subject
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default Subjects;