import React, { useEffect, useRef, useState } from "react";
import { Button, Form, InputGroup, Dropdown, Modal } from "react-bootstrap";
import { useNavigate, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { toast } from "react-toastify";
import "./ChatPage.css";

const API_BASE = import.meta.env.VITE_API_URL;

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
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);
  const [selectedModel, setSelectedModel] = useState("gemini");
  const [imageFile, setImageFile] = useState(null);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [useResources, setUseResources] = useState(false);
  const [subjectResources, setSubjectResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [showResourceDetails, setShowResourceDetails] = useState(false);
  const [user, setUser] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState(null);

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

    // Get user data from localStorage
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);

      setUser(parsedUser);
    }

    fetchUserProfile();
    fetchSubjects();
    const savedOrder = localStorage.getItem("topicsOrder");
    if (savedOrder) {
      setTopics(JSON.parse(savedOrder));
    }
    fetchAllChats();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  // Fetch resources when selected subject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchSubjectResources(selectedSubject);
      // Reset useResources and resource details when changing subjects
      setUseResources(false);
      setShowResourceDetails(false);
    }
  }, [selectedSubject, subjects]);

  // Reset resource details when useResources is unchecked
  useEffect(() => {
    if (!useResources) {
      setShowResourceDetails(false);
    } else if (useResources && subjectResources.length > 0) {
      // Resources are now displayed above input, no system messages needed
    }
  }, [useResources]);

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

    // Force immediate UI update
    setTimeout(() => {
      // This ensures the UI updates immediately
      setChat([...newChat]);
    }, 0);

    try {
      const formData = new FormData();
      formData.append("subject", selectedTopic);
      formData.append("model", selectedModel);
      // Use "General" as fallback if no specific subject selected
      formData.append("chatSubject", selectedSubject || "General");
      
      // Add resource content as JSON if resources are being used
      if (user?.role === "student" && useResources && subjectResources.length > 0) {
        console.log("Starting resource content fetch for", subjectResources.length, "resources");
        formData.append("useResources", "true");
        
        // Fetch and include JSON content for each resource
        const resourceContents = await Promise.all(
          subjectResources.map(async (resource) => {
            try {
              console.log(`Fetching content for resource: ${resource.name} (ID: ${resource._id})`);
              const res = await fetch(`${import.meta.env.VITE_API_URL}/api/resources/${resource._id}/content`, {
                headers: {
                  "Content-Type": "application/json",
                  "x-access-token": token,
                },
              });
              
              console.log(`📡 Resource ${resource.name} response status:`, res.status);
              
              if (res.ok) {
                const content = await res.json();
                console.log(`Resource ${resource.name} content:`, {
                  hasExtractedText: !!content.extractedText,
                  hasTextChunks: !!content.textChunks,
                  wordCount: content.wordCount,
                  pageCount: content.pageCount
                });
                
                return {
                  id: resource._id,
                  name: resource.name,
                  fileName: resource.fileName,
                  extractedText: content.extractedText,
                  textChunks: content.textChunks,
                  pageCount: content.pageCount,
                  wordCount: content.wordCount
                };
              } else {
                console.error(`Failed to fetch resource ${resource.name}:`, res.status, res.statusText);
              }
              return null;
            } catch (error) {
              console.error(`💥 Error fetching content for resource ${resource.name}:`, error);
              return null;
            }
          })
        );
        
        // Filter out failed requests and append valid content
        const validContents = resourceContents.filter(content => content !== null);
        if (validContents.length > 0) {
          const resourcesJson = JSON.stringify(validContents);
          formData.append("resourceContents", resourcesJson);
          console.log("Sending JSON resource contents:", validContents.length, "resources");
          console.log("Resource details:", validContents.map(r => ({
            name: r.name,
            fileName: r.fileName,
            wordCount: r.wordCount,
            hasContent: !!r.extractedText || !!r.textChunks
          })));
          console.log("📦 Total word count:", validContents.reduce((sum, r) => sum + (r.wordCount || 0), 0));
          console.log("📋 FormData resourceContents length:", resourcesJson.length, "characters");
        } else {
          console.log("No valid resource contents to send");
        }
      } else {
        console.log("🚫 Resource conditions not met:", {
          userRole: user?.role,
          useResources: useResources,
          resourceCount: subjectResources.length
        });
      }
      
      if (currentMessage.trim()) formData.append("question", currentMessage);
      if (imageFile) formData.append("image", imageFile);

      // Create abort controller for request cancellation
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60s timeout

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "x-access-token": token,
        },
        body: formData,
        signal: abortController.signal,
        // Add cache control
        cache: 'no-cache'
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      let updatedChat = [...newChat];

      // Add loading message
      const loadingMsg = {
        sender: "bot",
        message: "Thinking...",
        timestamp: new Date().toISOString(),
        loading: true
      };
      setChat([...newChat, loadingMsg]);
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: [...(prev[selectedTopic] || []), loadingMsg],
      }));

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

      // Remove loading message and add bot reply
      const botMsg = {
        sender: "bot",
        message: data.answer || "No response.",
        timestamp: new Date().toISOString(),
      };
      
      // Remove loading message and add real response
      const finalChat = [...updatedChat, botMsg];

      setChat(finalChat);
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: finalChat,
      }));
    } catch (err) {
      console.error("Upload or chat error:", err);
      
      // Remove loading message if there was an error
      setChat((prevChat) => prevChat.filter(msg => !msg.loading));
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: prev[selectedTopic]?.filter(msg => !msg.loading) || [],
      }));
      
      // Add error message
      const errorMsg = {
        sender: "bot",
        message: "Sorry, there was an error processing your message. Please try again.",
        timestamp: new Date().toISOString(),
        error: true
      };
      
      setChat((prevChat) => [...prevChat, errorMsg]);
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: [...(prev[selectedTopic] || []), errorMsg],
      }));
    }
  };

  const addTopic = async () => {
    const topic = newTopicName.trim();

    // Validation checks
    if (!topic) {
      toast.warn("Please enter a topic name.");
      return;
    }

    if (topics.includes(topic)) {
      toast.warn("Topic already exists. Please choose a different name.");
      return;
    }

    try {
      // Create initial chat entry
      const now = new Date();
      const initialChatPair = [
        { sender: "user", message: "Hello", timestamp: now.toISOString() },
        {
          sender: "bot",
          message: "Hello! How can I help you today?",
          timestamp: now.toISOString(),
        },
      ];

      // Update topics list
      const updatedTopics = [topic, ...topics];

      // Update all states
      setTopics(updatedTopics);
      localStorage.setItem("topicsOrder", JSON.stringify(updatedTopics));
      setSelectedTopic(topic);
      setChatHistory((prev) => ({
        ...prev,
        [topic]: initialChatPair,
      }));
      setChat(initialChatPair);

      // Reset form and close modal
      setNewTopicName("");
      setShowNewTopicModal(false);

      toast.success(`Topic "${topic}" created successfully!`);
    } catch (error) {
      console.error("Error creating topic:", error);
      toast.error("Failed to create topic. Please try again.");
    }
  };

  const handleOpenNewTopicModal = () => {
    setNewTopicName(""); // Reset the input field
    setShowNewTopicModal(true);
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

      // Also set user data for role checking
      setUser({
        email: data.email,
        name: data.name,
        role: data.role || "student", // Default to student if role is missing
      });
    } catch (err) {
      console.error("Error fetching user profile:", err);
      // Set default user data on error
      setUser({
        email: "",
        name: "",
        role: "student",
      });
    }
  };

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects`, {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubjects(data);
        // Set default subject to "General" if none selected
        if (!selectedSubject) {
          setSelectedSubject("General");
        }
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
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
            // Do NOT set Content-Type manually here
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
          "x-access-token": token,
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
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-access-token": token,
          },
          body: JSON.stringify({ subject: topicToDelete }),
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
  // ---- inside ChatPage.jsx ----
  const micDictate = async () => {
    // If currently recording, stop the recording
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
      toast.info("Stopped recording");
      return;
    }

    try {
      // Check for browser support
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        toast.error("Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
        return;
      }

      // Check for HTTPS or localhost
      if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
        toast.error("Voice input requires HTTPS. Please access the site over HTTPS.");
        return;
      }

      // Request microphone permission
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (permissionError) {
        toast.error("Microphone permission denied. Please allow microphone access and try again.");
        return;
      }

      toast.info("Recording... Click again to stop");
      setIsRecording(true);

      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true; // Keep listening continuously
      recognitionInstance.interimResults = true; // Show interim results
      recognitionInstance.lang = "en-US";

      // Store recognition instance for stopping later
      setRecognition(recognitionInstance);

      recognitionInstance.onresult = (e) => {
        let interimTranscript = '';
        let finalTranscript = '';

        // Process all results
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const transcript = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        // Update message with final transcript
        if (finalTranscript) {
          setCurrentMessage((prev) => {
            const newText = prev ? `${prev} ${finalTranscript}` : finalTranscript;
            return newText;
          });
        }
      };

      recognitionInstance.onerror = (e) => {
        console.error("Speech recognition error:", e);
        setIsRecording(false);
        setRecognition(null);
        
        switch (e.error) {
          case 'not-allowed':
            toast.error("Microphone permission denied. Please allow microphone access.");
            break;
          case 'no-speech':
            toast.warning("No speech detected. Microphone is still active.");
            // Don't stop recording on no-speech, just warn
            return;
          case 'network':
            toast.error("Network error. Please check your internet connection.");
            break;
          case 'service-not-allowed':
            toast.error("Speech service not allowed. Please use HTTPS.");
            break;
          case 'aborted':
            // This is normal when user clicks stop
            break;
          default:
            toast.error(`Speech error: ${e.error || "unknown"}`);
        }
      };

      recognitionInstance.onstart = () => {

        setIsRecording(true);
      };

      recognitionInstance.onend = () => {

        setIsRecording(false);
        setRecognition(null);
        
        // Only show stopped message if it wasn't manually stopped
        if (isRecording) {
          toast.info("Recording stopped");
        }
      };

      recognitionInstance.start();
    } catch (error) {
      console.error("Voice recognition error:", error);
      setIsRecording(false);
      setRecognition(null);
      toast.error("Failed to start voice recognition. Please try again.");
    }
  };

  const fetchSubjectResources = async (subjectName) => {
    if (!subjectName || subjectName === "General") {
      setSubjectResources([]);
      return;
    }

    try {
      setLoadingResources(true);
      // First get the subject ID from the subjects list
      const subject = subjects.find(s => s.name === subjectName);
      if (!subject) {
        setSubjectResources([]);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/subjects/${subject._id}/resources`, {
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Only include resources that have been successfully processed
        const processedResources = data.filter(resource => 
          resource.extractionStatus === 'completed' && resource.hasExtractedContent
        );
        setSubjectResources(processedResources);
      } else {
        setSubjectResources([]);
      }
    } catch (err) {
      console.error("Error fetching subject resources:", err);
      setSubjectResources([]);
    } finally {
      setLoadingResources(false);
    }
  };

  const handleRemoveResource = (resourceId) => {
    setSubjectResources(prev => {
      const updated = prev.filter(resource => resource._id !== resourceId);
      
      // If no resources left, uncheck useResources
      if (updated.length === 0) {
        setUseResources(false);
      }
      
      // Update the system message in chat to reflect new count
      setChat(prevChat => {
        const updatedChat = [...prevChat];
        // Find the last system message about resources and update it
        for (let i = updatedChat.length - 1; i >= 0; i--) {
          if (updatedChat[i].sender === "system" && updatedChat[i].message.includes("JSON resource")) {
            if (updated.length === 0) {
              // Remove the system message if no resources left
              updatedChat.splice(i, 1);
            } else {
              // Update the message and resources
              updatedChat[i] = {
                ...updatedChat[i],
                message: `� Loaded ${updated.length} JSON resource${updated.length !== 1 ? 's' : ''} from ${selectedSubject}`,
                resources: updated
              };
            }
            break;
          }
        }
        return updatedChat;
      });
      
      // Update chat history too
      setChatHistory((prev) => ({
        ...prev,
        [selectedTopic]: prev[selectedTopic]?.map(msg => {
          if (msg.sender === "system" && msg.message.includes("PDF resource")) {
            if (updated.length === 0) {
              return null; // Mark for removal
            } else {
              return {
                ...msg,
                message: `📁 Loaded ${updated.length} PDF resource${updated.length !== 1 ? 's' : ''} from ${selectedSubject}`,
                resources: updated
              };
            }
          }
          return msg;
        }).filter(msg => msg !== null) || [],
      }));
      
      return updated;
    });
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
  className="w-100 mb-2"
  onClick={() => navigate("/suggestions")}
>
  Go to Suggestions
</Button>

        </>
        <>
          <Button className="w-100 mb-2" onClick={handleOpenNewTopicModal}>
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
                      setShowConfirmDelete(true);
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
          <div className="d-flex align-items-center gap-3">
            <h5
              className="mb-0"
              style={{
                color: "#3a7bd5",
                fontWeight: "700",
                fontSize: "1.5rem",
              }}
            >
              eduAI
            </h5>
            <Link to="/subjects" className="btn btn-outline-primary btn-sm">
              Subjects
            </Link>
          </div>
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
          {(chat || []).filter(msg => msg.sender !== "system").map((msg, i) => (
            <div
              key={i}
              className={`msg-row ${
                msg.sender === "user" ? "user-right" : "bot-left"
              } mb-3`}
            >
              <div
                className={`p-3 rounded ${
                  msg.sender === "user" ? "user-bubble" : "bot-bubble"
                }`}
                style={{
                  maxWidth: "90%",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word"
                }}
              >
                
                {/* Regular image handling */}
                {msg.image &&
                  (msg.image.toLowerCase().endsWith(".pdf") ? (
                    <div className="d-flex flex-column align-items-start mb-2">
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span style={{ fontSize: 20 }}>File</span>
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
                  <span style={{ fontSize: 32 }}>PDF</span>
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

            {/* Subject Selection Dropdown */}
            <Form.Select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              size="sm"
              style={{ maxWidth: "150px" }}
            >
              <option value="">Subject...</option>
              <option value="General">General</option>
              {subjects.map((subject) => (
                <option key={subject._id} value={subject.name}>
                  {subject.name}
                </option>
              ))}
            </Form.Select>

            {/* Resource context checkbox for students - inline with dropdown */}
            {user?.role === "student" &&
              selectedSubject &&
              selectedSubject !== "General" && (
                <div
                  className="d-flex align-items-center"
                  style={{ padding: "0 8px", whiteSpace: "nowrap" }}
                >
                  {loadingResources ? (
                    <div className="d-flex align-items-center">
                      <div className="spinner-border spinner-border-sm me-2" role="status" style={{ width: "12px", height: "12px" }}>
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      <span style={{ fontSize: "0.85rem", color: "#adb5bd" }}>
                        Loading PDFs...
                      </span>
                    </div>
                  ) : subjectResources.length > 0 ? (
                    <Form.Check
                      type="checkbox"
                      id="use-resources-checkbox"
                      checked={useResources}
                      onChange={(e) => setUseResources(e.target.checked)}
                      label={
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "#adb5bd",
                            fontWeight: "500",
                          }}
                        >
                          Use PDFs ({subjectResources.length})
                        </span>
                      }
                    />
                  ) : null}
                </div>
              )}

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

            {/* Voice to Text Button */}
            <Button
              variant={isRecording ? "danger" : "outline-secondary"}
              onClick={micDictate}
              disabled={loading}
              title={isRecording ? "Click to stop recording" : "Click to start recording"}
              className={isRecording ? "pulse-animation" : ""}
            >
              {isRecording ? "Stop" : "Mic"}
            </Button>

            <Button
              onClick={handleSend}
              disabled={!currentMessage.trim() && !imageFile}
            >
              Send
            </Button>
          </InputGroup>

          {/* Enhanced resource display below input */}
          {useResources && subjectResources && subjectResources.length > 0 && (
            <div className="enhanced-resources-display mt-3">
              <div className="text-muted fw-bold mb-2">
                Using {subjectResources.length} JSON resource{subjectResources.length !== 1 ? 's' : ''} from {selectedSubject}
              </div>
              <div className="row g-2">
                {subjectResources.map(resource => (
                  <div key={resource._id} className="col-md-6 col-lg-4">
                    <div className="enhanced-resource-card">
                      <div className="d-flex align-items-start justify-content-between">
                        <div className="flex-grow-1">
                          <div className="fw-bold text-truncate" title={resource.filename || resource.name}>
                            📄 {resource.filename || resource.name}
                          </div>
                          {resource.pageCount && (
                            <small className="text-muted">({resource.pageCount} pages)</small>
                          )}
                          {resource.wordCount && (
                            <small className="text-muted d-block">{resource.wordCount.toLocaleString()} words</small>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn-close-enhanced"
                          onClick={() => handleRemoveResource(resource._id)}
                          aria-label="Remove resource"
                          title="Remove resource"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Modal
        show={showNewTopicModal}
        onHide={() => {
          setNewTopicName("");
          setShowNewTopicModal(false);
        }}
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
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  addTopic();
                }
              }}
              placeholder="e.g. React Tips, Math Problems, Science Queries"
              autoFocus
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => {
              setNewTopicName("");
              setShowNewTopicModal(false);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={addTopic}
            disabled={!newTopicName.trim()}
          >
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
