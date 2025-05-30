/**
 * Main entry point for the Intel Classroom Assistant React application
 * 
 * This file initializes the React application by:
 * - Importing necessary CSS dependencies (Bootstrap and custom dark theme)
 * - Setting up global dark theme styles for the document
 * - Creating the React root and rendering the main App component
 */

import 'bootstrap/dist/css/bootstrap.min.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './darkTheme.css'; // Import our custom dark theme styles

// Global style to ensure dark theme throughout the app
document.documentElement.style.backgroundColor = '#1a1a1a';
document.body.style.backgroundColor = '#1a1a1a';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
