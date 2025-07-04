import React, { useState, useEffect } from 'react';
import './Settings.css';

function Settings() {
  /**
   * Settings page component for user preferences and application configuration.
   * 
   * Returns:
   *   JSX.Element: Settings interface with tabs and form controls
   */
  const [activeTab, setActiveTab] = useState('general');
  
  // Add debugging to check if component is mounting
  useEffect(() => {
    console.log('Settings component mounted');
  }, []);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Account Settings</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label htmlFor="username" className="form-label">Username</label>
                  <input type="text" className="form-control" id="username" placeholder="Enter your username" />
                </div>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input type="email" className="form-control" id="email" placeholder="Enter your email" />
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </div>
        );
      case 'privacy':
        return (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Privacy Settings</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="showProfile" />
                  <label className="form-check-label settings-label-highlight" htmlFor="showProfile">Show my profile to others</label>
                </div>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="dataCollection" />
                  <label className="form-check-label settings-label-highlight" htmlFor="dataCollection">Allow data collection for analytics</label>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </div>
        );
      case 'assistant':
        return (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Assistant Settings</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3 form-check">
                  <input type="checkbox" className="form-check-input" id="assistantTips" />
                  <label className="form-check-label settings-label-highlight" htmlFor="assistantTips">Show tips from assistant</label>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </div>
        );
      case 'general':
      default:
        return (
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">General Settings</h5>
            </div>
            <div className="card-body">
              <form>
                <div className="mb-3">
                  <label htmlFor="language" className="form-label">Language</label>
                  <select className="form-select" id="language" defaultValue="English">
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor="theme" className="form-label">Theme</label>
                  <select className="form-select" id="theme" defaultValue="Dark">
                    <option>Dark</option>
                    <option>Light</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </form>
            </div>
          </div>
        );
    }
  };
  
  return (
    <div className="h-100 w-100 d-flex flex-column p-4 settings-wrapper">
      <h2 className="mb-4 text-light">Settings</h2>

      <div className="bg-secondary bg-opacity-25 p-4 rounded flex-grow-1">
        <div className="row">
          <div className="col-md-3">
            <div className="nav flex-column nav-pills">
              <button
                className={`nav-link text-start${activeTab === 'general' ? ' active' : ''}`}
                aria-selected={activeTab === 'general'}
                onClick={() => setActiveTab('general')}
                type="button"
              >
                General
              </button>
              <button
                className={`nav-link text-start${activeTab === 'account' ? ' active' : ''}`}
                aria-selected={activeTab === 'account'}
                onClick={() => setActiveTab('account')}
                type="button"
              >
                Account
              </button>
              <button
                className={`nav-link text-start${activeTab === 'privacy' ? ' active' : ''}`}
                aria-selected={activeTab === 'privacy'}
                onClick={() => setActiveTab('privacy')}
                type="button"
              >
                Privacy
              </button>
              <button
                className={`nav-link text-start${activeTab === 'assistant' ? ' active' : ''}`}
                aria-selected={activeTab === 'assistant'}
                onClick={() => setActiveTab('assistant')}
                type="button"
              >
                Assistant Settings
              </button>
            </div>
          </div>
          
          <div className="col-md-9">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;
