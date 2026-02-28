// ResolutionChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import ChartShell from "./ChartShell";
import { formatDuration } from "../../utils/parseEventDef";

export default function ResolutionChart({ data }) {
  return (
    <ChartShell title="Tiempo promedio de resolución">
      {!data || data.length === 0 ? (
        <div className="flex h-full items-center justify-center text-sm text-slate-500">
          Sin datos para este rango
        </div>
      ) : (
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
              yAxisId="left"
              stroke="rgba(15,23,42,0.55)"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v ? formatDuration(v) : "0s")}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="rgba(15,23,42,0.30)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "avgSeconds")
                  return [formatDuration(value), "Tiempo promedio"];
                if (name === "chats") return [value, "Chats"];
                return [value, name];
              }}
              contentStyle={{
                background: "#ffffff",
                border: "1px solid rgba(15,23,42,0.12)",
                color: "#0f172a",
              }}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="chats"
              fillOpacity={0.18}
              strokeOpacity={0.3}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="avgSeconds"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </ChartShell>
  );
}
