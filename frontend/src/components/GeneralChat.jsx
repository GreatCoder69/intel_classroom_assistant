import React, { useEffect, useRef, useState } from "react";
import {
  Container,
  Button,
  Form,
  InputGroup,
  Dropdown,
  Modal,
  Alert,
  Row,
  Col,
  Card,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";

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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [allChats, setAllChats] = useState([]);
  const [ratingsMap, setRatingsMap] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(null); // result of backend search
  const [searchLoading, setSearchLoading] = useState(false); // loading for search
  const currentEmail = localStorage.getItem("userEmail");
  const [currentSearchPage, setCurrentSearchPage] = useState(1);
  const RESULTS_PER_PAGE = 5;

  const [imageFile, setImageFile] = useState(null);
  const [profile, setProfile] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
  });
  const [successMessage, setSuccessMessage] = useState("");
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/general-chat`)
      .then((res) => res.json())
      .then(async (data) => {
        const filtered = data.filter((u) => u.email !== currentEmail);
        const chatsWithRatings = [];

        const ratingsObj = {};
        await Promise.all(
          filtered.flatMap((user) =>
            user.chats.map(async (chat) => {
              const key = `${user.email}-${chat.subject}`;
              try {
                const res = await fetch(
                  `${import.meta.env.VITE_API_URL}/api/ratings?subject=${chat.subject}&email=${user.email}`
                );
                if (res.ok) {
                  const r = await res.json();
                  ratingsObj[key] = r;
                }
              } catch {}
              chatsWithRatings.push({
                user,
                chat,
                avgRating: ratingsObj[key]?.avgRating || 0,
              });
            })
          )
        );

        setRatingsMap(ratingsObj);
        setAllChats(chatsWithRatings.sort((a, b) => b.avgRating - a.avgRating));
        setLoading(false);
      });
  }, [currentEmail]);
  const trimWords = (text, wordLimit) => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    return words.length > wordLimit
      ? words.slice(0, wordLimit).join(" ") + "..."
      : text;
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) stars.push(<FaStar key={i} color="orange" />);
      else if (rating >= i - 0.5)
        stars.push(<FaStarHalfAlt key={i} color="orange" />);
      else stars.push(<FaRegStar key={i} color="orange" />);
    }
    return stars;
  };
  const handlePhraseSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setCurrentSearchPage(1); // Reset to page 1
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/search-general-chats?phrase=${encodeURIComponent(
          searchQuery
        )}`
      );
      const data = await res.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const highlightPhrase = (text, phrase) => {
    if (!text || !phrase) return text;
    const regex = new RegExp(`(${phrase})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      part.toLowerCase() === phrase.toLowerCase() ? (
        <mark key={i}>{part}</mark>
      ) : (
        part
      )
    );
  };

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
      sorted.forEach((c) => {
        const topic = c._id;
        history[topic] = [];

        (c.chat || []).forEach((entry) => {
          if (entry.question || entry.imageURL) {
            history[topic].push({
              sender: "user",
              message: entry.question || "", // Always use the prompt if it exists
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

  const addTopic = () => {
    const topic = prompt("Enter topic name:");
    if (topic && !topics.includes(topic)) {
      const updatedTopics = [topic, ...topics];
      setTopics(updatedTopics);
      localStorage.setItem("topicsOrder", JSON.stringify(updatedTopics));
      setChatHistory((prev) => ({ ...prev, [topic]: [] }));
      setSelectedTopic(topic);
      setChat([]);
    }
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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/update`, {
        method: "PUT",
        headers: {
          "x-access-token": token,
          // ❌ Do NOT set Content-Type manually here
        },
        body: formData,
      });

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/deletechat`, {
        method: "POST", // ✅ use PUT here
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
        body: JSON.stringify({ subject: topicToDelete }),
      });

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
  const displayedChats = searchResults
    ? searchResults.slice(
        (currentSearchPage - 1) * RESULTS_PER_PAGE,
        currentSearchPage * RESULTS_PER_PAGE
      )
    : allChats;

  if (loading) return <div className="text-center">Loading...</div>;

  return (
    <div className="d-flex vh-100">
      <div
        className="p-3 border-end flex-shrink-0"
        style={{ width: 300, overflowY: "auto" }}
      >
        <>
          <Button
            className="w-100 mb-3"
            style={{ backgroundColor: "red", borderColor: "orange" }}
            onClick={() =>
              navigate("/chat", { state: { email: profile.email } })
            }
          >
            Go Back To Chat
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
                      setShowDeleteModal(true);
                    }}
                  >
                    ×
                  </span>
                </div>
                <small
                  className={
                    selectedTopic === topic ? "text-light" : "text-muted"
                  }
                >
                  {chatHistory[topic]?.length || 0} messages
                </small>
              </div>
            ))}
        </div>
      </div>
      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        <div
          className="p-3 border-bottom d-flex justify-content-between align-items-center"
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: "80vw", // or set a fixed pixel width like '1000px'
            zIndex: 1000,
            backgroundColor: "#fff", // to prevent transparency over content
          }}
        >
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
      </div>
      {/*CONTENTTTTTT*/}
      <Container fluid className="p-0" style={{ overflow: "hidden" }}>
        <div
          className="flex-grow-1 p-4"
          style={{
            marginTop: "70px",
            height: "calc(100vh - 70px)",
            overflowY: "auto",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            position: "relative",
          }}
        >
          <InputGroup
            className="mb-4 w-100"
            style={{ maxWidth: 500, marginLeft: "20px" }}
          >
            <Form.Control
              placeholder="Search chat subjects or content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button variant="primary" onClick={handlePhraseSearch}>
              Search
            </Button>
            {searchResults && (
              <Button
                variant="outline-danger"
                onClick={() => setSearchResults(null)}
              >
                Clear Filters
              </Button>
            )}
          </InputGroup>

          {loading || searchLoading ? (
            <div className="text-center">Loading chats...</div>
          ) : (
              searchResults ? searchResults.length === 0 : allChats.length === 0
            ) ? (
            <Alert variant="warning" className="text-center">
              No chats match your search.
            </Alert>
          ) : (
            <div className="container">
              <div className="row justify-content-center">
                {searchResults
                  ? searchResults
                      .slice(
                        (currentSearchPage - 1) * RESULTS_PER_PAGE,
                        currentSearchPage * RESULTS_PER_PAGE
                      )
                      .map((user, idx) => {
                        // Compute average rating from user.chats
                        const allRatings = user.chats.flatMap(
                          (c) =>
                            c.history?.map(() => c.rating).filter(Boolean) || []
                        );
                        const avgRating =
                          allRatings.length > 0
                            ? allRatings.reduce((a, b) => a + b, 0) /
                              allRatings.length
                            : 0;

                        return user.chats.map((chat, chatIdx) => (
                          <div
                            key={`${user.email}-${chatIdx}`}
                            className="col-12 mb-4"
                          >
                            <Card
                              className="shadow w-100"
                              style={{ cursor: "pointer" }}
                              onClick={() =>
                                navigate("/chat-detail", {
                                  state: {
                                    email: user.email,
                                    username: user.name,
                                    profileimg: user.profileimg,
                                    subject: chat.subject, // ✅ necessary for loading chat
                                    avgRating,
                                    phrase: searchQuery,
                                  },
                                })
                              }
                            >
                              <Card.Body className="d-flex flex-row gap-3 align-items-start">
                                {/* Left: User Info */}
                                <div
                                  style={{
                                    flexBasis: "15%",
                                    textAlign: "center",
                                  }}
                                >
                                  <img
                                    src={
                                      user.profileimg ||
                                      "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg"
                                    }
                                    alt="User"
                                    className="rounded-circle mb-2"
                                    style={{
                                      width: 60,
                                      height: 60,
                                      objectFit: "cover",
                                    }}
                                  />
                                  <h6>{user.name}</h6>
                                  <div className="d-flex justify-content-center mb-1 gap-1">
                                    {renderStars(Math.round(avgRating * 2) / 2)}
                                  </div>
                                  <small className="text-muted">
                                    {chat.subject}
                                  </small>
                                </div>

                                {/* Right: Chat Preview */}
                                <div
                                  style={{
                                    flexBasis: "85%",
                                    textAlign: "left",
                                  }}
                                >
                                  {chat.history
                                    ?.filter(
                                      (entry) =>
                                        entry.question
                                          ?.toLowerCase()
                                          .includes(
                                            searchQuery.toLowerCase()
                                          ) ||
                                        entry.answer
                                          ?.toLowerCase()
                                          .includes(searchQuery.toLowerCase())
                                    )
                                    .map((entry, i) => (
                                      <div key={i} className="mb-2">
                                        <strong>Q:</strong>{" "}
                                        {highlightPhrase(
                                          entry.question,
                                          searchQuery
                                        )}{" "}
                                        <br />
                                        <strong>A:</strong>{" "}
                                        {highlightPhrase(
                                          entry.answer,
                                          searchQuery
                                        )}{" "}
                                        <br />
                                      </div>
                                    ))}
                                </div>
                              </Card.Body>
                            </Card>
                          </div>
                        ));
                      })
                  : displayedChats.map(({ user, chat, avgRating }, idx) => (
                      <div key={idx} className="col-12 mb-4">
                        <Card
                          className="shadow w-100"
                          style={{ cursor: "pointer" }}
                          onClick={() =>
                            navigate("/chat-detail", {
                              state: {
                                email: user.email,
                                subject: chat.subject,
                                username: user.name,
                                profileimg: user.profileimg,
                                avgRating: avgRating,
                                phrase: searchQuery, // or whatever your search term state is
                              },
                            })
                          }
                        >
                          <Card.Body className="d-flex gap-4 align-items-start">
                            {/* Left: User Info */}
                            <div
                              style={{ width: "15%" }}
                              className="text-center"
                            >
                              <img
                                src={
                                  user?.profileimg ||
                                  "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg"
                                }
                                alt="User"
                                className="rounded-circle mb-2"
                                style={{
                                  width: 60,
                                  height: 60,
                                  objectFit: "cover",
                                }}
                              />
                              <Card.Title>{user?.name || "Unknown"}</Card.Title>
                              <Card.Subtitle className="mb-2 text-muted">
                                {chat.subject}
                              </Card.Subtitle>
                              <div className="mb-2 d-flex justify-content-center gap-1">
                                {renderStars(
                                  Math.round((avgRating || 0) * 2) / 2
                                )}
                              </div>
                              
                            </div>

                            {/* Right: Q&A Preview */}
                            <div style={{ width: "85%" }}>
                              {chat.history.slice(0, 2).map((entry, idx) => (
                                <div key={idx} className="mb-2 text-start">
                                  <div>
                                    <strong>Q:</strong>{" "}
                                    {trimWords(entry.question, 40)}
                                  </div>
                                  <div>
                                    <strong>A:</strong>{" "}
                                    {trimWords(entry.answer, 40)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </Card.Body>
                        </Card>
                      </div>
                    ))}
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* MODAL */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Profile</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Profile Image Display + Edit */}
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

          {/* Basic Details Form */}
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
        show={showDeleteModal}
        onHide={() => setShowDeleteModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete Chat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete the chat for "
          <strong>{topicToDelete}</strong>"?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
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
