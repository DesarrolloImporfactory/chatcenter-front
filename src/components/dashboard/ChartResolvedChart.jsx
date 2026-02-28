import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import ChartShell from "./ChartShell";

export default function ChatsResolvedChart({ data }) {
  return (
    <ChartShell
      title="Chats resueltos"
      rightActions={
        <span className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50">
          Exportar
        </span>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 15, bottom: 10, left: -10 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.08)" />
          <XAxis
            dataKey="hour"
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
          <Area
            type="monotone"
            dataKey="resolved"
            fillOpacity={0.18}
            strokeOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
