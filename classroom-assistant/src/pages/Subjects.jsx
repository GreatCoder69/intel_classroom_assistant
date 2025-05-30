import React from 'react';

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
    <div className="h-100 w-100 d-flex flex-column p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Subjects</h2>
        <button className="btn btn-primary">Add New Subject</button>
      </div>

      <div className="bg-secondary bg-opacity-25 p-4 rounded flex-grow-1">
        {subjects.map((subject) => (
          <div key={subject.id} className="mb-4 card">
            <div className="card-body">
              <h5 className="card-title">{subject.name}</h5>
              <div className="progress mb-3">
                <div 
                  className={`progress-bar bg-${subject.color}`} 
                  role="progressbar" 
                  style={{ width: `${subject.progress}%` }} 
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
          </div>
        ))}
      </div>
    </div>
  );
}

export default Subjects;
