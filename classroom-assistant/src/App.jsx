import React, { useState, useRef, useEffect } from 'react';
import { Button, InputGroup, FormControl } from 'react-bootstrap';
import { FaMicrophone } from 'react-icons/fa';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'bot', text: 'Hello! How can I assist you today?' }
  ]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const messagesEndRef = useRef(null);

  const handleSend = async () => {
    if (!input.trim()) return;
    const newMessage = { id: Date.now(), sender: 'user', text: input };
    setMessages((prev) => [...prev, newMessage]);
    setInput('');

    try {
      const res = await fetch('http://localhost:8000/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: input })
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: data.answer || 'Sorry, I didn’t understand that.' }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, sender: 'bot', text: 'Error contacting the assistant.' }
      ]);
    }
  };

  const handleMicClick = async () => {
    setListening(true);
    try {
      const res = await fetch('http://localhost:8000/listen');
      const data = await res.json();

      if (data.transcript) {
        const userMsg = { id: Date.now(), sender: 'user', text: data.transcript };
        setMessages((prev) => [...prev, userMsg]);

        const response = await fetch('http://localhost:8000/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: data.transcript })
        });
        const result = await response.json();

        setMessages((prev) => [
          ...prev,
          { id: Date.now() + 1, sender: 'bot', text: result.answer || 'Hmm, let me check that again.' }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), sender: 'bot', text: "I didn't catch that, please try again." }
        ]);
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), sender: 'bot', text: 'Mic error or server not reachable.' }
      ]);
    }
    setListening(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="d-flex vh-100 bg-dark text-light">
      {/* Sidebar */}
      <aside className="bg-secondary p-4 d-flex flex-column" style={{ width: '250px' }}>
        <h3 className="mb-4">Classroom Assistant</h3>
        <nav className="flex-grow-1">
          <ul className="list-unstyled">
            <li className="mb-3">🏠 Dashboard</li>
            <li className="mb-3">📚 Subjects</li>
            <li className="mb-3">🗓️ Schedule</li>
            <li className="mb-3">⚙️ Settings</li>
          </ul>
        </nav>
        <footer className="text-muted small">© 2025 EduAI</footer>
      </aside>

      {/* Chat Area */}
      <main className="flex-grow-1 d-flex flex-column p-4">
        <div
          className="flex-grow-1 overflow-auto mb-3"
          style={{ maxHeight: 'calc(100vh - 130px)' }}
        >
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`d-flex mb-3 ${
                msg.sender === 'bot' ? 'justify-content-start' : 'justify-content-end'
              }`}
            >
              <div
                className={`p-3 rounded shadow ${
                  msg.sender === 'bot' ? 'bg-primary text-white' : 'bg-success text-white'
                }`}
                style={{
                  maxWidth: '75%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <InputGroup>
          <FormControl
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="bg-light text-dark"
          />
          <Button variant={listening ? 'danger' : 'outline-secondary'} onClick={handleMicClick}>
            <FaMicrophone />
          </Button>
          <Button variant="primary" onClick={handleSend}>
            Send
          </Button>
        </InputGroup>
      </main>
    </div>
  );
}

export default App;
