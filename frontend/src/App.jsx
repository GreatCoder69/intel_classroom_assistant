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
import Layout from "./components/Layout";

// A wrapper component that adds the Layout to a component
const WithLayout = ({ Component }) => (
  <Layout>
    <Component />
  </Layout>
);

const App = () => (
  <Routes>
    <Route path="/" element={<Navigate to="/login" />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />
    
    {/* Protected routes with Layout */}
    <Route path="/dashboard" element={<WithLayout Component={Dashboard} />} />
    <Route path="/chat" element={<WithLayout Component={ChatPage} />} />
    <Route path="/general-chat" element={<WithLayout Component={GeneralChat} />} />
    <Route path="/history" element={<WithLayout Component={ChatHistory} />} />
    <Route path="/chat-detail" element={<WithLayout Component={ChatDetail} />} />
    
    {/* Admin routes */}
    <Route path="/admin" element={<AdminPage />} />
    <Route path="/manage-user" element={<EditProfile />} />
    <Route path="/edit-user/:email" element={<EditUser />} />
    <Route path="/error-logs" element={<AdminErrorLogs />} />
  </Routes>
);

export default App;
