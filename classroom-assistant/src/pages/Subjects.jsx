import React from 'react';
import '../Subjects.css';

function Subjects() {
  /**
   * Subjects page component displaying available subjects with progress tracking.
   * 
   * Returns:
   *   JSX.Element: Subject cards with progress bars and action buttons
   */
  const subjects = [
    { id: 1, name: 'Mathematics', progress: 45, color: 'primary' },
    { id: 2, name: 'Science', progress: 60, color: 'success' },
    { id: 3, name: 'History', progress: 30, color: 'info' },
    { id: 4, name: 'Literature', progress: 75, color: 'warning' },
    { id: 5, name: 'Computer Science', progress: 90, color: 'danger' },
  ];

  return (
    <div className="subjects-container">
      <h2 className="subjects-title">Subjects</h2>
      <div className="subjects-list">
        {subjects.map((subject) => (
          <div key={subject.id} className="subject-card">
            <div className="subject-name">{subject.name}</div>
            <div className="progress mb-3" style={{ height: '1.1rem', background: '#181a1b', borderRadius: '8px' }}>
              <div
                className={`progress-bar bg-${subject.color}`}
                role="progressbar"
                style={{ width: `${subject.progress}%`, fontWeight: 600, fontSize: '0.95rem', borderRadius: '8px' }}
                aria-valuenow={subject.progress}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {subject.progress}%
              </div>
            </div>
            <div className="d-flex justify-content-end">
              <button className="btn btn-sm btn-outline-secondary me-2">Resources</button>
              <button className="btn btn-sm btn-outline-primary">Start Learning</button>
            </div>
          </div>
        ))}
      </div>
      <button className="subjects-add-btn">Add Subject</button>
    </div>
  );
}

export default Subjects;
