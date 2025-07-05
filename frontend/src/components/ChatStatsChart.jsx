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
  "#4caefc", // blue
  "#ff7aa8", // pink
  "#a64bf4", // purple
  "#ffe066", // yellow
  "#6fffa9", // mint
  "#ff8b3d", // orange
  "#44d7f7", // cyan
  "#ff5c5c", // red
];

/* ── CSS: disable bar‑hover ‘glow’ ── */
const chartStyles = `
  .recharts-bar-rectangle:hover {
    filter: none !important;
    opacity: 1 !important;
    box-shadow: none !important;
  }
  .recharts-bar-rectangle { cursor: default !important; }
  .recharts-responsive-container svg { cursor: default !important; }
`;
if (typeof document !== "undefined" && !document.getElementById("chart-no-hover")) {
  const s = document.createElement("style");
  s.id = "chart-no-hover";
  s.textContent = chartStyles;
  document.head.appendChild(s);
}

const api   = import.meta.env.VITE_API_URL;
const token = localStorage.getItem("token");

export default function SubjectWiseChart({ userRole = "student" }) {
  const [data, setData] = useState([]);

  /* ───────────────────────────────────── */
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`${api}/api/admin/users-chats`, {
          headers: { "x-access-token": token },
        });
        const users = await res.json();                // [{ name,email,chats:[{subject,history}]}]

        /* --------- aggregate counts --------- */
        const currentEmail =
          userRole === "student"
            ? JSON.parse(localStorage.getItem("user") || "{}").email
            : null;

        const totals = {}; // { subject: count }

        users.forEach((u) => {
          if (userRole === "student" && u.email !== currentEmail) return; // skip others

          u.chats.forEach((c) => {
            const n = (c.history || []).length;
            if (n) totals[c.subject] = (totals[c.subject] || 0) + n;
          });
        });

        /* transform → array & add percentages */
        const grand = Object.values(totals).reduce((a, b) => a + b, 0) || 1;
        const rows = Object.entries(totals)
          .map(([subject, count]) => ({
            subject,
            count,
            percent: (count / grand) * 100,
          }))
          .sort((a, b) => b.count - a.count);

        setData(rows);
      } catch (err) {
        console.error("Error fetching subject stats:", err);
      }
    };

    fetchStats();
  }, [userRole]);

  /* ───────────────────────────────────── */
  return (
    <div className="my-5">
      <h3 className="text-center mb-4" style={{ color: "#fff" }}>
        📊{" "}
        {userRole === "teacher"
          ? "Student Questions by Subject"
          : "Your Questions by Subject"}
      </h3>
      <p className="text-center mb-4" style={{ color: "#ccc" }}>
        {userRole === "teacher"
          ? "Aggregated statistics from all student questions across subjects"
          : "Number of questions you have asked by subject context"}
      </p>

      {data.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">
            {userRole === "teacher"
              ? "No student questions found yet."
              : "No questions asked yet. Start a chat to see your statistics here!"}
          </p>
        </div>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={Math.max(300, data.length * 50)}
        >
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 50, left: 90, bottom: 20 }}
          >
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
                    Questions: {count}
                    <br />
                    {percent.toFixed(1)}% of total
                  </div>
                );
              }}
            />

            <Bar dataKey="count" barSize={18} style={{ cursor: "default" }}>
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  style={{ cursor: "default" }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
