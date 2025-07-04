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

// CSS to disable hover effects on chart bars
const chartStyles = `
  .recharts-bar-rectangle:hover {
    filter: none !important;
    opacity: 1 !important;
    box-shadow: none !important;
  }
  
  .recharts-bar-rectangle {
    cursor: default !important;
  }
  
  .recharts-responsive-container svg {
    cursor: default !important;
  }
`;

// Inject styles once
if (typeof document !== 'undefined' && !document.getElementById('chart-no-hover-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'chart-no-hover-styles';
  styleElement.textContent = chartStyles;
  document.head.appendChild(styleElement);
}

const SubjectWiseChart = ({ userRole = 'student' }) => {
  const [data, setData] = useState([]);
  const token = localStorage.getItem("token");

  /* ──────────────────────────────────────── */
  useEffect(() => {
    console.log("Fetching subject statistics for role:", userRole);
    fetch(`${import.meta.env.VITE_API_URL}/api/subject-statistics`, {
      headers: { "x-access-token": token },
    })
      .then((res) => {
        console.log("API Response status:", res.status);
        return res.json();
      })
      .then((stats) => {
        console.log("Raw stats from API:", stats);
        // Calculate total for percentage calculation
        const total = stats.reduce((sum, item) => sum + item.count, 0) || 1;
        
        // Add percentage to each item
        const dataWithPercent = stats.map(item => ({
          ...item,
          percent: (item.count / total) * 100
        }));

        console.log("Processed stats data:", dataWithPercent);
        setData(dataWithPercent);
      })
      .catch((error) => {
        console.error("Error fetching subject statistics:", error);
      });
  }, [token, userRole]);

  /* ──────────────────────────────────────── */
  return (
    <div className="my-5">
      <h3 className="text-center mb-4" style={{ color: "#fff" }}>
        📊 {userRole === 'teacher' ? 'Student Questions by Subject' : 'Your Questions by Subject'}
      </h3>
      <p className="text-center mb-4" style={{ color: "#ccc" }}>
        {userRole === 'teacher' 
          ? 'Aggregated statistics from all student questions across subjects'
          : 'Number of questions you have asked by subject context'
        }
      </p>
      {data.length === 0 ? (
        <div className="text-center py-5">
          <p className="text-muted">
            {userRole === 'teacher' 
              ? 'No student questions found yet. Students need to start asking questions to see statistics here.'
              : 'No questions asked yet. Start a chat to see your statistics here!'
            }
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
                  Questions: {count}
                  <br />
                  {percent.toFixed(1)}% of total
                </div>
              );
            }}
          />

          <Bar 
            dataKey="count" 
            barSize={18}
            style={{ cursor: "default" }}
          >
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
};

export default SubjectWiseChart;
