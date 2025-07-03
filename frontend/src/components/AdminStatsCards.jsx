import React, { useEffect, useState } from "react";
import { Row, Col, Card } from "react-bootstrap";
import { BsGraphUp, BsBookmark, BsGem, BsPeople } from "react-icons/bs";

const StatCard = ({ title, value, subtitle, icon: Icon, bg }) => (
  <Card
    className="text-white mb-4"
    style={{
      background: `linear-gradient(to right, ${bg[0]}, ${bg[1]})`,
      border: "none",
    }}
  >
    <Card.Body>
      <div className="d-flex justify-content-between align-items-start">
        <div>
          <div className="mb-2" style={{ fontSize: "1rem" }}>
            {title}
          </div>
          <h3 style={{ fontWeight: 600 }}>{value.toLocaleString()}</h3>
          <div style={{ fontSize: "0.9rem" }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: "1.8rem" }}>
          <Icon />
        </div>
      </div>
    </Card.Body>
  </Card>
);

const AdminStatsCards = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [noFileChats, setNoFileChats] = useState(0);
  const [imageChats, setImageChats] = useState(0);
  const [pdfChats, setPdfChats] = useState(0);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter((user) => user.chats?.length > 0);
        setTotalUsers(filtered.length);

        let noFile = 0,
          images = 0,
          pdfs = 0;

        filtered.forEach((user) => {
          user.chats.forEach((chat) => {
            chat.history.forEach((msg) => {
              const url = msg.imageUrl;
              if (!url) {
                noFile++;
              } else if (url.endsWith(".jpg") || url.endsWith(".png")) {
                images++;
              } else if (url.endsWith(".pdf")) {
                pdfs++;
              }
            });
          });
        });

        setNoFileChats(noFile);
        setImageChats(images);
        setPdfChats(pdfs);
      })
      .catch(console.error);
  }, [token]);

  return (
    <Row className="my-4">
      <Col md={3}>
        <StatCard
          title="Total Users"
          value={totalUsers}
          subtitle="Unique users with chats"
          icon={BsPeople}
          bg={["#f093fb", "#f5576c"]}
        />
      </Col>
      <Col md={3}>
        <StatCard
          title="Chats without Files"
          value={noFileChats}
          subtitle="Messages with no attachments"
          icon={BsBookmark}
          bg={["#5ee7df", "#b490ca"]}
        />
      </Col>
      <Col md={3}>
        <StatCard
          title="Chats with Images"
          value={imageChats}
          subtitle=".jpg and .png attachments"
          icon={BsGraphUp}
          bg={["#43e97b", "#38f9d7"]}
        />
      </Col>
      <Col md={3}>
        <StatCard
          title="Chats with PDFs"
          value={pdfChats}
          subtitle=".pdf document messages"
          icon={BsGem}
          bg={["#30cfd0", "#330867"]}
        />
      </Col>
    </Row>
  );
};

export default AdminStatsCards;
