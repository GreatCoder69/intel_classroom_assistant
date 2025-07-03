import React, { useEffect, useState } from "react";
import { Card, Button, Form, Row, Col, Pagination } from "react-bootstrap";

const ErrorLogs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const logsPerPage = 5;
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/error-logs`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => {
        const sorted = [...data].sort(
          (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
        );
        setLogs(sorted);
      })
      .catch((err) => console.error("Failed to fetch error logs:", err));
  }, [token]);

  const handleSearch = () => {
    if (!startDate && !endDate) return;

    const filtered = logs.filter((log) => {
      const ts = new Date(log.timestamp);
      return (
        (!startDate || ts >= new Date(startDate)) &&
        (!endDate || ts <= new Date(endDate))
      );
    });

    setFilteredLogs(filtered);
    setSearchTriggered(true);
    setCurrentPage(1);
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    setSearchTriggered(false);
    setFilteredLogs([]);
    setCurrentPage(1);
  };

  const formatStackTrace = (stack = "") =>
    stack
      .split("\n")
      .filter((line) => line.trim() !== "")
      .map((line, idx) => (
        <div key={idx} style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
          {line.trim()}
        </div>
      ));

  const formatErrorMessage = (message = "") => {
    try {
      const clean = message
        .split("For more information")[0]
        .split("]:")[1]
        ?.replace(/\\n/g, "\n")
        ?.replace(/\\t/g, "  ")
        ?.replace(/\\\"/g, '"')
        ?.trim();
      return clean || message;
    } catch {
      return message;
    }
  };

  const getPaginatedLogs = () => {
    const data = searchTriggered ? filteredLogs : logs;
    const start = (currentPage - 1) * logsPerPage;
    return data.slice(start, start + logsPerPage);
  };

  const totalPages = Math.ceil(
    (searchTriggered ? filteredLogs.length : logs.length) / logsPerPage
  );

  return (
    <div className="px-4 py-3">
      <h4 className="mb-3">Error Logs</h4>

      {/* 🔍 Search Filters */}
      <Row className="align-items-end mb-4">
        <Col md={3}>
          <Form.Label>Start Date</Form.Label>
          <Form.Control
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={endDate || undefined}
          />
        </Col>
        <Col md={3}>
          <Form.Label>End Date</Form.Label>
          <Form.Control
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </Col>
        <Col md="auto">
          <Button variant="primary" onClick={handleSearch} className="me-2">
            Search
          </Button>
          <Button variant="secondary" onClick={handleClear}>
            Clear Filters
          </Button>
        </Col>
      </Row>

      {/* 📋 Logs */}
      {(searchTriggered ? filteredLogs : getPaginatedLogs()).length === 0 ? (
        <p className="text-muted">No error logs found.</p>
      ) : (
        (searchTriggered ? filteredLogs : getPaginatedLogs()).map(
          (log, idx) => (
            <Card className="mb-4 shadow-sm" key={log._id || idx}>
              <Card.Body>
                <h6>
                  <strong>ID:</strong> {log._id}
                </h6>
                <h6>
                  <strong>Subject:</strong> {log.subject}
                </h6>

                <div className="mt-2">
                  <strong>Error Message:</strong>
                  <div
                    className="text-danger fw-semibold"
                    style={{ fontSize: "0.95rem", whiteSpace: "pre-wrap" }}
                  >
                    {formatErrorMessage(log.errorMessage)}
                  </div>
                </div>

                <div className="mt-3">
                  <strong>Stack Trace:</strong>
                  <div
                    className="bg-light border rounded p-2 mt-1 overflow-auto"
                    style={{ maxHeight: "200px" }}
                  >
                    {formatStackTrace(log.stack)}
                  </div>
                </div>

                <div className="text-muted mt-3">
                  <strong>Timestamp:</strong>{" "}
                  {new Date(log.timestamp).toLocaleString()}
                </div>
              </Card.Body>
            </Card>
          )
        )
      )}

      {/* 📌 Pagination */}
      {!searchTriggered && totalPages > 1 && (
        <Pagination className="mt-3">
          {[...Array(totalPages).keys()].map((n) => (
            <Pagination.Item
              key={n + 1}
              active={currentPage === n + 1}
              onClick={() => setCurrentPage(n + 1)}
            >
              {n + 1}
            </Pagination.Item>
          ))}
        </Pagination>
      )}
    </div>
  );
};

export default ErrorLogs;
