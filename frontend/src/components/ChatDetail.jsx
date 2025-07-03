import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button, Form, Modal, Card } from "react-bootstrap";
import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";
import ReactMarkdown from "react-markdown";

export default function ChatDetailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, subject, phrase, username, password, avgRating, profileimg } =
    location.state || {};

  const currentUserEmail = localStorage.getItem("userEmail");

  const [chat, setChat] = useState([]);
  const [ratings, setRatings] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [currentCommentPage, setCurrentCommentPage] = useState(1);
  const [currentChatPage, setCurrentChatPage] = useState(1);

  // Fixed highlightPhrase function
  const highlightPhrase = (text, phrase) => {
    if (!text || !phrase) return text;

    // Escape regex special characters
    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedPhrase})`, "gi");

    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} style={{ backgroundColor: "#ff0", padding: "0 2px" }}>
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const CHATS_PER_PAGE = 5;
  const COMMENTS_PER_PAGE = 5;

  const [alreadyRated, setAlreadyRated] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!email || !subject) return;

    fetch(`${import.meta.env.VITE_API_URL}/api/general-chat`)
      .then((res) => res.json())
      .then((data) => {
        const user = data.find((u) => u.email === email);
        const found = user?.chats.find((c) => c.subject === subject);
        setChat(found?.history || []);
      });

    fetch(`${import.meta.env.VITE_API_URL}/api/ratings?subject=${subject}&email=${email}`)
      .then((res) => res.json())
      .then((data) => {
        setRatings(data);
        const hasRated = data?.comments?.some(
          (c) => c.email === currentUserEmail
        );
        setAlreadyRated(hasRated);
      })
      .catch(() => {
        setRatings(null);
        setAlreadyRated(false);
      });
  }, [email, subject, currentUserEmail]);

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (rating >= i) stars.push(<FaStar key={i} color="orange" />);
      else if (rating >= i - 0.5)
        stars.push(<FaStarHalfAlt key={i} color="orange" />);
      else stars.push(<FaRegStar key={i} color="orange" />);
    }
    return <div className="d-flex gap-1">{stars}</div>;
  };
  const filteredChats = phrase
    ? chat.filter(
        (msg) =>
          msg.question?.toLowerCase().includes(phrase.toLowerCase()) ||
          msg.answer?.toLowerCase().includes(phrase.toLowerCase())
      )
    : chat;

  const renderChatPagination = () => {
    const totalPages = Math.ceil(chat.length / CHATS_PER_PAGE);
    if (totalPages <= 1) return null;

    const pages = [];

    const maxVisible = 5;
    let start = Math.max(1, currentChatPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }

    if (currentChatPage > 1) {
      pages.push(
        <Button
          key="first"
          variant="light"
          size="sm"
          onClick={() => setCurrentChatPage(1)}
        >
          ⏮
        </Button>
      );
      pages.push(
        <Button
          key="prev"
          variant="light"
          size="sm"
          onClick={() => setCurrentChatPage((p) => p - 1)}
        >
          ‹
        </Button>
      );
    }

    for (let i = start; i <= end; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentChatPage ? "primary" : "outline-secondary"}
          size="sm"
          onClick={() => setCurrentChatPage(i)}
          className="mx-1"
        >
          {i}
        </Button>
      );
    }

    if (currentChatPage < totalPages) {
      pages.push(
        <Button
          key="next"
          variant="light"
          size="sm"
          onClick={() => setCurrentChatPage((p) => p + 1)}
        >
          ›
        </Button>
      );
      pages.push(
        <Button
          key="last"
          variant="light"
          size="sm"
          onClick={() => setCurrentChatPage(totalPages)}
        >
          ⏭
        </Button>
      );
    }

    return (
      <div className="d-flex justify-content-center align-items-center mt-3 flex-wrap">
        {pages}
      </div>
    );
  };

  const handleRatingSubmit = async () => {
    if (alreadyRated) {
      alert("You have already rated this chat.");
      return;
    }

    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/rate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-access-token": localStorage.getItem("token"),
      },
      body: JSON.stringify({
        subject,
        email,
        rating: newRating,
        comment: newComment,
      }),
    });

    if (res.status === 409) {
      alert("You have already reviewed this chat!");
      setShowRatingModal(false);
      return;
    }

    if (res.ok) {
      setNewRating(0);
      setNewComment("");
      setShowRatingModal(false);
      const updated = await res.json();
      fetch(
        `${import.meta.env.VITE_API_URL}/api/ratings?subject=${subject}&email=${email}`
      )
        .then((res) => res.json())
        .then((data) => {
          setRatings(data);
          const hasRated = data?.comments?.some(
            (c) => c.email === currentUserEmail
          );
          setAlreadyRated(hasRated);
        });
    }
  };

  return (
    <div className="container-fluid py-4 position-relative">
      {/* Back & Toggle Comments */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button
          variant="outline-dark"
          onClick={() =>
            navigate("/general-chat", { state: { email: currentUserEmail } })
          }
        >
          ← Back to General Chat
        </Button>
        <Button
          variant="outline-secondary"
          onClick={() => setShowComments(!showComments)}
        >
          {showComments ? "Hide Comments" : "Show Comments"}
        </Button>
      </div>

      <div className="d-flex flex-column align-items-start justify-content-center mb-4 ps-4">
        <h2 className="mb-4">{subject}</h2>
        <img
          src={
            profileimg ||
            "https://www.shutterstock.com/image-vector/vector-flat-illustration-grayscale-avatar-600nw-2281862025.jpg"
          }
          alt="Profile"
          className="rounded-circle mb-2"
          style={{ width: 60, height: 60, objectFit: "cover" }}
        />
        <h5 className="mb-1">
          {username || "Unknown User"}
          {email === currentUserEmail && (
            <span className="badge bg-success ms-2">You</span>
          )}
        </h5>
        <div className="mb-1">{renderStars(avgRating || 0)}</div>
        <div className="text-muted small">{email}</div>
      </div>

      <div className="row">
        {/* Main Chat Area */}
        <div className={showComments ? "col-md-8" : "col-12"}>
          <div style={{ overflowY: "auto" }} className="mb-4 px-2">
            {filteredChats
              .slice(
                (currentChatPage - 1) * CHATS_PER_PAGE,
                currentChatPage * CHATS_PER_PAGE
              )
              .map((msg, idx) => {
                const globalIndex =
                  (currentChatPage - 1) * CHATS_PER_PAGE + idx;
                return (
                  <Card key={globalIndex} className="mb-3">
                    <Card.Body>
                      <Card.Text>
                        <strong>Q:</strong>{" "}
                        {highlightPhrase(msg.question, phrase)}
                      </Card.Text>
                      <Card.Text>
                        <strong>A:</strong>{" "}
                        <ReactMarkdown>{highlightPhrase(msg.answer, phrase)}</ReactMarkdown>
                      </Card.Text>

                      <small className="text-muted">
                        {new Date(msg.timestamp).toLocaleString()}
                      </small>
                    </Card.Body>
                  </Card>
                );
              })}

            <div ref={bottomRef}></div>
            {!phrase && renderChatPagination()}
          </div>
        </div>

        {/* Sidebar: Comments & Ratings */}
        {showComments && (
          <div className="col-md-4">
            <div className="bg-light border rounded p-3 h-100">
              <h5 className="mb-3">Comments & Ratings</h5>

              {ratings?.comments?.length > 0 ? (
                <>
                  {ratings.comments
                    .slice(
                      (currentCommentPage - 1) * COMMENTS_PER_PAGE,
                      currentCommentPage * COMMENTS_PER_PAGE
                    )
                    .map((c, idx) => (
                      <Card key={idx} className="mb-3 shadow-sm">
                        <Card.Body className="d-flex gap-3 align-items-start">
                          <img
                            src={c.profileimg}
                            alt="profile"
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: "50%",
                            }}
                          />
                          <div>
                            <strong>{c.name}</strong>
                            <div className="mb-1">{renderStars(c.rating)}</div>
                            <div>{c.comment}</div>
                            <small className="text-muted">
                              {new Date(c.timestamp).toLocaleString()}
                            </small>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}

                  {/* Pagination controls */}
                  {ratings.comments.length > COMMENTS_PER_PAGE && (
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={currentCommentPage === 1}
                        onClick={() => setCurrentCommentPage((p) => p - 1)}
                      >
                        ← Prev
                      </Button>
                      <span>
                        Page {currentCommentPage} of{" "}
                        {Math.ceil(ratings.comments.length / COMMENTS_PER_PAGE)}
                      </span>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        disabled={
                          currentCommentPage >=
                          Math.ceil(ratings.comments.length / COMMENTS_PER_PAGE)
                        }
                        onClick={() => setCurrentCommentPage((p) => p + 1)}
                      >
                        Next →
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-muted">No ratings or comments yet.</div>
              )}

              <div className="d-flex justify-content-end mt-3">
                <Button
                  variant="primary"
                  onClick={() => setShowRatingModal(true)}
                >
                  Add Rating
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      <Modal
        show={showRatingModal}
        onHide={() => setShowRatingModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Rate This Chat</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Rating</Form.Label>
            <div className="d-flex gap-2 fs-4">
              {[1, 2, 3, 4, 5].map((val) => (
                <span
                  key={val}
                  onClick={() => setNewRating(val)}
                  style={{ cursor: "pointer" }}
                >
                  {newRating >= val ? (
                    <FaStar color="orange" />
                  ) : (
                    <FaRegStar color="orange" />
                  )}
                </span>
              ))}
            </div>
          </Form.Group>
          <Form.Group>
            <Form.Label>Comment (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRatingModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleRatingSubmit}>
            Submit
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
