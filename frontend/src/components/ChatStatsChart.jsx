import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

/* ── colour palette (loops automatically) ── */
const COLORS = [
  "#4caefc",  // blue
  "#ff7aa8",  // pink
  "#a64bf4",  // purple
  "#ffe066",  // yellow
  "#6fffa9",  // mint
  "#ff8b3d",  // orange
  "#44d7f7",  // cyan
  "#ff5c5c",  // red
];

const SubjectWiseChart = () => {
  const [data, setData] = useState([]);
  const token = localStorage.getItem("token");

  /* ──────────────────────────────────────── */
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/admin/users-chats`, {
      headers: { "x-access-token": token },
    })
      .then((res) => res.json())
      .then((users) => {
        const totals = {};
        users.forEach((u) =>
          u.chats.forEach((c) => {
            const n = (c.history || []).length;
            totals[c.subject] = (totals[c.subject] || 0) + n;
          })
        );

        const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
        const rows = Object.entries(totals)
          .map(([subject, count]) => ({
            subject,
            count,
            percent: (count / grand) * 100,
          }))
          .sort((a, b) => b.count - a.count);

        setData(rows);
      })
      .catch(console.error);
  }, [token]);

  /* ──────────────────────────────────────── */
  return (
    <div className="my-5">
      <ResponsiveContainer
        width="100%"
        height={Math.max(300, data.length * 50)}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 50, left: 90, bottom: 20 }}
        >
          {/* grid & axes in light grey for dark mode */}
          <CartesianGrid stroke="#444" strokeDasharray="3 3" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fill: "#ddd" }}
            axisLine={{ stroke: "#666" }}
            tickLine={false}
            label={{
              value: "Number of Doubts",
              position: "insideBottom",
              dy: 10,
              fill: "#ccc",
            }}
          />
          <YAxis
            type="category"
            dataKey="subject"
            tick={{ fill: "#ddd" }}
            axisLine={false}
            tickLine={false}
            width={140}
          />

          {/* custom dark tooltip */}
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const { count, percent } = payload[0].payload;
              return (
                <div
                  style={{
                    background: "#222",
                    color: "#fff",
                    padding: "6px 10px",
                    borderRadius: 4,
                    fontSize: 13,
                    border: "1px solid #555",
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

          <Bar dataKey="count" barSize={18}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SubjectWiseChart;
