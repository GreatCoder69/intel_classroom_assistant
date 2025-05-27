import React from 'react';

function Settings() {
  return (
    <div className="h-100 w-100 d-flex flex-column p-4">
      <h2 className="mb-4">Settings</h2>

      <div className="bg-secondary bg-opacity-25 p-4 rounded flex-grow-1">
        <div className="row">
          <div className="col-md-3">
            <div className="nav flex-column nav-pills">
              <button className="nav-link active text-start" aria-selected="true">
                General
              </button>
              <button className="nav-link text-start">
                Account
              </button>
              <button className="nav-link text-start">
                Notifications
              </button>
              <button className="nav-link text-start">
                Privacy
              </button>
              <button className="nav-link text-start">
                Assistant Settings
              </button>
            </div>
          </div>
          
          <div className="col-md-9">
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">General Settings</h5>
              </div>
              <div className="card-body">
                <form>
                  <div className="mb-3">
                    <label htmlFor="language" className="form-label">Language</label>
                    <select className="form-select" id="language">
                      <option selected>English</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Chinese</option>
                    </select>
                  </div>
                  
                  <div className="mb-3">
                    <label htmlFor="theme" className="form-label">Theme</label>
                    <select className="form-select" id="theme">
                      <option selected>Dark</option>
                      <option>Light</option>
                      <option>System Default</option>
                    </select>
                  </div>
                  
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="notifications" checked />
                    <label className="form-check-label" htmlFor="notifications">Enable Notifications</label>
                  </div>
                  
                  <div className="mb-3 form-check">
                    <input type="checkbox" className="form-check-input" id="voiceInput" checked />
                    <label className="form-check-label" htmlFor="voiceInput">Enable Voice Input</label>
                  </div>
                  
                  <button type="submit" className="btn btn-primary">Save Changes</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
