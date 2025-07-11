import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Modal, Button, Form, Alert, Card } from 'react-bootstrap';
import './Resources.css';

function Resources() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingResource, setEditingResource] = useState(null);
  const [resourceToDelete, setResourceToDelete] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadData, setUploadData] = useState({
    name: '',
    description: '',
    file: null
  });
  const [refreshing, setRefreshing] = useState(false);

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
    fetchSubject(token);
    fetchResources(token);
  }, [navigate, subjectId]);

  // Auto-refresh resources every 5 seconds if any are still processing
  useEffect(() => {
    const hasProcessingResources = resources.some(resource => 
      resource.extractionStatus === 'processing' || 
      resource.extractionStatus === 'pending' ||
      resource.jsonFileStatus === 'pending'
    );
    
    if (!hasProcessingResources) return;
    
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {

        fetchResources(token);
      }
    }, 5000); // Refresh every 5 seconds
    
    return () => clearInterval(interval);
  }, [resources]);

  const fetchSubject = async (token) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/user`, {
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const subjects = await response.json();
        const currentSubject = subjects.find(s => s.id === subjectId);
        setSubject(currentSubject);
      }
    } catch (err) {
      console.error('Error fetching subject:', err);
    }
  };

  const fetchResources = async (token) => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/${subjectId}/resources`, {
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setResources(data);
      } else {
        setError('Failed to fetch resources');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadResource = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    
    // Validate form fields
    if (!uploadData.name || !uploadData.name.trim()) {
      setError('Please provide a resource name');
      return;
    }
    
    if (!uploadData.file) {
      setError('Please select a PDF file');
      return;
    }

    // Validate file size (40MB = 40 * 1024 * 1024 bytes)
    const maxSize = 40 * 1024 * 1024;
    if (uploadData.file.size > maxSize) {
      setError(`File size too large (${(uploadData.file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 40MB.`);
      return;
    }

    // Validate file type
    if (uploadData.file.type !== 'application/pdf') {
      setError('Only PDF files are allowed. Selected file type: ' + uploadData.file.type);
      return;
    }
    
    // Check if file is empty
    if (uploadData.file.size === 0) {
      setError('Empty file is not allowed');
      return;
    }

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('name', uploadData.name.trim());
    formData.append('description', uploadData.description.trim() || '');
    formData.append('file', uploadData.file);
    formData.append('subjectId', subjectId);



    try {
      setUploading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/${subjectId}/resources`, {
        method: 'POST',
        headers: {
          'x-access-token': token
        },
        body: formData
      });

      const responseData = await response.json();


      if (response.ok) {
        setShowUploadModal(false);
        setUploadData({ name: '', description: '', file: null });
        await fetchResources(token);
      } else {
        setError(responseData.message || `Upload failed with status ${response.status}`);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Network error occurred: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleEditResource = async (e) => {
    e.preventDefault();
    if (!editingResource.name.trim()) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/resources/${editingResource.id}`, {
        method: 'PUT',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editingResource.name,
          description: editingResource.description
        })
      });

      if (response.ok) {
        setShowEditModal(false);
        setEditingResource(null);
        fetchResources(token);
      } else {
        setError('Failed to update resource');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error updating resource:', err);
    }
  };

  const handleDeleteResource = async () => {
    if (!resourceToDelete) return;

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/resources/${resourceToDelete._id}`, {
        method: 'DELETE',
        headers: {
          'x-access-token': token,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setShowDeleteModal(false);
        setResourceToDelete(null);
        fetchResources(token);
      } else {
        setError('Failed to delete resource');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error deleting resource:', err);
    }
  };

  const handleDownloadResource = async (resourceId, fileName) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/resources/${resourceId}/download`, {
        headers: {
          'x-access-token': token
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError('Failed to download resource');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error downloading resource:', err);
    }
  };

  const handleDownloadJson = async (resourceId, resourceName) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/resources/${resourceId}/json`, {
        headers: {
          'x-access-token': token
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${resourceName.replace(/[^a-zA-Z0-9]/g, '_')}_content.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const errorText = await response.text();
        setError(`Failed to download JSON: ${errorText}`);
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error downloading JSON:', err);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    try {
      await fetchResources(token);
    } finally {
      setRefreshing(false);
    }
  };

  const openEditModal = (resource) => {
    setEditingResource({
      id: resource._id,
      name: resource.name,
      description: resource.description || ''
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (resource) => {
    setResourceToDelete(resource);
    setShowDeleteModal(true);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const resetUploadForm = () => {
    setUploadData({ name: '', description: '', file: null });
    setError('');
    setUploading(false);
  };

  const handleCloseUploadModal = () => {
    resetUploadForm();
    setShowUploadModal(false);
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
          <p className="text-light mt-3" style={{ fontSize: "1.1rem" }}>Loading resources...</p>
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
      <div className="resources-container">
        {/* Back Button */}
        <Link to="/subjects" className="btn back-btn">
          ← Back to Subjects
        </Link>

        {/* Header */}
        <div className="d-flex justify-content-between align-items-start mb-4">
          <div>
            <h2 className="resources-title">
              📚 {subject?.name} Resources
            </h2>
            <p className="resources-description">
              {user?.role === 'teacher' 
                ? 'Upload and manage PDF resources for your students. Students can view and download these materials.' 
                : 'Download and view PDF resources provided by your teacher for this subject.'}
            </p>
          </div>
          {user?.role === 'teacher' && (
            <Button 
              className="add-resource-btn"
              onClick={() => setShowUploadModal(true)}
            >
              📎 Upload Resource
            </Button>
          )}
          
          {/* Refresh Button */}
          <Button 
            variant="outline-secondary"
            size="sm"
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="ms-2"
          >
            {refreshing ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Refreshing...
              </>
            ) : (
              <>🔄 Refresh</>
            )}
          </Button>
        </div>

        {/* JSON Info for Teachers */}
        {user?.role === 'teacher' && (
          <div className="alert alert-info mb-4" style={{ 
            backgroundColor: "#1a4d73", 
            borderColor: "#2980b9", 
            color: "#bde7ff" 
          }}>
            <div className="d-flex align-items-center">
              <i className="fas fa-info-circle me-2"></i>
              <div>
                <strong>AI Context Integration:</strong> When you upload PDFs, their content is automatically extracted and saved as JSON files. 
                Students can choose to include this content as context when chatting with the AI assistant. 
                You can download the JSON files using the <span style={{backgroundColor: "#28a745", padding: "2px 6px", borderRadius: "3px", fontSize: "0.8em"}}>📄 JSON</span> button.
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" onClose={() => setError('')} dismissible>
            {error}
          </Alert>
        )}

        {/* Auto-refresh indicator */}
        {resources.some(r => r.extractionStatus === 'processing' || r.extractionStatus === 'pending' || r.jsonFileStatus === 'pending') && (
          <Alert variant="info" className="mb-3">
            <div className="d-flex align-items-center">
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              <small>Auto-refreshing status every 5 seconds for processing resources...</small>
            </div>
          </Alert>
        )}

        {/* Resources Grid */}
        <div className="resources-list">
          {resources.length === 0 ? (
            <div className="no-resources">
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📄</div>
                <p style={{ fontSize: "1.3rem", marginBottom: "1rem", color: "#ffffff" }}>
                  No resources available yet.
                </p>
                {user?.role === 'teacher' && (
                  <p style={{ opacity: "0.8", color: "#e0e0e0" }}>
                    Click "Upload Resource" to add your first PDF resource for students to access.
                  </p>
                )}
              </div>
            </div>
          ) : (
            resources.map((resource) => (
              <Card key={resource._id} className="resource-card">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="resource-name">{resource.name}</h5>
                      <p className="resource-filename">📄 {resource.fileName}</p>
                    </div>
                    <span className="resource-size">{formatFileSize(resource.fileSize)}</span>
                  </div>
                  
                  {resource.description && (
                    <p className="resource-description">{resource.description}</p>
                  )}
                  
                  <div className="resource-meta">
                    <small>
                      Uploaded: {new Date(resource.uploadDate).toLocaleDateString()}
                      {resource.uploadedBy && ` by ${resource.uploadedBy.name}`}
                    </small>
                    {resource.extractionStatus && (
                      <div className="extraction-status mt-2">
                        <small>
                          Content Extraction: 
                          <span className={`status-badge status-${resource.extractionStatus}`}>
                            {resource.extractionStatus === 'processing' && '⏳ Processing...'}
                            {resource.extractionStatus === 'completed' && `✅ Complete (${resource.pageCount} pages, ${resource.wordCount} words)`}
                            {resource.extractionStatus === 'failed' && '❌ Failed'}
                            {resource.extractionStatus === 'pending' && '⏸️ Pending'}
                          </span>
                        </small>
                      </div>
                    )}
                    
                    {/* Show JSON file status for teachers */}
                    {user?.role === 'teacher' && (
                      <div className="json-status mt-1">
                        <small>
                          JSON File: 
                          <span className={`status-badge status-${resource.jsonFileStatus || 'pending'}`}>
                            {(!resource.jsonFileStatus || resource.jsonFileStatus === 'pending') && '⏸️ Pending'}
                            {resource.jsonFileStatus === 'created' && '✅ Created'}
                            {resource.jsonFileStatus === 'failed' && '❌ Failed'}
                          </span>
                        </small>
                      </div>
                    )}
                  </div>
                  
                  <div className="resource-actions">
                    <Button 
                      variant="primary"
                      size="sm"
                      onClick={() => handleDownloadResource(resource._id, resource.fileName)}
                    >
                      📥 Download
                    </Button>
                    
                    {user?.role === 'teacher' && (
                      <>
                        <Button 
                          variant="outline-light"
                          size="sm"
                          onClick={() => openEditModal(resource)}
                        >
                          ✏️ Edit
                        </Button>
                        <Button 
                          variant="danger"
                          size="sm"
                          onClick={() => openDeleteModal(resource)}
                        >
                          🗑️ Delete
                        </Button>
                        {resource.jsonFileStatus === 'created' && (
                          <Button 
                            variant="success"
                            size="sm"
                            onClick={() => handleDownloadJson(resource._id, resource.name)}
                            title="Download extracted content as JSON"
                          >
                            � JSON
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </Card.Body>
              </Card>
            ))
          )}
        </div>

        {/* Upload Resource Modal */}
        <Modal 
          show={showUploadModal} 
          onHide={handleCloseUploadModal}
          contentClassName="bg-dark text-light"
        >
          <Modal.Header closeButton style={{ borderColor: "#404040" }}>
            <Modal.Title>Upload New Resource</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleUploadResource}>
              <Form.Group className="mb-3">
                <Form.Label>Resource Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter resource name"
                  value={uploadData.name}
                  onChange={(e) => setUploadData({...uploadData, name: e.target.value})}
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
                  placeholder="Enter resource description"
                  value={uploadData.description}
                  onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                  style={{ 
                    backgroundColor: "#2a2a2a", 
                    borderColor: "#404040", 
                    color: "#fff" 
                  }}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>PDF File</Form.Label>
                <Form.Control
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})}
                  required
                  style={{ 
                    backgroundColor: "#2a2a2a", 
                    borderColor: "#404040", 
                    color: "#fff" 
                  }}
                />
                <Form.Text className="text-muted">
                  Only PDF files are allowed. Maximum file size: 40MB<br/>
                  📄 <strong>Note:</strong> After upload, the PDF content will be automatically extracted and saved as a JSON file for AI context use.
                </Form.Text>
              </Form.Group>

              <div className="d-flex justify-content-end gap-2">
                <Button 
                  variant="secondary" 
                  onClick={handleCloseUploadModal}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="add-resource-btn"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Uploading...
                    </>
                  ) : (
                    'Upload Resource'
                  )}
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Edit Resource Modal */}
        <Modal 
          show={showEditModal} 
          onHide={() => setShowEditModal(false)}
          contentClassName="bg-dark text-light"
        >
          <Modal.Header closeButton style={{ borderColor: "#404040" }}>
            <Modal.Title>Edit Resource</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form onSubmit={handleEditResource}>
              <Form.Group className="mb-3">
                <Form.Label>Resource Name</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter resource name"
                  value={editingResource?.name || ''}
                  onChange={(e) => setEditingResource({...editingResource, name: e.target.value})}
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
                  placeholder="Enter resource description"
                  value={editingResource?.description || ''}
                  onChange={(e) => setEditingResource({...editingResource, description: e.target.value})}
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
                  className="add-resource-btn"
                >
                  Save Changes
                </Button>
              </div>
            </Form>
          </Modal.Body>
        </Modal>

        {/* Delete Resource Modal */}
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
              Are you sure you want to delete the resource "<strong>{resourceToDelete?.name}</strong>"? This action cannot be undone.
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
              onClick={handleDeleteResource}
            >
              Delete Resource
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </div>
  );
}

export default Resources;
