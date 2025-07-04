import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const SubjectWiseChart = () => {
  const [data, setData] = useState([]);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((users) => {
        const subjectCounts = {};

        users.forEach((user) => {
          user.chats.forEach((chat) => {
            const subj = chat.subject;
            const count = (chat.history || []).length;
            subjectCounts[subj] = (subjectCounts[subj] || 0) + count;
          });
        });

        const total = Object.values(subjectCounts).reduce((a, b) => a + b, 0) || 1;
        const chartRows = Object.entries(subjectCounts)
          .map(([subject, count]) => ({
            subject,
            count,
            percent: (count / total) * 100,
          }))
          .sort((a, b) => b.count - a.count);

        setData(chartRows);
      })
      .catch(console.error);
  }, [token]);

  return (
    <div className="my-5">
      <h4 className="mb-3">Subject-wise Doubt Distribution</h4>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 50)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 40, left: 80, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            label={{
              value: "Number of Doubts",
              position: "insideBottom",
              dy: 10,
            }}
          />
          <YAxis
            type="category"
            dataKey="subject"
            width={120}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const { count, percent } = payload[0].payload;
              return (
                <div
                  style={{
                    background: "#111",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 4,
                    fontSize: 13,
                  }}
                >
                  <strong>{label}</strong>
                  <br />
                  Doubts: {count}
                  <br />
                  {percent.toFixed(1)}%
                </div>
              );
            }}
          />
          <Bar dataKey="count" fill="#4caefc" barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubjectWiseChart;
