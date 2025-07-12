import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import ChatPage from "./components/ChatPage";
import Dashboard from "./pages/Dashboard";
import Subjects from "./pages/Subjects";
import Resources from "./pages/Resources";
import TeacherChat from "./components/TeacherChat";
import ProtectedRoute from "./components/ProtectedRoute";
import SuggestionsPage from "./pages/SuggestionsPage";
import TeacherSuggestion from "./pages/TeacherSuggestions";
import VoiceTestComponent from "./components/VoiceTestComponent";

const App = () => (
  <Routes>
    {/* Public Routes */}
    <Route path="/login" element={<LoginPage />} />
    <Route path="/signup" element={<SignupPage />} />

    {/* Debug Route */}
    <Route path="/voice-test" element={<VoiceTestComponent />} />

    {/* Main App Routes without Layout */}
    <Route path="/dashboard" element={
      <ProtectedRoute requiredRole="teacher">
        <Dashboard />
      </ProtectedRoute>
    } />
    <Route path="/subjects" element={<Subjects />} />
    <Route path="/subjects/:subjectId/resources" element={<Resources />} />
    <Route path="/chat" element={<ChatPage />} />
    
    
    <Route path="/suggestions" element={<SuggestionsPage />} />
    <Route path="/teacher-suggestions" element={<TeacherSuggestion />} />
    <Route path="/teacher-chat" element={
      <ProtectedRoute requiredRole="teacher">
        <TeacherChat />
      </ProtectedRoute>
    } />


    {/* Default redirect */}
    <Route path="*" element={<Navigate to="/login" replace />} />
  </Routes>
);

export default App;
