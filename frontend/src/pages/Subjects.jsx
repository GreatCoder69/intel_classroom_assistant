import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import './Subjects.css';

function Subjects() {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const [subjectToDelete, setSubjectToDelete] = useState(null);
  const [newSubject, setNewSubject] = useState({
    name: '',
    description: ''
  });

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
        setShowAddModal(false);
        setNewSubject({ name: '', description: '' });
        // Refresh subjects list
        fetchSubjects(token, user.role);
      } else {
        setError('Failed to add subject');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error adding subject:', err);
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    if (!editingSubject.name.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/${editingSubject.id}`, {
        method: 'PUT',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingSubject.name,
          description: editingSubject.description
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingSubject(null);
        // Refresh subjects list
        fetchSubjects(token, user.role);
      } else {
        setError('Failed to update subject');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating subject:', err);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/${subjectToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setSubjectToDelete(null);
        // Refresh subjects list
        fetchSubjects(token, user.role);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to delete subject');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting subject:', err);
    }
  };

  const openEditModal = (subject) => {
    setEditingSubject({
      id: subject.id,
      name: subject.name,
      description: subject.description || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (subject) => {
    setSubjectToDelete(subject);
    setShowDeleteModal(true);
  };

  if (loading) {
    return (
      <div style={{ 
        background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)", 
        minHeight: "100vh", 
        padding: "2rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <div className="text-center">
          <div className="spinner-border text-light" role="status" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-light mt-3" style={{ fontSize: "1.1rem" }}>Loading subjects...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      background: "linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)", 
      minHeight: "100vh", 
      padding: "2rem" 
    }}>
      <div className="subjects-container">
        {/* Header Section */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="subjects-title">
              {user?.role === 'teacher' ? '👨‍🏫 Manage Subjects' : '📚 My Subjects'}
            </h2>
            <p className="subjects-description">
              {user?.role === 'teacher' 
                ? 'Create and manage subjects for your students. Add new subjects to organize learning materials.' 
                : 'Explore your enrolled subjects and track your learning progress across different topics.'}
            </p>
          </div>
          {user?.role === 'teacher' && (
            <Button 
              className="add-subject-btn"
              onClick={() => setShowAddModal(true)}
            >
              + Add Subject
            </Button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="mb-4" style={{ 
            backgroundColor: "rgba(220, 53, 69, 0.1)", 
            borderColor: "#dc3545", 
            color: "#ffffff" 
          }}>
            {error}
          </Alert>
        )}

        {/* Back Button - Only show for teachers */}
        {user?.role === 'teacher' && (
          <Button 
            className="back-btn mb-4"
            onClick={() => navigate('/dashboard')}
          >
            ← Back to Dashboard
          </Button>
        )}

        {/* Back Button for Students - goes to chat */}
        {user?.role === 'student' && (
          <Button 
            className="back-btn mb-4"
            onClick={() => navigate('/chat')}
          >
            ← Back to Chat
          </Button>
        )}

        {/* Subjects Grid */}
        <div className="subjects-list">
          {subjects.length === 0 ? (
            <div className="no-subjects">
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📖</div>
                <p style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "#ffffff" }}>
                  No subjects available yet.
                </p>
                {user?.role === 'teacher' && (
                  <p style={{ opacity: "0.8", color: "#e0e0e0" }}>
                    Click "Add Subject" to create your first subject and start organizing your classroom content.
                  </p>
                )}
              </div>
            </div>
          ) : (
            subjects.map((subject) => (
              <div key={subject.id} className="subject-card">
                <div className="subject-name">{subject.name}</div>
                {subject.description && (
                  <div style={{ 
                    color: "#e0e0e0", 
                    fontSize: "1rem", 
                    lineHeight: "1.5", 
                    marginBottom: "1rem",
                    opacity: "0.9"
                  }}>
                    {subject.description}
                  </div>
                )}
                
                {/* Action buttons for all users */}
                <div className="subject-actions mt-3">
                  <Link 
                    to={`/subjects/${subject.id}/resources`}
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: 'none' }}
                  >
                    📚 View Resources
                  </Link>
                  
                  {user?.role === 'teacher' && (
                    <div className="d-flex gap-2 mt-2">
                      <Button 
                        variant="outline-light" 
                        onClick={() => openEditModal(subject)}
                        size="sm"
                      >
                        ✏️ Edit
                      </Button>
                      <Button 
                        variant="danger" 
                        onClick={() => openDeleteModal(subject)}
                        size="sm"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add Subject Modal */}
        <Modal 
          show={showAddModal} 
          onHide={() => setShowAddModal(false)}
          contentClassName="bg-dark text-light"
        >
          <Modal.Header closeButton style={{ borderColor: "#404040" }}>
            <Modal.Title>Add New Subject</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleAddSubject}>
              <Form.Group className="mb-3">
                <Form.Label>Subject Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter subject name"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject({...newSubject, name: e.target.value})}
                  required
                  style={{ 
                    backgroundColor: "#2a2a2a", 
                    borderColor: "#404040", 
                    color: "#fff" 
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter subject description"
                  value={newSubject.description}
                  onChange={(e) => setNewSubject({...newSubject, description: e.target.value})}
                  style={{ 
                    backgroundColor: "#2a2a2a", 
                    borderColor: "#404040", 
                    color: "#fff" 
                  }}
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="add-subject-btn"
                >
                  Add Subject
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Edit Subject Modal */}
        <Modal 
          show={showEditModal} 
          onHide={() => setShowEditModal(false)}
          contentClassName="bg-dark text-light"
        >
          <Modal.Header closeButton style={{ borderColor: "#404040" }}>
            <Modal.Title>Edit Subject</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleEditSubject}>
              <Form.Group className="mb-3">
                <Form.Label>Subject Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter subject name"
                  value={editingSubject?.name}
                  onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})}
                  required
                  style={{ 
                    backgroundColor: "#2a2a2a", 
                    borderColor: "#404040", 
                    color: "#fff" 
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter subject description"
                  value={editingSubject?.description}
                  onChange={(e) => setEditingSubject({...editingSubject, description: e.target.value})}
                  style={{ 
                    backgroundColor: "#2a2a2a", 
                    borderColor: "#404040", 
                    color: "#fff" 
                  }}
                />
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button 
                  variant="secondary" 
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="add-subject-btn"
                >
                  Save Changes
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Delete Subject Modal */}
        <Modal 
          show={showDeleteModal} 
          onHide={() => setShowDeleteModal(false)}
          contentClassName="bg-dark text-light"
        >
          <Modal.Header closeButton style={{ borderColor: "#404040" }}>
            <Modal.Title>Confirm Deletion</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p style={{ color: "#ffffff" }}>
              Are you sure you want to delete the subject "<strong>{subjectToDelete?.name}</strong>"? This action cannot be undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={() => setShowDeleteModal(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleDeleteSubject}
            >
              Delete Subject
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default Subjects;