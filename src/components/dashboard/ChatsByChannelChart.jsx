import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import ChartShell from "./ChartShell";

export default function ChatsByChannelChart({ data }) {
  return (
    <ChartShell title="Chats por canal">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 15, bottom: 10, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
          <XAxis
            dataKey="name"
            stroke="rgba(15,23,42,0.55)"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="rgba(15,23,42,0.55)"
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid rgba(15,23,42,0.12)",
              color: "#0f172a",
            }}
          />
          <Bar dataKey="value" radius={[10, 10, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
