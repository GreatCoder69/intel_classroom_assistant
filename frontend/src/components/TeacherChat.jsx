import React, { useEffect, useRef, useState } from "react";
import { Button, Form, InputGroup, Dropdown, Modal } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";
import "./ChatPage.css";

const apiBase = import.meta.env.VITE_API_URL;
const ChatPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [chatHistory, setChatHistory] = useState({});
  const [chat, setChat] = useState([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const [showImageInput, setShowImageInput] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [topicMeta, setTopicMeta] = useState({});
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); // ✅ fix mismatch
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [selectedModel, setSelectedModel] = useState("gemini"); // Default model
  const [imageFile, setImageFile] = useState(null);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");

  const [profile, setProfile] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
  });
  const [successMessage, setSuccessMessage] = useState("");

  // FETCH user profile once on mount
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchUserProfile();
    const savedOrder = localStorage.getItem("topicsOrder");
    if (savedOrder) {
      setTopics(JSON.parse(savedOrder));
    }
    fetchAllChats();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const fetchAllChats = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        headers: { "x-access-token": token },
      });
      const data = await res.json();
      if (!Array.isArray(data)) return;

      const sorted = data.sort(
        (a, b) =>
          new Date(b.lastUpdated || b.updatedAt) -
          new Date(a.lastUpdated || a.updatedAt)
      );

      const history = {};
      const meta = {}; // 🟩 For topic metadata like category

      sorted.forEach((c) => {
        const topic = c._id;
        history[topic] = [];

        // ✅ Store subject-level metadata like category
        meta[topic] = {
          category: c.subjectCategory || "Uncategorized",
          isPublic: c.isPublic !== undefined ? c.isPublic : true,
        };

        (c.chat || []).forEach((entry) => {
          if (entry.question || entry.imageURL) {
            history[topic].push({
              sender: "user",
              message: entry.question || "",
              image: entry.imageURL
                ? `https://storage.cognito.karmickinfosystem.com${entry.imageURL}`
                : null,
              timestamp: entry.timestamp,
            });
          }

          if (entry.answer) {
            history[topic].push({
              sender: "bot",
              message: entry.answer,
              timestamp: entry.timestamp,
              _id: entry._id,
              image: entry.imageURL
                ? `https://storage.cognito.karmickinfosystem.com${entry.imageURL}`
                : null,
              downloadCount: entry.downloadCount || 0,
            });
          }
        });
      });

      const sortedTopics = sorted.map((c) => c._id);
      const savedOrder = localStorage.getItem("topicsOrder");
      const topicOrder = savedOrder ? JSON.parse(savedOrder) : sortedTopics;

      setChatHistory(history);
      setTopicMeta(meta); // 🟩 save category, isPublic, etc
      setTopics(topicOrder);
      if (topicOrder.length > 0) {
        setSelectedTopic(topicOrder[0]);
        setChat(history[topicOrder[0]]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reorderTopics = (topic) => {
    setTopics((prev) => {
      const updated = [topic, ...prev.filter((t) => t !== topic)];
      localStorage.setItem("topicsOrder", JSON.stringify(updated));
      return updated;
    });
  };

  const handleSend = async () => {
    if ((!currentMessage.trim() && !imageFile) || !selectedTopic) return;

    let userMsg;
    if (imageFile) {
      userMsg = {
        sender: "user",
        image: URL.createObjectURL(imageFile),
        message: currentMessage || "", // optional: include text with image
        timestamp: new Date().toISOString(),
        temp: true, // mark as temporary for later replacement
      };
    } else {
      userMsg = {
        sender: "user",
        message: currentMessage,
        timestamp: new Date().toISOString(),
      };
    }

    const newChat = [...chat, userMsg];
    setChat(newChat);
    setChatHistory((prev) => ({
      ...prev,
      [selectedTopic]: [...(prev[selectedTopic] || []), userMsg],
    }));

    reorderTopics(selectedTopic);
    setCurrentMessage("");
    setImageFile(null); // Reset image file after send

    try {
      const formData = new FormData();
      formData.append("subject", selectedTopic);
      formData.append("model", selectedModel); // 👈 Add this line
      if (currentMessage.trim()) formData.append("question", currentMessage);
      if (imageFile) formData.append("image", imageFile);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "x-access-token": token, // ✅ Only token here, don't set 'Content-Type'
        },
        body: formData,
      });

      const data = await res.json();
      let updatedChat = [...newChat];

      // Replace only the last temporary user image message with the backend URL
      if (imageFile && data.imageUrl) {
        const lastTempIndex = [...updatedChat]
          .reverse()
          .findIndex((msg) => msg.temp && msg.sender === "user" && msg.image);
        if (lastTempIndex !== -1) {
          const idx = updatedChat.length - 1 - lastTempIndex;
          updatedChat[idx] = {
            ...updatedChat[idx],
            image: `https://storage.cognito.karmickinfosystem.com${data.imageUrl}`,
            message: data.question, // update with backend's question if needed
            temp: false,
          };
        }
      }

      // Add bot reply
      const botMsg = {
        sender: "bot",
        message: data.answer || "No response.",
        timestamp: new Date().toISOString(),
      };
      updatedChat = [...updatedChat, botMsg];

      setChat(updatedChat);
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: updatedChat,
      }));

      setChat(updatedChat);
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: updatedChat,
      }));
    } catch (err) {
      console.error("Upload or chat error:", err);
    }
  };

  const addTopic = async () => {
    const topic = newTopicName.trim();
    if (!topic || topics.includes(topic)) {
      toast.warn("Topic is empty or already exists.");
      return;
    }

    const now = new Date();
    const chatPair = [
      { sender: "user", message: "Hello", timestamp: now },
      { sender: "bot", message: "Hello, how are you?", timestamp: now },
    ];

    const updatedTopics = [topic, ...topics];
    setTopics(updatedTopics);
    localStorage.setItem("topicsOrder", JSON.stringify(updatedTopics));
    setSelectedTopic(topic);
    setChatHistory((prev) => ({ ...prev, [topic]: chatPair }));
    setChat(chatPair);
    setNewTopicName("");
    setShowNewTopicModal(false);
    toast.success("New topic created.");
  };

  const selectTopic = (topic) => {
    setSelectedTopic(topic);
    setChat(chatHistory[topic] || []);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/me`, {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });
      const data = await res.json();
      setProfile({
        email: data.email,
        name: data.name,
        phone: data.phone,
        profileimg:
          data.profileimg ||
          "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg",
        password: "",
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
    }
  };

  const handleProfileUpdate = async () => {
    const formData = new FormData();
    formData.append("email", profile.email);
    formData.append("name", profile.name);
    formData.append("phone", profile.phone);
    if (profile.password) formData.append("password", profile.password);
    if (profile.profileimgFile)
      formData.append("profileimg", profile.profileimgFile);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/update`,
        {
          method: "PUT",
          headers: {
            "x-access-token": token,
            // ❌ Do NOT set Content-Type manually here
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("Profile updated successfully!");
        setProfile((prev) => ({
          ...prev,
          profileimg: data.profileimg || prev.profileimg,
        }));
        setTimeout(() => {
          setSuccessMessage("");
          setShowModal(false);
        }, 2000);
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    }
  };
  const handleImageUpload = async (file) => {
    if (!file || !selectedTopic) return;

    // Create a preview URL for the image
    const imageUrl = URL.createObjectURL(file);

    // Add the image message to the chat immediately
    const userMsg = {
      sender: "user",
      image: imageUrl, // Use 'image' instead of 'message' for images
      timestamp: new Date().toISOString(),
    };
    setChat((prev) => [...prev, userMsg]);
    setChatHistory((prev) => ({
      ...prev,
      [selectedTopic]: [...(prev[selectedTopic] || []), userMsg],
    }));

    // Now upload the image to the backend as before
    const formData = new FormData();
    formData.append("image", file);
    formData.append("subject", selectedTopic);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "x-access-token": token, // ✅ Add this
          // DO NOT set 'Content-Type' when using FormData
        },
        body: formData,
      });

      const data = await res.json();
      if (data && data.answer) {
        const botMsg = {
          sender: "bot",
          message: data.answer,
          timestamp: new Date().toISOString(),
        };

        setChat((prev) => [...prev, botMsg]);
        setChatHistory((prev) => ({
          ...prev,
          [selectedTopic]: [...(prev[selectedTopic] || []), botMsg],
        }));
      }
    } catch (err) {
      console.error("Image upload failed:", err);
    }
  };

  const handleDeleteTopic = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/deletechat`,
        {
          method: "POST", // ✅ use PUT here
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
          },
          body: JSON.stringify({ subject: topicToDelete }), // ✅ send subject
        }
      );

      if (res.ok) {
        const updatedTopics = topics.filter((t) => t !== topicToDelete);
        setTopics(updatedTopics);
        setChatHistory((prev) => {
          const copy = { ...prev };
          delete copy[topicToDelete];
          return copy;
        });
        localStorage.setItem("topicsOrder", JSON.stringify(updatedTopics));
        if (selectedTopic === topicToDelete) {
          setSelectedTopic(null);
          setChat([]);
        }
        setShowConfirmDelete(false);
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete chat.");
      }
    } catch (err) {
      console.error("Error deleting chat:", err);
    }
  };

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="d-flex vh-100">
      <div
        className="p-3 border-end flex-shrink-0"
        style={{ width: 300, overflowY: "auto" }}
      >
        <>
          <Button
            style={{
              backgroundColor: "#ffc107", // Bootstrap's warning yellow
              color: "#000",
              border: "none",
            }}
            className="w-100 mb-2"
            onClick={() => navigate("/dashboard")}
          >
            Go to Dashboard
          </Button>
        </>
        <>
          <Button
            className="w-100 mb-2"
            onClick={() => setShowNewTopicModal(true)}
          >
            + New Chat
          </Button>
        </>

        <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 100px)" }}>
          {topics
            .filter((topic) => (chatHistory[topic]?.length || 0) > 0)
            .map((topic, idx) => (
              <div
                key={idx}
                className={`topic-item p-3 mb-2 rounded ${
                  selectedTopic === topic ? "bg-primary text-white" : "bg-light"
                }`}
                onClick={() => selectTopic(topic)}
                style={{ cursor: "pointer" }}
              >
                <div className="d-flex justify-content-between align-items-center">
                  <div className="fw-bold">{topic}</div>
                  <span
                    className="text-black rounded-circle px-2"
                    style={{ cursor: "pointer", fontWeight: "bold" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTopicToDelete(topic);
                      setShowConfirmDelete(true); // ✅ this matches the actual modal trigger
                    }}
                  >
                    ×
                  </span>
                </div>
                <small
                  className={
                    selectedTopic === topic ? "text-light" : "text-light"
                  }
                >
                  {chatHistory[topic]?.length || 0} messages
                </small>
              </div>
            ))}
        </div>
      </div>

      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
          <h5>{selectedTopic}</h5>
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-secondary"
              className="p-0 border-0 bg-transparent"
              style={{ boxShadow: "none" }}
            >
              <img
                src={
                  profile.profileimgFile
                    ? URL.createObjectURL(profile.profileimgFile)
                    : profile.profileimg
                }
                alt="Profile"
                className="rounded-circle"
                style={{ width: "36px", height: "36px", objectFit: "cover" }}
              />
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setShowModal(true)}>
                Edit Profile
              </Dropdown.Item>
              <Dropdown.Item onClick={handleLogout}>Logout</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </div>

        <div className="flex-grow-1 p-3 overflow-auto">
          {(chat || []).map((msg, i) => (
            <div
              key={i}
              className={`msg-row ${
                msg.sender === "user" ? "user-left" : "bot-right"
              } mb-3`}
            >
              <div
                className={`p-3 rounded ${
                  msg.sender === "user" ? "user-bubble" : "bot-bubble"
                }`}
                style={{
                  maxWidth: "90%",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.image &&
                  (msg.image.toLowerCase().endsWith(".pdf") ? (
                    <div className="d-flex flex-column align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ fontSize: 20 }}>📄</span>
                        <a
                          href={msg.image}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white"
                        >
                          {msg.image.split("/").pop()}
                        </a>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={msg.image}
                      alt="Uploaded"
                      style={{
                        maxWidth: 200,
                        borderRadius: 8,
                        marginBottom: 8,
                      }}
                    />
                  ))}

                {msg.message && (
                  <div
                    style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
                  >
                    {msg.sender === "bot" ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => (
                            <p
                              style={{
                                margin: 0,
                                lineHeight: "1.4",
                                paddingBottom: "2px",
                              }}
                            >
                              {children}
                            </p>
                          ),
                          li: ({ children }) => (
                            <li style={{ marginBottom: "2px" }}>{children}</li>
                          ),
                        }}
                      >
                        {msg.message}
                      </ReactMarkdown>
                    ) : (
                      msg.message
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef}></div>
        </div>

        <div className="p-3 border-top">
          {imageFile && (
            <div className="mb-2 d-flex align-items-center gap-3">
              {imageFile.type === "application/pdf" ? (
                <>
                  <span style={{ fontSize: 32 }}>📄</span>
                  <span style={{ fontWeight: "bold" }}>{imageFile.name}</span>
                  <a
                    href={URL.createObjectURL(imageFile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginLeft: 8 }}
                  >
                    Preview
                  </a>
                </>
              ) : (
                <img
                  src={URL.createObjectURL(imageFile)}
                  alt="Preview"
                  style={{ maxHeight: 80, borderRadius: 8 }}
                />
              )}
              <Button
                variant="outline-danger"
                size="sm"
                onClick={() => setImageFile(null)}
              >
                Remove
              </Button>
            </div>
          )}
          <InputGroup>
            <Form.Control
              placeholder="Type a message..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSend();
              }}
            />

            {/* Image Upload Button */}
            <input
              type="file"
              id="image-upload"
              style={{ display: "none" }}
              onChange={(e) => {
                if (e.target.files[0]) {
                  setImageFile(e.target.files[0]);
                }
              }}
            />
            <Button
              variant="secondary"
              onClick={() => document.getElementById("image-upload").click()}
            >
              +
            </Button>

            <Button
              onClick={handleSend}
              disabled={!currentMessage.trim() && !imageFile}
            >
              Send
            </Button>
          </InputGroup>
        </div>
      </div>
      <Modal
        show={showNewTopicModal}
        onHide={() => setShowNewTopicModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>New Chat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Enter Topic Name</Form.Label>
            <Form.Control
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="e.g. React Tips"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowNewTopicModal(false)}
          >
            Cancel
          </Button>
          <Button variant="primary" onClick={addTopic}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-4">
            <img
              src={
                profile.profileimgFile
                  ? URL.createObjectURL(profile.profileimgFile)
                  : profile.profileimg
              }
              alt="Profile"
              className="rounded-circle"
              style={{
                width: "120px",
                height: "120px",
                objectFit: "cover",
                cursor: "pointer",
                border: "3px solid #ccc",
              }}
              onClick={() => setShowImageInput(!showImageInput)}
            />

            {showImageInput && (
              <Form.Group className="mt-3">
                <Form.Label>Upload New Profile Image</Form.Label>
                <Form.Control
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      profileimgFile: e.target.files[0],
                    })
                  }
                />
              </Form.Group>
            )}
          </div>

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Email (readonly)</Form.Label>
              <Form.Control type="email" value={profile.email} readOnly />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Name</Form.Label>
              <Form.Control
                type="text"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                type="text"
                value={profile.phone}
                onChange={(e) =>
                  setProfile({ ...profile, phone: e.target.value })
                }
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                placeholder="Leave blank to keep old password"
                value={profile.password}
                onChange={(e) =>
                  setProfile({ ...profile, password: e.target.value })
                }
              />
            </Form.Group>
          </Form>

          {successMessage && (
            <p className="text-success text-center">{successMessage}</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleProfileUpdate}>
            Update
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal
        show={showConfirmDelete}
        onHide={() => setShowConfirmDelete(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the chat topic "
          <strong>{topicToDelete}</strong>"?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmDelete(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteTopic}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ChatPage;
