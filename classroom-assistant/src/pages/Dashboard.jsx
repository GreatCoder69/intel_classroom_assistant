import React from 'react';

function Dashboard() {
  return (
    <div className="h-100 w-100 d-flex flex-column p-4">
      <h2 className="mb-4">Dashboard</h2>
      <div className="bg-secondary bg-opacity-25 p-4 rounded flex-grow-1">
        <div className="row">
          <div className="col-md-6 mb-4">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <h5 className="card-title">Recent Activity</h5>
                <p className="card-text">No recent activity to display.</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card bg-info text-white">
              <div className="card-body">
                <h5 className="card-title">Today's Schedule</h5>
                <p className="card-text">No scheduled classes today.</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card bg-success text-white">
              <div className="card-body">
                <h5 className="card-title">Learning Progress</h5>
                <p className="card-text">Start learning to see your progress.</p>
              </div>
            </div>
          </div>
          
          <div className="col-md-6 mb-4">
            <div className="card bg-warning text-dark">
              <div className="card-body">
                <h5 className="card-title">Upcoming Assignments</h5>
                <p className="card-text">No upcoming assignments.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
