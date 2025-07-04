import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ChatPage from "./components/ChatPage";
import AdminPage from "./components/AdminPage";
import ChatHistory from "./components/ChatHistory";
import EditProfile from "./components/EditProfile";
import EditUser from "./components/EditUser";
import GeneralChat from "./components/GeneralChat";
import ChatDetail from "./components/ChatDetail";
import AdminErrorLogs from "./components/AdminErrorLogs";
import Dashboard from "./pages/Dashboard";

const App = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />

    {/* Main App Routes without Layout */}
    <Route path="/dashboard" element={<Dashboard />} />
    <Route path="/chat" element={<ChatPage />} />
    <Route path="/general-chat" element={<GeneralChat />} />
    <Route path="/history" element={<ChatHistory />} />
    <Route path="/chat-detail" element={<ChatDetail />} />

    {/* Admin routes */}
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/manage-user" element={<EditProfile />} />
    <Route path="/edit-user/:email" element={<EditUser />} />
    <Route path="/error-logs" element={<AdminErrorLogs />} />

    {/* Default redirect */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;
