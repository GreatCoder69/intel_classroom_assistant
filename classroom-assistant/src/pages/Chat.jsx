import React, { useState, useRef, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { FaMicrophone } from 'react-icons/fa';
import './Chat.css';
import { useAuth } from '../context/AuthContext';

function Chat() {
  /**
   * Chat interface component for AI assistant interaction.
   * Supports both text and voice input for educational queries.
   * 
   * Returns:
   *   JSX.Element: Chat interface with message history and input controls
   */
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const { userRole } = useAuth(); // Get user role from auth context
  const handleSend = async () => {
    /**
     * Send user message to AI assistant and display response.
     */
    if (!input.trim()) return;
    const userInput = input.trim();
    const newMessage = { id: Date.now(), sender: 'user', text: userInput };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Add temporary loading message
      const loadingId = Date.now() + 1;
      setMessages((prev) => [...prev, 
        { id: loadingId, sender: 'bot', text: '...', isLoading: true }
      ]);      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question: userInput,
          role: userRole || 'student' // Pass user role, default to student if not available
        })
      });
      const data = await res.json();
      
      // Replace loading message with actual response
      setMessages((prev) => 
        prev.map(msg => 
          msg.id === loadingId 
            ? { id: loadingId, sender: 'bot', text: data.answer || 'Sorry, I didn\'t understand that.' }
            : msg
        )
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.filter(msg => !msg.isLoading), // Remove any loading messages
        { id: Date.now() + 1, sender: 'bot', text: 'Error contacting the assistant.' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };
  const handleMicClick = async () => {
    /**
     * Handle microphone button click for voice input.
     * Captures speech and sends it to the AI assistant.
     */
    setListening(true);
    try {
      const res = await fetch('http://localhost:8000/listen');
      const data = await res.json();

      if (data.transcript) {
        const userMsg = { id: Date.now(), sender: 'user', text: data.transcript };
        setMessages((prev) => [...prev, userMsg]);
        
        // Add temporary loading message
        const loadingId = Date.now() + 1;
        setIsLoading(true);
        setMessages((prev) => [...prev, 
          { id: loadingId, sender: 'bot', text: '...', isLoading: true }
        ]);        const response = await fetch('http://localhost:8000/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            question: data.transcript,
            role: userRole || 'student' // Pass user role, default to student if not available
          })
        });
        const result = await response.json();

        // Replace loading message with actual response
        setMessages((prev) => 
          prev.map(msg => 
            msg.id === loadingId 
              ? { id: loadingId, sender: 'bot', text: result.answer || 'Hmm, let me check that again.' }
              : msg
          )
        );
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), sender: 'bot', text: 'I didn\'t catch that, please try again.' }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev.filter(msg => !msg.isLoading), // Remove any loading messages
        { id: Date.now(), sender: 'bot', text: 'Mic error or server not reachable.' }
      ]);
    } finally {
      setListening(false);
      setIsLoading(false);
    }
  };  const scrollToBottom = () => {
    /**
     * Scroll chat messages to the bottom to show latest message.
     */
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  };
  // Effect to scroll to bottom when messages change
  useEffect(() => {
    // Initial immediate scroll
    scrollToBottom();
    
    // Secondary scroll after a small delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    // Tertiary scroll after a longer delay to handle any slow rendering
    const longTimeoutId = setTimeout(scrollToBottom, 500);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(longTimeoutId);
    };
  }, [messages]);

  // Focus input field on initial render and after sending messages
  useEffect(() => {
    if (!isLoading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLoading]);  return (
    <div className="h-100 w-100 d-flex flex-column p-3">
      <h2 className="mb-3">AI Assistant</h2>
      
      <div className="chat-container flex-grow-1 d-flex flex-column">
        {/* Message List Container - Scrollable Area */}
        <div className="message-list" id="chat-messages-container">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`d-flex w-100 ${
                msg.sender === 'bot' ? 'justify-content-start' : 'justify-content-end'
              }`}
            >
              <div
                className={`message-item ${
                  msg.sender === 'bot' ? 'bot-message' : 'user-message'
                } ${msg.isLoading ? 'pulsate' : ''}`}
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.isLoading ? (
                  <div className="d-flex align-items-center">
                    <div className="spinner-grow spinner-grow-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Thinking...
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} className="scroll-anchor" />
        </div>
          {/* Input Area - Fixed at Bottom */}
        <div className="input-area px-3 py-2">
          <div className="input-group">
            <input
              ref={inputRef}
              type="text"
              className="form-control bg-light text-dark border rounded-start"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={isLoading}
            />
            <Button 
              variant={listening ? 'danger' : 'outline-secondary'} 
              onClick={handleMicClick}
              disabled={isLoading}
            >
              <FaMicrophone />
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Sending...
                </>
              ) : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
