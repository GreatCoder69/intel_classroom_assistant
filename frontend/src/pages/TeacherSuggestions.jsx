import React, { useEffect, useState } from "react";

import {
  Button,
  Form,
  Card,
  Spinner,
  Dropdown,
  Row,
  Col,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const api = import.meta.env.VITE_API_URL;

/* helper – convert a normal YT URL to embed */
const toEmbed = (u) => {
  try {
    const id = new URL(u).searchParams.get("v");
    return `https://www.youtube.com/embed/${id}`;
  } catch {
    return "";
  }
};

export default function SuggestionsPage() {
  /* state */
  const nav        = useNavigate();
  const [groups,   setGroups]   = useState([]);   // suggestions grouped by subject
  const [subjects, setSubjects] = useState([]);   // dropdown
  const [showForm, setShowForm] = useState(false);

  const [selSubject, setSelSubject] = useState("");
  const [topic,      setTopic]      = useState("");
  
  const [active,  setActive]  = useState(null);   // {subject, suggestion}
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  /* ── fetch subjects & suggestions on mount ── */
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Authentication required. Please log in.");
          return;
        }

        // ① subjects from subjects API (independent of Python server)
        const subjectsRes = await fetch(`${api}/api/subjects`, {
          headers: { 
            "Content-Type": "application/json",
            "x-access-token": token 
          },
        });

        if (!subjectsRes.ok) {
          throw new Error(`Failed to fetch subjects: ${subjectsRes.status} ${subjectsRes.statusText}`);
        }

        const subjectsData = await subjectsRes.json();
        const subjectNames = subjectsData.map((s) => s.name);

        // ② existing suggestions (grouped)
        const sugRes = await fetch(`${api}/api/suggestions`, {
          headers: { "x-access-token": token },
        });
        const sugGroups = await sugRes.json();           // [{subject,suggestions:[…]}]
        setGroups(sugGroups);

        const sugSubjects = sugGroups.map((g) => g.subject);

        // merge & dedupe
        const combined = Array.from(new Set([...subjectNames, ...sugSubjects]));
        setSubjects(combined);
      } catch (e) {
        console.error("init fetch error:", e);
        setError("Failed to load subjects. Please try again.");
      }
    };
    fetchAll();
  }, []);

  /* ── POST new suggestion ── */
  const handleSearch = async () => {
    if (!selSubject || !topic.trim()) {
      setError("Select a subject and enter a topic");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const res = await fetch(`${api}/api/suggestions`, {
        method : "POST",
        headers: {
          "Content-Type": "application/json",
          "x-access-token": token,
        },
        body: JSON.stringify({ subject: selSubject, topic }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "request failed");

      /* merge into state */
      setGroups((prev) => {
        const copy = structuredClone(prev);
        const idx  = copy.findIndex((g) => g.subject === data.subject);
        if (idx === -1) {
          copy.unshift({ subject: data.subject, suggestions: [data] });
        } else {
          copy[idx].suggestions.unshift(data);
        }
        return copy;
      });
      if (!subjects.includes(data.subject))
        setSubjects((p) => [...p, data.subject]);

      setActive({ subject: data.subject, suggestion: data });
      setTopic("");
      setShowForm(false);
    } catch (e) {
      console.error("Search error:", e);
      setError(e.message || "Lookup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* fixed width for sidebar */
  const SIDEBAR = 300;

  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>
      {/* ────────── Sidebar ────────── */}
      <aside
        className="bg-dark text-light p-3 border-end"
        style={{ width: SIDEBAR, flexShrink: 0 }}
      >
        <Button
          variant="danger"
          className="w-100 mb-3"
          onClick={() => nav("/dashboard")}
        >
          ← Back to Dashboard
        </Button>

        <Button
          variant="primary"
          className="w-100 mb-4"
          onClick={() => setShowForm((o) => !o)}
        >
          {showForm ? "Close" : "Add Topic"}
        </Button>

        <div style={{ maxHeight: "75vh", overflowY: "auto" }}>
          {groups.map((g) => (
            <div key={g.subject} className="mb-3">
              <small className="text-uppercase text-secondary">
                {g.subject}
              </small>
              {g.suggestions.map((s) => (
                <div
                  key={s._id}
                  role="button"
                  onClick={() => setActive({ subject: g.subject, suggestion: s })}
                  className={`topic-item bg-light ${
                    active?.suggestion?._id === s._id ? "bg-primary" : ""
                  }`}
                >
                  {s.topic}
                </div>
              ))}
            </div>
          ))}
        </div>
      </aside>

      {/* ────────── Main pane ────────── */}
      <main
        className="flex-grow-1 p-4"
        style={{ background: "#000", color: "#fff" }}
      >
        {/* form */}
        {showForm && (
          <Card className="chat-card p-4 mb-4">
            <h5 className="mb-3">New Topic</h5>

            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Group>
                  <Form.Label>Subject</Form.Label>
                  <Dropdown onSelect={(v) => setSelSubject(v)}>
                    <Dropdown.Toggle
                      variant="outline-secondary"
                      className="w-100"
                    >
                      {selSubject || "Select subject"}
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={{ maxHeight: 300, overflowY: "auto" }}>
                      {subjects.map((s) => (
                        <Dropdown.Item key={s} eventKey={s}>
                          {s}
                        </Dropdown.Item>
                      ))}
                    </Dropdown.Menu>
                  </Dropdown>
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group>
                  <Form.Label>Topic</Form.Label>
                  <Form.Control
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Enter topic..."
                  />
                </Form.Group>
              </Col>

              <Col md={2}>
                <Button
                  variant="success"
                  className="w-100"
                  onClick={handleSearch}
                  disabled={loading}
                >
                  {loading ? <Spinner size="sm" /> : "Search"}
                </Button>
              </Col>
            </Row>
            {error && <div className="text-danger mt-3">{error}</div>}
          </Card>
        )}

        {/* results */}
        {active ? (
          <>
            <h4 className="mb-3">
              {active.subject} / {active.suggestion.topic}
            </h4>

            {/* Show info if placeholder results */}
            {active.suggestion.videos.length === 1 && active.suggestion.videos[0].title.includes('Learn about') && (
              <div className="alert alert-info mb-3">
                <i className="fas fa-info-circle me-2"></i>
                Advanced search features are not fully configured. Basic search links are provided below.
              </div>
            )}

            {/* resources */}
            <Row xs={1} md={2} lg={3} className="g-3 mb-4">
              {active.suggestion.articles.map((a) => (
                <Col key={a._id}>
                  <Card className="chat-card h-100 p-3">
                    <Card.Title style={{ fontSize: 15 }}>{a.title}</Card.Title>
                    <Card.Text style={{ fontSize: 13 }}>{a.snippet}</Card.Text>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open
                    </Button>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* videos */}
            <Row xs={1} md={2} lg={3} className="g-4">
              {active.suggestion.videos.map((v) => (
                <Col key={v._id}>
                  <div className="ratio ratio-16x9 mb-2">
                    <iframe
                      src={toEmbed(v.url)}
                      title={v.title}
                      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                  <div style={{ fontSize: 14 }}>{v.title}</div>
                </Col>
              ))}
            </Row>
          </>
        ) : (
          !showForm && (
            <p className="text-secondary">
              Select a topic on the left or click <strong>Add Topic</strong>.
            </p>
          )
        )}
      </main>
    </div>
  );
}
