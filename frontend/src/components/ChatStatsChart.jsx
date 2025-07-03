import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const months = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const getMonth = (dateStr) => {
  const monthIndex = new Date(dateStr).getMonth();
  return months[monthIndex] || "";
};

const ChatStatsChart = () => {
  const [chartData, setChartData] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((data) => {
        // Initialize monthly count structure
        const monthlyStats = {};
        months.forEach((m) => {
          monthlyStats[m] = {
            month: m,
            noFile: 0,
            withImage: 0,
            withPDF: 0,
          };
        });

        // Process chats
        data.forEach((user) => {
          user.chats.forEach((chat) => {
            chat.history.forEach((msg) => {
              const month = getMonth(msg.timestamp);
              if (!month) return;

              const url = msg.imageUrl;

              if (!url) {
                monthlyStats[month].noFile++;
              } else if (url.endsWith(".jpg") || url.endsWith(".png")) {
                monthlyStats[month].withImage++;
              } else if (url.endsWith(".pdf")) {
                monthlyStats[month].withPDF++;
              }
            });
          });
        });

        // Set the result for Recharts
        const final = months.map((m) => monthlyStats[m]);
        setChartData(final);
      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="my-5">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={chartData}
          barSize={5}
          margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="noFile" fill="#a64bf4" name="No File" />
          <Bar dataKey="withImage" fill="#ff7aa8" name="Image" />
          <Bar dataKey="withPDF" fill="#4caefc" name="PDF" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChatStatsChart;
