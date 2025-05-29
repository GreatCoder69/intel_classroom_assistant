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
